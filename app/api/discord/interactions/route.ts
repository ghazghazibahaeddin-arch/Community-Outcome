// Community OS — Official Discord Interactions Endpoint with Cryptographic Verification
import { NextRequest, NextResponse } from 'next/server';
import {
  dbOperations,
  ensureDatabaseHydrated,
  getCommunityHubSlug,
  getDatabase,
  persistDatabaseNow
} from '@/lib/db/store';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { validateEvidenceUrl } from '@/lib/services/validation';
import { getRuntimeEnv } from '@/lib/env';

import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.trim();
  const length = clean.length;
  const bytes = new Uint8Array(length / 2);
  for (let i = 0; i < length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function shortLabel(val: string, maxLen = 40): string {
  const s = String(val || '').trim();
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 1)}…`;
}

/**
 * Verify Discord Ed25519 request signature and replay timestamp window (<= 300 seconds)
 */
async function verifyDiscordSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string
): Promise<boolean> {
  if (!signature || !timestamp || !publicKeyHex) return false;
  try {
    // Timestamp replay window validation (+/- 300s)
    const tsNum = Number(timestamp);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 300) {
      return false;
    }

    const cleanKeyHex = publicKeyHex.trim();
    const cleanSigHex = signature.trim();

    if (cleanKeyHex.length !== 64 || cleanSigHex.length !== 128) {
      return false;
    }

    try {
      const ok = await verifyKey(rawBody, cleanSigHex, timestamp, cleanKeyHex);
      if (ok) return true;
    } catch {
      // Fall through to native Web Crypto
    }

    if (typeof globalThis.crypto?.subtle?.importKey === 'function') {
      try {
        const keyBytes = hexToUint8Array(cleanKeyHex);
        const sigBytes = hexToUint8Array(cleanSigHex);
        const msgBytes = new TextEncoder().encode(timestamp + rawBody);

        const key = await globalThis.crypto.subtle.importKey(
          'raw',
          keyBytes as any,
          { name: 'Ed25519' },
          false,
          ['verify']
        );
        return await globalThis.crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes as any, msgBytes as any);
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}

const KNOWN_DISCORD_PUBLIC_KEY = 'b8eac088933e82f4025ac3063b4a35c1a5c53533225117b27e4910870f226482';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const publicKey = (env.DISCORD_PUBLIC_KEY || process.env.DISCORD_PUBLIC_KEY || KNOWN_DISCORD_PUBLIC_KEY)?.trim();

    if (!publicKey) {
      console.error('[Discord Interactions] DISCORD_PUBLIC_KEY is not configured in runtime environment.');
      return new NextResponse('DISCORD_PUBLIC_KEY not configured', { status: 401 });
    }

    if (!signature || !timestamp) {
      return new NextResponse('Invalid request signature', { status: 401 });
    }

    const isValid = await verifyDiscordSignature(rawBody, signature, timestamp, publicKey);
    if (!isValid) {
      return new NextResponse('Invalid request signature', { status: 401 });
    }

    let interaction: any;
    try {
      interaction = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // 1. PING verification
    if (interaction.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    await ensureDatabaseHydrated(env);
    const db = getDatabase();

    // Replay / retry deduplication
    if (interaction.id && !dbOperations.recordWebhookInteractionId(`dc_${interaction.id}`)) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Duplicate interaction ignored.', flags: 64 }
      });
    }

    const guildId = interaction.guild_id || interaction.guild?.id || '';
    const discordUser = interaction.member?.user || interaction.user || {};
    const discordUserId = discordUser.id || '';
    const discordUsername =
      discordUser.username && discordUser.discriminator && discordUser.discriminator !== '0'
        ? `${discordUser.username}#${discordUser.discriminator}`
        : discordUser.username || 'discord_user';

    const appUrl = getVerifiedAppUrl(env);

    // Resolve community by guild ID
    const matchedByGuild = guildId
      ? db.communities.find(
          (c) =>
            c.discordConfig?.serverId === guildId ||
            c.connectedDiscordServers?.some((s) => s.serverId === guildId)
        )
      : undefined;

    if (guildId && !matchedByGuild && env.NODE_ENV === 'production') {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            `⚠️ **Discord Server Not Linked**\n` +
            `Guild ID \`${guildId}\` is not connected to a Community OS workspace yet.\n` +
            `An administrator can connect it in **Owner Workspace → Discord Server Hub** (${appUrl}).`,
          flags: 64
        }
      });
    }

    const community =
      matchedByGuild || db.communities.find((c) => c.id === 'comm_devforge') || db.communities[0];

    const linkedUser = db.users.find((u) => u.identities?.discordId === discordUserId);
    const isSuspended = Boolean(
      linkedUser &&
        db.memberships?.some(
          (m) => m.communityId === community.id && m.userId === linkedUser.id && m.moderationStatus === 'suspended'
        )
    );

    const hubSlug = getCommunityHubSlug(community, db.links);
    const hubUrl = `${appUrl}/l/${hubSlug}`;
    const reqHelpSlug =
      db.links.find((l) => l.communityId === community.id && l.linkType === 'link_9_help_request' && !l.isRevoked)
        ?.slug || hubSlug;
    const contribPortalSlug =
      db.links.find(
        (l) =>
          l.communityId === community.id &&
          (l.linkType === 'link_14_evidence' || l.linkType === 'link_1_ranking') &&
          !l.isRevoked
      )?.slug || hubSlug;

    const buildMenuComponents = () => [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: '🚀 Open Hub', url: hubUrl },
          { type: 2, style: 1, label: '🆘 Requests', custom_id: 'btn_requests' },
          { type: 2, style: 2, label: '📋 Tasks', custom_id: 'btn_tasks' },
          { type: 2, style: 2, label: '🎯 My Tasks', custom_id: 'btn_mytasks' },
          { type: 2, style: 2, label: '🎖️ Passport', custom_id: 'btn_passport' }
        ]
      }
    ];

    // 2. Application Slash Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = (interaction.data?.name || '').toLowerCase();

      if (commandName === 'help') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Community OS — Discord Command Center**\n` +
              `Operating on **${community.name}**\n\n` +
              `• \`/hub\` — Open Community Action Hub\n` +
              `• \`/requests\` — Browse open NeedSignal requests\n` +
              `• \`/help-request [title] [priority]\` — Post a structured request\n` +
              `• \`/tasks\` — List & claim active QuestLoop tasks\n` +
              `• \`/mytasks\` — Manage & deliver your assigned tasks\n` +
              `• \`/passport\` — View your portable verified skills\n` +
              `• \`/contribution [task_id] [evidence_url] [notes]\` — Submit completion proof\n` +
              `• \`/connect [code]\` — Link your Discord profile\n` +
              `• \`/status\` — Gateway & DB status`,
            components: buildMenuComponents()
          }
        });
      }

      if (commandName === 'hub') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**${community.name} Action Hub**: ${hubUrl}\nAccess structured requests, tasks, and verified outcomes directly.`,
            components: buildMenuComponents()
          }
        });
      }

      if (commandName === 'requests') {
        const openReqs = db.requests.filter(
          (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
        );
        if (openReqs.length === 0) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `**${community.name} NeedSignal**: Zero open help requests currently pending.\nSubmit one using \`/help-request\` or via the Action Hub: ${hubUrl}`,
              components: buildMenuComponents()
            }
          });
        }

        const topReqs = openReqs.slice(0, 3);
        const list = topReqs
          .map((r) => `• **${r.title}** [${r.priority.toUpperCase()}] — *Skills: ${r.skillsRequired.join(', ')}*`)
          .join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active NeedSignal Requests (${openReqs.length})**:\n${list}\n\nOffer help directly or open: ${appUrl}/l/${reqHelpSlug}`,
            components: [
              {
                type: 1,
                components: topReqs.map((r) => ({
                  type: 2,
                  style: 1,
                  label: shortLabel(`🤝 Offer: ${r.title}`, 40),
                  custom_id: `offer_req:${r.id}`
                }))
              },
              ...buildMenuComponents()
            ]
          }
        });
      }

      if (commandName === 'help-request') {
        if (isSuspended) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `⛔ Your membership in **${community.name}** is currently suspended.`,
              flags: 64
            }
          });
        }

        const titleOption = interaction.data?.options?.find((o: any) => o.name === 'title')?.value || 'Assistance Needed';
        const priorityOption = interaction.data?.options?.find((o: any) => o.name === 'priority')?.value || 'medium';
        const creatorId = linkedUser ? linkedUser.id : `discord_${discordUserId || 'anon'}`;

        const newReq = dbOperations.createRequest({
          communityId: community.id,
          creatorId,
          title: titleOption,
          description: `Created via Discord Slash Command by @${discordUsername}`,
          category: community.contributionCategories[0]?.id || 'cat_core',
          skillsRequired: ['Engineering & Community Help'],
          priority: priorityOption as any,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'open',
          visibility: 'community'
        });
        await persistDatabaseNow(env);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**NeedSignal Request Created**:\n` +
              `• **Title**: "${newReq.title}"\n` +
              `• **Priority**: \`${newReq.priority.toUpperCase()}\`\n` +
              `• **Community**: ${community.name}\n` +
              `• **Status**: Open for member offers\n\n` +
              `View and match specialists: ${appUrl}/l/${reqHelpSlug}`,
            components: [
              {
                type: 1,
                components: [
                  { type: 2, style: 1, label: '🤝 Offer Help', custom_id: `offer_req:${newReq.id}` },
                  { type: 2, style: 5, label: '🌐 Open Request Portal', url: `${appUrl}/l/${reqHelpSlug}` }
                ]
              }
            ]
          }
        });
      }

      if (commandName === 'tasks') {
        const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
        if (commTasks.length === 0) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `**QuestLoop**: No open tasks currently pending review in ${community.name}.`,
              components: buildMenuComponents()
            }
          });
        }

        const topTasks = commTasks.slice(0, 3);
        const taskList = topTasks
          .map((t) => `• **${t.title}** [\`${t.id}\` · ${t.status.toUpperCase()}] — Assignee: \`${t.assigneeId || 'Unassigned'}\``)
          .join('\n');

        const actionBtns = topTasks
          .map((t) =>
            !t.assigneeId
              ? { type: 2, style: 3, label: shortLabel(`✋ Claim: ${t.title}`, 40), custom_id: `claim_task:${t.id}` }
              : linkedUser && t.assigneeId === linkedUser.id
              ? { type: 2, style: 1, label: shortLabel(`✅ Deliver: ${t.title}`, 40), custom_id: `complete_task:${t.id}` }
              : null
          )
          .filter(Boolean);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active QuestLoop Tasks (${commTasks.length})**:\n${taskList}\n\nTrack progress: ${hubUrl}`,
            components: [
              ...(actionBtns.length > 0 ? [{ type: 1, components: actionBtns }] : []),
              ...buildMenuComponents()
            ]
          }
        });
      }

      if (commandName === 'mytasks') {
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Your Discord account (@${discordUsername}) is not yet linked to a Community OS profile.\nRun \`/connect\` to generate a verification code and link your account.`,
              components: [{ type: 1, components: [{ type: 2, style: 1, label: '⚡ Link Profile', custom_id: 'btn_connect' }] }],
              flags: 64
            }
          });
        }

        const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
        if (myTasks.length === 0) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `**My Tasks (${linkedUser.name})**: You have no active pending tasks.\nBrowse open opportunities with \`/tasks\`.`,
              components: buildMenuComponents()
            }
          });
        }

        const topMine = myTasks.slice(0, 3);
        const list = topMine
          .map((t) => `• **${t.title}** [\`${t.id}\` · ${t.status}] — Deadline: ${new Date(t.deadline).toLocaleDateString()}`)
          .join('\n');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Your Assigned Tasks (${myTasks.length})**:\n${list}\n\nUse \`/contribution task_id:<id> evidence_url:<url>\` or tap a deliverable button below:`,
            components: [
              {
                type: 1,
                components: topMine.map((t) => ({
                  type: 2,
                  style: 3,
                  label: shortLabel(`✅ Deliver: ${t.title}`, 40),
                  custom_id: `complete_task:${t.id}`
                }))
              }
            ]
          }
        });
      }

      if (commandName === 'passport') {
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                `Your Discord account (@${discordUsername}) is not yet linked to a Community OS Passport.\n` +
                `Run \`/connect\` or sign in via Discord OAuth at ${appUrl}/api/discord/connect?mode=user&redirect=true.`,
              flags: 64
            }
          });
        }

        const verifiedSkills = linkedUser.passport.skills
          .filter((s) => s.verified)
          .map((s) => s.name)
          .join(', ');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Member Passport — ${linkedUser.passport.displayName}**\n` +
              `• **Verified Competencies**: ${verifiedSkills || 'Self-declared only'}\n` +
              `• **Collaboration Bio**: ${linkedUser.passport.biography}\n` +
              `• **Portfolio**: ${linkedUser.passport.portfolioLinks.join(', ') || 'None attached'}\n\n` +
              `*Decentralized verified outcomes managed by Community OS.*`,
            components: [
              {
                type: 1,
                components: [{ type: 2, style: 5, label: '🪪 View Public Passport', url: `${appUrl}/p/${linkedUser.id}` }]
              }
            ]
          }
        });
      }

      if (commandName === 'contribution') {
        const taskIdOpt = interaction.data?.options?.find((o: any) => o.name === 'task_id')?.value?.trim();
        const evidenceUrlOpt = interaction.data?.options?.find((o: any) => o.name === 'evidence_url')?.value?.trim();
        const notesOpt = interaction.data?.options?.find((o: any) => o.name === 'notes')?.value?.trim();

        if (taskIdOpt && evidenceUrlOpt) {
          if (!linkedUser) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `🔐 Please link your Discord account first using \`/connect\` before submitting evidence.`,
                flags: 64
              }
            });
          }
          if (isSuspended) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: { content: `⛔ Suspended members cannot submit contributions.`, flags: 64 }
            });
          }
          const urlCheck = validateEvidenceUrl(evidenceUrlOpt);
          if (!urlCheck.valid || !urlCheck.normalized) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: { content: `❌ ${urlCheck.error}`, flags: 64 }
            });
          }
          const task = db.tasks.find((t) => t.id === taskIdOpt);
          if (!task) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: { content: `❌ Task \`${taskIdOpt}\` was not found.`, flags: 64 }
            });
          }
          if (task.assigneeId && task.assigneeId !== linkedUser.id) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: { content: `⛔ Task \`${task.id}\` is assigned to another contributor.`, flags: 64 }
            });
          }
          const comp = dbOperations.completeTaskWithEvidence(
            task.id,
            urlCheck.normalized,
            notesOpt || `Submitted via Discord by @${discordUsername}`,
            linkedUser.id
          );
          if (!comp || (comp as any).error) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: { content: `❌ ${(comp as any)?.error || 'Task already completed or unavailable.'}`, flags: 64 }
            });
          }
          await persistDatabaseNow(env);
          const cnt = (comp as any).contribution;
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                `✅ **Contribution Submitted & Synced**\n` +
                `• **Task**: ${task.title}\n` +
                `• **Contribution ID**: \`${cnt?.id}\`\n` +
                `• **Status**: Pending Peer Review\n` +
                `• **Evidence**: ${urlCheck.normalized}`
            }
          });
        }

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Submit Deliverable Evidence (SourceTrail)**:\n` +
              `Pass \`task_id\` and \`evidence_url\` options directly to \`/contribution\`, or open the contribution portal: ${appUrl}/l/${contribPortalSlug}`,
            components: [
              {
                type: 1,
                components: [{ type: 2, style: 5, label: '📦 Open Evidence Portal', url: `${appUrl}/l/${contribPortalSlug}` }]
              }
            ]
          }
        });
      }

      if (commandName === 'connect') {
        const codeOption = interaction.data?.options?.find((o: any) => o.name === 'code')?.value?.trim();

        if (codeOption) {
          const verifyRes = dbOperations.verifyIdentityChallenge(codeOption, discordUserId, discordUsername);
          if (!verifyRes.success || !verifyRes.user) {
            return NextResponse.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content:
                  `❌ **Account Linking Failed**: ${verifyRes.message || 'Invalid or expired code.'}\n` +
                  `Open **Member Space > Connected Accounts > Discord** at ${appUrl} to generate a fresh \`OS-XXXX\` code.`,
                flags: 64
              }
            });
          }
          await persistDatabaseNow(env);

          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                `✅ **Discord Account Linked Successfully!**\n` +
                `• **Profile**: ${verifyRes.user.name}\n` +
                `• **Discord Handle**: @${discordUsername}\n` +
                `• **Discord ID**: \`${discordUserId}\`\n` +
                `You can now use \`/mytasks\`, \`/passport\`, and \`/contribution\` in Discord.`,
              flags: 64
            }
          });
        }

        if (linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                `✅ Your Discord account (@${discordUsername}) is already linked to **${linkedUser.name}**.\n` +
                `Manage or switch accounts at ${appUrl}`,
              flags: 64
            }
          });
        }

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Link Your Discord Account to Community OS**\n\n` +
              `1. **Instant Discord OAuth Sign-In / Link**:\n${appUrl}/api/discord/connect?mode=user&redirect=true\n\n` +
              `2. **Or Link to an Existing Account via Code**:\n` +
              `Open **Member Space > Connected Accounts > Discord** at ${appUrl}, generate a 15-minute \`OS-XXXX\` code, then run \`/connect code:OS-XXXX\`.`,
            flags: 64
          }
        });
      }

      if (commandName === 'status') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Community OS Gateway Status**: \`ONLINE\`\n` +
              `• **Discord API**: Authenticated (@Community Outcome)\n` +
              `• **Database Persistence**: Synchronized (Multi-tenant)\n` +
              `• **Active Community**: ${community.name} (${community.id})\n` +
              `• **Ed25519 Cryptography & Replay Window**: Enforced`,
            components: buildMenuComponents()
          }
        });
      }

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Command \`/${commandName}\` acknowledged by Community OS.`
        }
      });
    }

    // 3. Message Component Interactions (Interactive Discord Buttons)
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = String(interaction.data?.custom_id || '');

      if (customId === 'btn_hub') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**${community.name} Action Hub**: ${hubUrl}\nBrowse structured requests, track deliverables, and verify community outcomes.`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_requests') {
        const openReqs = db.requests.filter(
          (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
        );
        const topReqs = openReqs.slice(0, 3);
        const list =
          openReqs.length === 0
            ? 'Zero open help requests currently pending.'
            : topReqs.map((r) => `• **${r.title}** [${r.priority.toUpperCase()}]`).join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active NeedSignal Requests (${openReqs.length})**:\n${list}\n\nSubmit assistance offers at: ${hubUrl}`,
            ...(topReqs.length > 0
              ? {
                  components: [
                    {
                      type: 1,
                      components: topReqs.map((r) => ({
                        type: 2,
                        style: 1,
                        label: shortLabel(`🤝 Offer: ${r.title}`, 40),
                        custom_id: `offer_req:${r.id}`
                      }))
                    }
                  ]
                }
              : {}),
            flags: 64
          }
        });
      }

      if (customId.startsWith('offer_req:')) {
        const reqId = customId.slice('offer_req:'.length).trim();
        const targetReq = db.requests.find((r) => r.id === reqId);
        if (!targetReq) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '⚠️ Request is no longer open.', flags: 64 }
          });
        }
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `🔐 Link your Discord account via \`/connect\` or ${appUrl}/api/discord/connect?mode=user&redirect=true before submitting an offer.`,
              flags: 64
            }
          });
        }
        if (isSuspended) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '⛔ Suspended members cannot submit offers.', flags: 64 }
          });
        }
        const existingOffer = db.offers.find(
          (o) => o.requestId === targetReq.id && o.memberId === linkedUser.id && o.status !== 'declined'
        );
        if (existingOffer) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `✅ You already submitted an offer (${existingOffer.status}) for **${targetReq.title}**.`, flags: 64 }
          });
        }
        dbOperations.createOffer({
          requestId: targetReq.id,
          communityId: targetReq.communityId,
          memberId: linkedUser.id,
          proposedHelp: `Offered assistance directly via Discord (@${discordUsername}).`,
          skills: linkedUser.passport.skills.map((s) => s.name).slice(0, 3),
          experienceDescription: linkedUser.passport.biography || 'Discord contributor',
          availability: 'Available via Discord & Web',
          estimatedHours: 4,
          portfolioLinks: []
        });
        await persistDatabaseNow(env);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `✅ **Offer Submitted & Synced** for "${targetReq.title}" under **${linkedUser.name}**.`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_tasks') {
        const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
        const topTasks = commTasks.slice(0, 3);
        const taskList =
          commTasks.length === 0
            ? 'Zero active tasks currently in progress.'
            : topTasks.map((t) => `• **${t.title}** [\`${t.id}\` · ${t.status.toUpperCase()}]`).join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active QuestLoop Tasks (${commTasks.length})**:\n${taskList}\n\nTrack progress: ${hubUrl}`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_mytasks') {
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Run `/connect` to link your Discord account first.', flags: 64 }
          });
        }
        const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
        const list =
          myTasks.length === 0
            ? 'You have no assigned active tasks.'
            : myTasks.slice(0, 3).map((t) => `• **${t.title}** [\`${t.id}\`]`).join('\n');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `**Your Assigned Tasks (${myTasks.length})**:\n${list}`, flags: 64 }
        });
      }

      if (customId.startsWith('claim_task:')) {
        const taskId = customId.slice('claim_task:'.length).trim();
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔐 Link your Discord profile first via `/connect`.', flags: 64 }
          });
        }
        if (isSuspended) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '⛔ Suspended members cannot claim tasks.', flags: 64 }
          });
        }
        const claimed = dbOperations.claimTask(taskId, linkedUser.id);
        if (!claimed || (claimed as any).error) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `⚠️ ${(claimed as any)?.error || 'Task unavailable or already claimed.'}`, flags: 64 }
          });
        }
        await persistDatabaseNow(env);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `✋ **Task Claimed & Synced**: "${(claimed as any).title}"`, flags: 64 }
        });
      }

      if (customId.startsWith('complete_task:')) {
        const taskId = customId.slice('complete_task:'.length).trim();
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🔐 Link your Discord profile first via `/connect`.', flags: 64 }
          });
        }
        const task = db.tasks.find((t) => t.id === taskId);
        if (!task || (task.assigneeId && task.assigneeId !== linkedUser.id)) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '⛔ Task not found or assigned to another member.', flags: 64 }
          });
        }
        const comp = dbOperations.completeTaskWithEvidence(
          taskId,
          hubUrl,
          `Delivered via Discord button by ${linkedUser.name}`,
          linkedUser.id
        );
        if (!comp || (comp as any).error) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `⚠️ ${(comp as any)?.error || 'Task already completed.'}`, flags: 64 }
          });
        }
        await persistDatabaseNow(env);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🎉 **Deliverable Submitted & Synced** (${(comp as any).contribution?.id}). Pending peer review in Web Workspace.`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_passport') {
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Your Discord account (@${discordUsername}) is not yet linked.\nUse \`/connect\` or link via OAuth at ${appUrl}/api/discord/connect?mode=user&redirect=true`,
              flags: 64
            }
          });
        }

        const verified = linkedUser.passport.skills.filter((s) => s.verified).map((s) => s.name).join(', ');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Verified Passport — ${linkedUser.passport.displayName}**\n• Verified Skills: ${verified || 'Self-declared only'}\n• Bio: ${linkedUser.passport.biography}`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_connect') {
        if (linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Your Discord account (@${discordUsername}) is already linked to **${linkedUser.name}**.\nManage at ${appUrl}`,
              flags: 64
            }
          });
        }
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Link Your Community OS Profile**\n` +
              `• Instant OAuth: ${appUrl}/api/discord/connect?mode=user&redirect=true\n` +
              `• Or generate an \`OS-XXXX\` code in Member Space > Connected Accounts and run \`/connect code:OS-XXXX\`.`,
            flags: 64
          }
        });
      }

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Action acknowledged', flags: 64 }
      });
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Interaction acknowledged' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  const publicKey = env.DISCORD_PUBLIC_KEY;
  const appUrl = getVerifiedAppUrl(env);
  return NextResponse.json({
    status: 'online',
    endpoint: 'Discord Interactions Endpoint',
    url: `${appUrl}/api/discord/interactions`,
    productionUrl: 'https://community-outcome.ghazghazibahaeddin.workers.dev/api/discord/interactions',
    publicKeyConfigured: Boolean(publicKey),
    message: publicKey
      ? 'DISCORD_PUBLIC_KEY is configured. Ready for Discord verification.'
      : 'DISCORD_PUBLIC_KEY is missing. Copy your 64-char PUBLIC KEY from Discord Developer Portal (General Information) and set DISCORD_PUBLIC_KEY in Cloudflare Dashboard (Settings > Variables and Secrets).'
  });
}
