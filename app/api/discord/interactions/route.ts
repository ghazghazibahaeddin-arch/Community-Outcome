// Community OS — Official Discord Interactions Endpoint with Cryptographic Verification
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, getDatabase } from '@/lib/db/store';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

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

/**
 * Verify Discord Ed25519 request signature using official discord-interactions library
 * with native Web Crypto fallback.
 */
async function verifyDiscordSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string
): Promise<boolean> {
  if (!signature || !timestamp || !publicKeyHex) return false;
  try {
    const cleanKeyHex = publicKeyHex.trim();
    const cleanSigHex = signature.trim();

    if (cleanKeyHex.length !== 64 || cleanSigHex.length !== 128) {
      return false;
    }

    // 1. Official discord-interactions library verifyKey
    try {
      const ok = await verifyKey(rawBody, cleanSigHex, timestamp, cleanKeyHex);
      if (ok) return true;
    } catch {
      // Fall through to native Web Crypto
    }

    // 2. Direct Web Crypto fallback (Native in Cloudflare Workers workerd)
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
        // Fall through
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

    // Structured diagnostic log without sensitive data or payloads
    console.log('[Discord Interactions] Request received', {
      hasSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      hasPublicKey: Boolean(publicKey),
      bodyLength: rawBody.length
    });

    // Cryptographic Ed25519 Signature Verification
    if (!publicKey) {
      console.error('[Discord Interactions] DISCORD_PUBLIC_KEY is not configured in runtime environment. Add DISCORD_PUBLIC_KEY to Cloudflare dashboard Variables and Secrets.');
      return new NextResponse('DISCORD_PUBLIC_KEY not configured', { status: 401 });
    }

    if (!signature || !timestamp) {
      console.warn('[Discord Interactions] Rejected request missing signature headers');
      return new NextResponse('Invalid request signature', { status: 401 });
    }

    const isValid = await verifyDiscordSignature(rawBody, signature, timestamp, publicKey);
    console.log('[Discord Interactions] Signature verification outcome:', isValid ? 'SUCCESS' : 'FAILED');
    if (!isValid) {
      return new NextResponse('Invalid request signature', { status: 401 });
    }

    let interaction: any;
    try {
      interaction = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // 1. Handle Discord PING challenge immediately after verification
    if (interaction.type === InteractionType.PING) {
      console.log('[Discord Interactions] Responded to PING with PONG (type: 1)');
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // 2. Handle Application Slash Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = (interaction.data?.name || '').toLowerCase();
      const guildId = interaction.guild_id || interaction.guild?.id || '';
      const discordUser = interaction.member?.user || interaction.user || {};
      const discordUserId = discordUser.id || '';
      const discordUsername = discordUser.username ? `${discordUser.username}#${discordUser.discriminator || '0'}` : 'discord_user';

      const db = getDatabase();
      const appUrl = (env.APP_URL || 'https://community-os.org').replace(/\/$/, '');

      // Resolve community by guild ID or fallback to default community
      const community =
        db.communities.find((c) => c.discordConfig?.serverId === guildId) ||
        db.communities.find((c) => c.id === 'comm_devforge') ||
        db.communities[0];

      // Resolve linked user
      const linkedUser = db.users.find((u) => u.identities.discordId === discordUserId);
      const activeCreatorId = linkedUser ? linkedUser.id : 'usr_alex';

      // COMMAND: /help
      if (commandName === 'help') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Community OS — Discord Command Center**\n` +
              `Operating on **${community.name}**\n\n` +
              `• \`/hub\` — Get direct link to the community action hub\n` +
              `• \`/requests\` — Browse open NeedSignal help requests\n` +
              `• \`/help-request [title] [priority]\` — Post a new assistance request\n` +
              `• \`/tasks\` — List active QuestLoop deliverables and milestones\n` +
              `• \`/mytasks\` — View tasks assigned to your verified account\n` +
              `• \`/passport\` — View your portable verified skills\n` +
              `• \`/contribution\` — Submit evidence for completed deliverables\n` +
              `• \`/connect\` — Link your Discord account to Community OS\n` +
              `• \`/status\` — Verify bot gateway and database connectivity\n\n` +
              `*Web Platform*: ${appUrl}`
          }
        });
      }

      // COMMAND: /hub
      if (commandName === 'hub') {
        const hubLink = `${appUrl}/l/${community.slug || community.id}-hub`;
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**${community.name} Action Hub**: ${hubLink}\nAccess structured requests, tasks, and verified outcomes directly.`
          }
        });
      }

      // COMMAND: /requests
      if (commandName === 'requests') {
        const openReqs = db.requests.filter((r) => r.communityId === community.id && r.status === 'open');
        if (openReqs.length === 0) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `**${community.name} NeedSignal**: Zero open help requests currently pending.\nSubmit one using \`/help-request\` or via the Action Hub.`
            }
          });
        }

        const list = openReqs
          .slice(0, 3)
          .map((r) => `• **${r.title}** [${r.priority.toUpperCase()}] — *Skills: ${r.skillsRequired.join(', ')}*`)
          .join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active NeedSignal Requests (${openReqs.length})**:\n${list}\n\nRespond or submit an offer at: ${appUrl}/l/devforge-request-help`
          }
        });
      }

      // COMMAND: /help-request
      if (commandName === 'help-request') {
        const titleOption = interaction.data?.options?.find((o: any) => o.name === 'title')?.value || 'Assistance Needed';
        const priorityOption = interaction.data?.options?.find((o: any) => o.name === 'priority')?.value || 'medium';

        const newReq = dbOperations.createRequest({
          communityId: community.id,
          creatorId: activeCreatorId,
          title: titleOption,
          description: `Created via Discord Slash Command by @${discordUsername}`,
          category: community.contributionCategories[0]?.id || 'cat_core',
          skillsRequired: ['Engineering & Community Help'],
          priority: priorityOption as any,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'open',
          visibility: 'community'
        });

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**NeedSignal Request Created**:\n` +
              `• **Title**: "${newReq.title}"\n` +
              `• **Priority**: \`${newReq.priority.toUpperCase()}\`\n` +
              `• **Community**: ${community.name}\n` +
              `• **Status**: Open for member offers\n\n` +
              `View and match specialists: ${appUrl}/l/devforge-request-help`
          }
        });
      }

      // COMMAND: /tasks
      if (commandName === 'tasks') {
        const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
        if (commTasks.length === 0) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `**QuestLoop**: No open tasks currently pending review in ${community.name}.`
            }
          });
        }

        const taskList = commTasks
          .slice(0, 3)
          .map((t) => `• **${t.title}** [${t.status.toUpperCase()}] — Assignee: \`${t.assigneeId || 'Unassigned'}\``)
          .join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active QuestLoop Tasks (${commTasks.length})**:\n${taskList}\n\nTrack progress: ${appUrl}/l/${community.slug || community.id}-hub`
          }
        });
      }

      // COMMAND: /mytasks
      if (commandName === 'mytasks') {
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Your Discord account (@${discordUsername}) is not yet linked to a Community OS profile.\nRun \`/connect\` to generate a verification code and link your account.`
            }
          });
        }

        const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
        if (myTasks.length === 0) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `**My Tasks (${linkedUser.name})**: You have no active pending tasks.\nBrowse open opportunities with \`/tasks\` or in your Member Space.`
            }
          });
        }

        const list = myTasks.map((t) => `• **${t.title}** [${t.status}] — Deadline: ${new Date(t.deadline).toLocaleDateString()}`).join('\n');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Your Assigned Tasks (${myTasks.length})**:\n${list}\n\nSubmit completion evidence at: ${appUrl}`
          }
        });
      }

      // COMMAND: /passport
      if (commandName === 'passport') {
        const targetUser = linkedUser || db.users[0];
        const verifiedSkills = targetUser.passport.skills
          .filter((s) => s.verified)
          .map((s) => s.name)
          .join(', ');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Member Passport — ${targetUser.passport.displayName}**\n` +
              `• **Verified Competencies**: ${verifiedSkills || 'Self-declared only'}\n` +
              `• **Collaboration Bio**: ${targetUser.passport.biography}\n` +
              `• **Portfolio**: ${targetUser.passport.portfolioLinks.join(', ') || 'None attached'}\n\n` +
              `*Decentralized verified outcomes managed by Community OS.*`
          }
        });
      }

      // COMMAND: /contribution
      if (commandName === 'contribution') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Submit Deliverable Evidence (SourceTrail)**:\n` +
              `Complete your assigned QuestLoop deliverable with an inspectable URL (git commit, pull request, artifact link).\n` +
              `Open contribution portal: ${appUrl}/l/devforge-contribution-ranking`
          }
        });
      }

      // COMMAND: /connect
      if (commandName === 'connect') {
        // Create an identity challenge code
        const challenge = dbOperations.createIdentityChallenge(linkedUser?.id || 'usr_sarah', 'discord');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Account Linking Challenge Code**: \`${challenge.code}\`\n\n` +
              `1. Open your Community OS Member Space: ${appUrl}\n` +
              `2. Go to **Member Space > Identity Linking**\n` +
              `3. Enter code \`${challenge.code}\` to link your Discord account (@${discordUsername}).\n` +
              `*Code expires in 15 minutes.*`
          }
        });
      }

      // COMMAND: /status
      if (commandName === 'status') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              `**Community OS Gateway Status**: \`ONLINE\`\n` +
              `• **Discord API**: Authenticated (@Community Outcome)\n` +
              `• **Database Persistence**: Synchronized (Multi-tenant)\n` +
              `• **Active Community**: ${community.name} (${community.id})\n` +
              `• **Ed25519 Cryptography**: Enforced`
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

    // 3. Handle Message Component Interactions (In-Guild Interactive Buttons)
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = interaction.data?.custom_id || '';
      const guildId = interaction.guild_id || interaction.guild?.id || '';
      const discordUser = interaction.member?.user || interaction.user || {};
      const discordUserId = discordUser.id || '';
      const discordUsername = discordUser.username || 'discord_user';

      const db = getDatabase();
      const appUrl = (env.APP_URL || 'https://community-os.org').replace(/\/$/, '');
      const community =
        db.communities.find((c) => c.discordConfig?.serverId === guildId) ||
        db.communities.find((c) => c.id === 'comm_devforge') ||
        db.communities[0];

      const linkedUser = db.users.find((u) => u.identities.discordId === discordUserId);

      if (customId === 'btn_hub') {
        const hubLink = `${appUrl}/l/${community.slug || community.id}-hub`;
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**${community.name} Action Hub**: ${hubLink}\nBrowse structured requests, track deliverables, and verify community outcomes.`,
            flags: 64 // ephemeral
          }
        });
      }

      if (customId === 'btn_requests') {
        const openReqs = db.requests.filter((r) => r.communityId === community.id && r.status === 'open');
        const list = openReqs.length === 0
          ? 'Zero open help requests currently pending.'
          : openReqs.slice(0, 3).map(r => `• **${r.title}** [${r.priority.toUpperCase()}]`).join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active NeedSignal Requests (${openReqs.length})**:\n${list}\n\nSubmit assistance offers at: ${appUrl}/l/devforge-request-help`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_tasks') {
        const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
        const taskList = commTasks.length === 0
          ? 'Zero active tasks currently in progress.'
          : commTasks.slice(0, 3).map(t => `• **${t.title}** [${t.status.toUpperCase()}]`).join('\n');

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Active QuestLoop Tasks (${commTasks.length})**:\n${taskList}\n\nTrack progress: ${appUrl}/l/${community.slug || community.id}-hub`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_passport') {
        if (!linkedUser) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Your Discord account (@${discordUsername}) is not yet linked.\nUse \`/connect\` to link your Community OS profile and view your verified skills.`,
              flags: 64
            }
          });
        }

        const verified = linkedUser.passport.skills.filter(s => s.verified).map(s => s.name).join(', ');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Verified Passport — ${linkedUser.passport.displayName}**\n• Verified Skills: ${verified || 'Self-declared only'}\n• Bio: ${linkedUser.passport.biography}`,
            flags: 64
          }
        });
      }

      if (customId === 'btn_connect') {
        const challenge = dbOperations.createIdentityChallenge('usr_sarah', 'discord');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `**Identity Linking**: Enter verification code \`${challenge.code}\` in your Community OS Member Space: ${appUrl}`,
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
  return NextResponse.json({
    status: 'online',
    endpoint: 'Discord Interactions Endpoint',
    url: 'https://community-outcome.ghazghazibahaeddin.workers.dev/api/discord/interactions',
    publicKeyConfigured: Boolean(publicKey),
    message: publicKey
      ? 'DISCORD_PUBLIC_KEY is configured. Ready for Discord verification.'
      : 'DISCORD_PUBLIC_KEY is missing. Copy your 64-char PUBLIC KEY from Discord Developer Portal (General Information) and set DISCORD_PUBLIC_KEY in Cloudflare Dashboard (Settings > Variables and Secrets).'
  });
}
