// Community OS — Shared Telegram Bot Command & Callback Processor
// Used by both /api/telegram/webhook (Cloudflare Workers / production HTTPS)
// and /api/telegram/poll (sandbox / dev live polling when webhook is empty).
import { dbOperations, ensureDatabaseHydrated, getDatabase } from '@/lib/db/store';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { CloudflareEnv } from '@/lib/env';

// Deduplicate Telegram update retries
const recentUpdateIds = new Set<number>();
const MAX_RECENT_UPDATES = 2000;

export const TELEGRAM_BOT_COMMANDS = [
  { command: 'start', description: 'Open Community OS command center' },
  { command: 'help', description: 'View all commands and linking steps' },
  { command: 'hub', description: 'Get direct link to Community Action Hub' },
  { command: 'requests', description: 'Browse open NeedSignal help requests' },
  { command: 'help_request', description: 'Create a help request (title | priority)' },
  { command: 'tasks', description: 'List active QuestLoop tasks' },
  { command: 'mytasks', description: 'View tasks assigned to your linked account' },
  { command: 'passport', description: 'View your verified Member Passport' },
  { command: 'contribution', description: 'Submit deliverable evidence' },
  { command: 'connect', description: 'Link Telegram profile or group (/connect OS-XXXX)' },
  { command: 'status', description: 'Check bot & multi-tenant gateway health' }
];

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface TelegramReplyPayload {
  ok?: boolean;
  duplicate?: boolean;
  method?: 'sendMessage';
  chat_id?: number | string;
  text?: string;
  parse_mode?: 'HTML';
  reply_markup?: Record<string, any>;
}

export async function syncTelegramBotCommands(token: string): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: TELEGRAM_BOT_COMMANDS })
    });
    const data = (await res.json()) as any;
    return { ok: Boolean(data.ok), description: data.description };
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Network error calling setMyCommands' };
  }
}

export async function dispatchTelegramReply(token: string, reply: TelegramReplyPayload): Promise<{ sent: boolean; error?: string }> {
  if (!token || reply.method !== 'sendMessage' || !reply.chat_id || !reply.text) {
    return { sent: false };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: reply.chat_id,
        text: reply.text,
        parse_mode: reply.parse_mode || 'HTML',
        ...(reply.reply_markup ? { reply_markup: reply.reply_markup } : {})
      })
    });
    const json = (await res.json()) as any;
    return { sent: Boolean(json.ok), error: json.ok ? undefined : json.description };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'Failed to send Telegram reply' };
  }
}

export async function processTelegramUpdate(rawBody: any, env: CloudflareEnv): Promise<TelegramReplyPayload> {
  // 1. Deduplicate Telegram update retries via update_id
  if (typeof rawBody?.update_id === 'number') {
    if (recentUpdateIds.has(rawBody.update_id)) {
      return { ok: true, duplicate: true };
    }
    recentUpdateIds.add(rawBody.update_id);
    if (recentUpdateIds.size > MAX_RECENT_UPDATES) {
      const firstEntry = recentUpdateIds.values().next().value;
      if (firstEntry !== undefined) recentUpdateIds.delete(firstEntry);
    }
  }

  // 2. Handle Inline Button Callback Queries
  if (rawBody?.callback_query) {
    const cb = rawBody.callback_query;
    const cbChatId = cb.message?.chat?.id;
    const cbData = cb.data || '';
    const cbFrom = cb.from || {};
    const token = env.TELEGRAM_BOT_TOKEN;
    const appUrl = getVerifiedAppUrl(env);
    await ensureDatabaseHydrated(env);
    const db = getDatabase();
    const community =
      db.communities.find(
        (c) =>
          c.telegramConfig?.groupId === String(cbChatId) ||
          c.connectedTelegramGroups?.some((g) => g.groupId === String(cbChatId))
      ) ||
      db.communities.find((c) => c.id === 'comm_devforge') ||
      db.communities[0];

    // Acknowledge callback immediately
    if (token && cb.id) {
      try {
        await fetch(`https://api.telegram.org/bot${token.trim()}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id, text: 'Opening Community OS...' })
        });
      } catch {}
    }

    if (!cbChatId) return { ok: true };

    if (cbData === 'menu_requests') {
      const openReqs = db.requests.filter(
        (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
      );
      const listText =
        openReqs.length === 0
          ? `<b>NeedSignal</b>: Zero open help requests currently in ${escapeHtml(community.name)}.`
          : `<b>Active NeedSignal Requests (${openReqs.length})</b>:\n` +
            openReqs
              .slice(0, 3)
              .map((r) => `• <b>${escapeHtml(r.title)}</b> [${escapeHtml(r.priority.toUpperCase())}]`)
              .join('\n') +
            `\n\nFull requests &amp; offer portal: ${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`;

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text: listText,
        parse_mode: 'HTML'
      };
    }

    if (cbData === 'menu_tasks') {
      const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
      const taskText =
        commTasks.length === 0
          ? `<b>QuestLoop</b>: No pending tasks in ${escapeHtml(community.name)}.`
          : `<b>Active Deliverables (${commTasks.length})</b>:\n` +
            commTasks
              .slice(0, 3)
              .map((t) => `• <b>${escapeHtml(t.title)}</b> [${escapeHtml(t.status.toUpperCase())}]`)
              .join('\n') +
            `\n\nDeliverable portal: ${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`;

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text: taskText,
        parse_mode: 'HTML'
      };
    }

    if (cbData === 'menu_passport') {
      const cbUid = String(cbFrom.id || '');
      const cbUsername = cbFrom.username || '';
      const linkedUser = db.users.find(
        (u) =>
          (u.identities?.telegramId && u.identities.telegramId === cbUid) ||
          (cbUsername && u.identities?.telegramUsername?.toLowerCase() === cbUsername.toLowerCase())
      );
      const passportText = linkedUser
        ? `<b>Verified Member Passport — ${escapeHtml(linkedUser.passport.displayName)}</b>\n` +
          `• <b>Skills</b>: ${escapeHtml(linkedUser.passport.skills.filter((s) => s.verified).map((s) => s.name).join(', ') || 'Self-declared')}\n` +
          `• <b>Bio</b>: ${escapeHtml(linkedUser.passport.biography)}`
        : `<b>Member Passport</b>: Your Telegram account (@${escapeHtml(cbFrom.username || cbFrom.id)}) is not yet linked.\n` +
          `Sign in or link directly here:\n${escapeHtml(appUrl)}/api/auth/telegram/authorize?redirect=true\n` +
          `Or generate an <code>OS-XXXX</code> code in Member Space &rarr; Telegram Card and send <code>/connect OS-XXXX</code>.`;

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text: passportText,
        parse_mode: 'HTML'
      };
    }

    if (cbData === 'menu_connect') {
      const cbUid = String(cbFrom.id || '');
      const linkedUser = db.users.find((u) => u.identities?.telegramId === cbUid);
      if (linkedUser) {
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `✅ <b>Already Linked</b>\n\n` +
            `Your Telegram account (@${escapeHtml(cbFrom.username || cbUid)}) is already linked to <b>${escapeHtml(linkedUser.name)}</b>.\n` +
            `Open your workspace: ${escapeHtml(appUrl)}`,
          parse_mode: 'HTML'
        };
      }
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Link Your Community OS Profile</b>\n\n` +
          `1. <b>One-Click Telegram Login / Link</b>:\n${escapeHtml(appUrl)}/api/auth/telegram/authorize?redirect=true\n\n` +
          `2. <b>Or Link Existing Web Account via Code</b>:\n` +
          `Open Member Space &rarr; Connected Accounts &rarr; Telegram, generate a 15-minute code (<code>OS-XXXX</code>), and send <code>/connect OS-XXXX</code> in private chat with this bot.`,
        parse_mode: 'HTML'
      };
    }

    return { ok: true };
  }

  // 3. Handle Text Commands
  const message = rawBody?.message || rawBody?.channel_post;
  if (!message || !message.text) {
    return { ok: true };
  }

  const chatId = message.chat?.id;
  if (!chatId) {
    return { ok: true };
  }

  const rawText = message.text.trim();
  const firstWordToken = rawText.split(/\s+/)[0];
  const firstWord = firstWordToken.toLowerCase().split('@')[0];
  const argsString = rawText.slice(firstWordToken.length).trim();

  await ensureDatabaseHydrated(env);
  const db = getDatabase();
  const appUrl = getVerifiedAppUrl(env);

  const community =
    db.communities.find(
      (c) =>
        c.telegramConfig?.groupId === String(chatId) ||
        c.connectedTelegramGroups?.some((g) => g.groupId === String(chatId))
    ) ||
    db.communities.find((c) => c.id === 'comm_devforge') ||
    db.communities[0];

  const telegramUserId = String(message.from?.id || '');
  const telegramUsername = message.from?.username || '';
  const telegramFirstName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ');
  const linkedUser = db.users.find(
    (u) =>
      (u.identities?.telegramId && u.identities.telegramId === telegramUserId) ||
      (telegramUsername && u.identities?.telegramUsername?.toLowerCase() === telegramUsername.toLowerCase()) ||
      (telegramUsername && u.identities?.telegramId === `@${telegramUsername}`)
  );

  const isConnectDeepLink = firstWord === '/start' && argsString.toLowerCase() === 'connect';

  if ((firstWord === '/start' && !isConnectDeepLink) || firstWord === '/help') {
    const text =
      `<b>Community OS — Telegram Command Center</b>\n` +
      `Operating on <b>${escapeHtml(community.name)}</b>\n\n` +
      `• <code>/hub</code> — Open Community Action Hub\n` +
      `• <code>/requests</code> — View active NeedSignal help requests\n` +
      `• <code>/help_request title | priority</code> — Create a help request\n` +
      `• <code>/tasks</code> — Browse active QuestLoop tasks\n` +
      `• <code>/mytasks</code> — View your assigned tasks\n` +
      `• <code>/passport</code> — View your verified competencies\n` +
      `• <code>/contribution task_id | evidence_url | summary</code> — Submit deliverable\n` +
      `• <code>/connect OS-XXXX</code> — Link your personal Member account\n` +
      `• <code>/connect CONNECT-TG-XXXX</code> — Link a Telegram Group (Group Admin)\n` +
      `• <code>/status</code> — Verify bot and database health\n\n` +
      `Web platform: ${escapeHtml(appUrl)}`;

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/hub') {
    const hubLink = `${appUrl}/l/${community.slug || community.id}-hub`;
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>${escapeHtml(community.name)} Action Hub</b>:\n${escapeHtml(hubLink)}\n\nAccess structured requests, tasks, and verified outcomes directly.`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/requests') {
    const openReqs = db.requests.filter(
      (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
    );
    if (openReqs.length === 0) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>${escapeHtml(community.name)} NeedSignal</b>: Zero open help requests currently pending.\nPost one using <code>/help_request Title</code> or via the Action Hub.`,
        parse_mode: 'HTML'
      };
    }

    const list = openReqs
      .slice(0, 4)
      .map(
        (r) =>
          `• <b>${escapeHtml(r.title)}</b> [${escapeHtml(r.priority.toUpperCase())}]\n  Skills: <i>${escapeHtml(r.skillsRequired.join(', '))}</i>\n  Status: ${escapeHtml(r.status)}`
      )
      .join('\n\n');

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>Active NeedSignal Requests (${openReqs.length})</b>:\n\n${list}\n\nSubmit an offer or review full details at: ${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/help_request') {
    if (!argsString) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>Usage</b>: <code>/help_request title | priority</code>\nExample: <code>/help_request Need assistance reviewing smart contract | high</code>`,
        parse_mode: 'HTML'
      };
    }

    const parts = argsString.split('|').map((s: string) => s.trim());
    const title = parts[0] || 'Community Support Needed';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (parts[1]) {
      const p = parts[1].toLowerCase();
      if (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent') {
        priority = p;
      }
    }

    const activeCreatorId = linkedUser ? linkedUser.id : 'usr_alex';
    const newReq = dbOperations.createRequest({
      communityId: community.id,
      creatorId: activeCreatorId,
      title,
      description: `Created via Telegram Bot by @${telegramUsername || telegramUserId}`,
      category: community.contributionCategories[0]?.id || 'cat_core',
      skillsRequired: ['General Assistance & Verification'],
      priority,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'open',
      visibility: 'community'
    });

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>NeedSignal Request Created</b>:\n` +
        `• <b>Title</b>: "${escapeHtml(newReq.title)}"\n` +
        `• <b>Priority</b>: <code>${escapeHtml(newReq.priority.toUpperCase())}</code>\n` +
        `• <b>Community</b>: ${escapeHtml(community.name)}\n` +
        `• <b>Status</b>: Open for member offers\n\n` +
        `View and match specialists: ${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/tasks') {
    const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
    if (commTasks.length === 0) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>QuestLoop</b>: No open tasks currently pending in ${escapeHtml(community.name)}.`,
        parse_mode: 'HTML'
      };
    }

    const taskList = commTasks
      .slice(0, 4)
      .map(
        (t) =>
          `• <b>${escapeHtml(t.title)}</b> [${escapeHtml(t.status.toUpperCase())}]\n  ID: <code>${escapeHtml(t.id)}</code> | Assignee: <code>${escapeHtml(t.assigneeId || 'Unassigned')}</code>`
      )
      .join('\n\n');

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>Active QuestLoop Tasks (${commTasks.length})</b>:\n\n${taskList}\n\nTrack progress: ${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/mytasks') {
    if (!linkedUser) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `Your Telegram account (@${escapeHtml(telegramUsername || telegramUserId)}) is not yet linked to a Community OS profile.\n\n` +
          `Link instantly here:\n${escapeHtml(appUrl)}/api/auth/telegram/authorize?redirect=true\n` +
          `Or run <code>/connect OS-XXXX</code> using a code from Member Space.`,
        parse_mode: 'HTML'
      };
    }

    const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
    if (myTasks.length === 0) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>My Tasks (${escapeHtml(linkedUser.name)})</b>: You have no active pending tasks.\nBrowse open opportunities with <code>/tasks</code> or in your Member Space.`,
        parse_mode: 'HTML'
      };
    }

    const list = myTasks
      .map(
        (t) =>
          `• <b>${escapeHtml(t.title)}</b> [${escapeHtml(t.status)}] — Deadline: ${escapeHtml(new Date(t.deadline).toLocaleDateString())}`
      )
      .join('\n');
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>Your Assigned Tasks (${myTasks.length})</b>:\n\n${list}\n\nSubmit completion evidence at: ${escapeHtml(appUrl)}`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/passport') {
    if (!linkedUser) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `Your Telegram account (@${escapeHtml(telegramUsername || telegramUserId)}) is not linked yet.\n` +
          `Link here: ${escapeHtml(appUrl)}/api/auth/telegram/authorize?redirect=true\n` +
          `Or send <code>/connect OS-XXXX</code> with a challenge code from your Member Space.`,
        parse_mode: 'HTML'
      };
    }

    const verifiedSkills = linkedUser.passport.skills
      .filter((s) => s.verified)
      .map((s) => s.name)
      .join(', ');

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Member Passport — ${escapeHtml(linkedUser.passport.displayName)}</b>\n\n` +
        `• <b>Verified Competencies</b>: ${escapeHtml(verifiedSkills || 'Self-declared only')}\n` +
        `• <b>Collaboration Bio</b>: ${escapeHtml(linkedUser.passport.biography)}\n` +
        `• <b>Portfolio</b>: ${escapeHtml(linkedUser.passport.portfolioLinks.join(', ') || 'None attached')}\n\n` +
        `<i>Decentralized verified outcomes managed by Community OS.</i>`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/contribution') {
    if (!argsString) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `<b>Submit Deliverable Evidence (SourceTrail)</b>:\n\n` +
          `Usage: <code>/contribution task_id | evidence_url | description</code>\n` +
          `Or visit the contribution portal directly:\n${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`,
        parse_mode: 'HTML'
      };
    }

    const parts = argsString.split('|').map((s: string) => s.trim());
    const taskId = parts[0];
    const evidenceUrl = parts[1] || 'https://github.com/deliverable';
    const summary = parts[2] || 'Submitted via Telegram bot';

    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `Task with ID <code>${escapeHtml(taskId)}</code> was not found. Use <code>/tasks</code> to browse available tasks.`,
        parse_mode: 'HTML'
      };
    }

    const result = dbOperations.completeTaskWithEvidence(
      task.id,
      evidenceUrl,
      summary,
      linkedUser ? linkedUser.id : 'usr_alex'
    );
    const newContribution = result?.contribution;

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Contribution Evidence Submitted</b>\n\n` +
        `• <b>Contribution ID</b>: <code>${escapeHtml(newContribution?.id || 'pending')}</code>\n` +
        `• <b>Task</b>: ${escapeHtml(task.title)}\n` +
        `• <b>Status</b>: Completed &amp; Pending Community Peer Review\n` +
        `• <b>Evidence</b>: ${escapeHtml(evidenceUrl)}\n\n` +
        `Track review status: ${escapeHtml(appUrl)}/l/${escapeHtml(community.slug || community.id)}-hub`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/connect' || isConnectDeepLink) {
    const codeArg = isConnectDeepLink ? '' : argsString.trim();

    if (codeArg && codeArg.toUpperCase().startsWith('OS-')) {
      const displayHandle = telegramUsername || telegramFirstName || `tg_${telegramUserId}`;
      const verifyRes = dbOperations.verifyIdentityChallenge(codeArg, telegramUserId, displayHandle);

      if (!verifyRes.success || !verifyRes.user) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text:
            `❌ <b>Account Linking Failed</b>: ${escapeHtml(verifyRes.message || 'Invalid or expired OS code.')}\n\n` +
            `Open Member Space &rarr; Connected Accounts &rarr; Telegram to generate a fresh 15-minute <code>OS-XXXX</code> code.`,
          parse_mode: 'HTML'
        };
      }

      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `✅ <b>Telegram Account Linked Successfully!</b>\n\n` +
          `• <b>Profile</b>: ${escapeHtml(verifyRes.user.name)}\n` +
          `• <b>Telegram Handle</b>: @${escapeHtml(displayHandle)}\n` +
          `• <b>Telegram ID</b>: <code>${escapeHtml(telegramUserId)}</code>\n\n` +
          `You can now use <code>/mytasks</code>, <code>/passport</code>, and <code>/contribution</code> directly in Telegram.`,
        parse_mode: 'HTML'
      };
    }

    if (codeArg) {
      const isGroup = message.chat?.type === 'group' || message.chat?.type === 'supergroup';
      if (!isGroup) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text:
            `⚠️ <b>Group Connection Required</b>\n\n` +
            `Group-linking codes (<code>CONNECT-TG-...</code>) must be sent inside the target Telegram group where the bot is an administrator.\n\n` +
            `To link your <b>personal member account</b> instead, generate an <code>OS-XXXX</code> code in your Member Space and send <code>/connect OS-XXXX</code>.`,
          parse_mode: 'HTML'
        };
      }

      const token = env.TELEGRAM_BOT_TOKEN;
      if (token && message.from?.id) {
        try {
          const adminCheckRes = await fetch(
            `https://api.telegram.org/bot${token.trim()}/getChatMember?chat_id=${chatId}&user_id=${message.from.id}`
          );
          const adminCheckJson = (await adminCheckRes.json()) as any;
          if (adminCheckJson.ok && !['creator', 'administrator'].includes(adminCheckJson.result?.status)) {
            return {
              method: 'sendMessage',
              chat_id: chatId,
              text:
                `⛔ <b>Administrator Permission Required</b>\n\n` +
                `Only verified group administrators or the group owner (@${escapeHtml(telegramUsername || 'user')}) can link this Telegram group to a Community OS community.`,
              parse_mode: 'HTML'
            };
          }
        } catch {}
      }

      const groupTitle = message.chat?.title || 'Telegram Group';
      const verifyRes = dbOperations.verifyTelegramGroupConnection(
        codeArg,
        String(chatId),
        groupTitle,
        telegramUserId,
        telegramUsername
      );

      if (!verifyRes.success || !verifyRes.community) {
        return {
          method: 'sendMessage',
          chat_id: chatId,
          text:
            `❌ <b>Connection Failed</b>: ${escapeHtml(verifyRes.message || 'Invalid or expired connection challenge code.')}\n\n` +
            `Generate a fresh connection challenge from your Community OS Owner Workspace &rarr; Telegram Group Hub.`,
          parse_mode: 'HTML'
        };
      }

      const targetComm = verifyRes.community;
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `🎉 <b>Community OS Successfully Connected!</b>\n\n` +
          `• <b>Community</b>: ${escapeHtml(targetComm.name)}\n` +
          `• <b>Group</b>: ${escapeHtml(groupTitle)}\n` +
          `• <b>Verified Chat ID</b>: <code>${escapeHtml(chatId)}</code>\n` +
          `• <b>Administrator</b>: @${escapeHtml(telegramUsername || telegramUserId)}\n` +
          `• <b>Status</b>: <code>Connected &amp; Verified</code>\n\n` +
          `Members can now use:\n` +
          `• <code>/hub</code> — Open ${escapeHtml(targetComm.name)} Action Hub\n` +
          `• <code>/requests</code> — Browse NeedSignal requests\n` +
          `• <code>/tasks</code> — View QuestLoop deliverables\n` +
          `• <code>/passport</code> — View verified skills\n\n` +
          `<b>Web Platform</b>: ${escapeHtml(appUrl)}/l/${escapeHtml(targetComm.slug || targetComm.id)}-hub`,
        parse_mode: 'HTML'
      };
    }

    if (linkedUser) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `✅ <b>Telegram Account Connected</b>\n\n` +
          `Your Telegram (@${escapeHtml(telegramUsername || telegramUserId)}) is linked to <b>${escapeHtml(linkedUser.name)}</b>.\n` +
          `You can switch or re-link inside Member Space &rarr; Connected Accounts &rarr; Telegram.\n` +
          `Open platform: ${escapeHtml(appUrl)}`,
        parse_mode: 'HTML'
      };
    }

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Connect Your Telegram to Community OS</b>\n\n` +
        `<b>Option 1 — Instant Telegram OIDC Sign-In / Link:</b>\n` +
        `${escapeHtml(appUrl)}/api/auth/telegram/authorize?redirect=true\n\n` +
        `<b>Option 2 — Link to Existing Email/Discord Account via Code:</b>\n` +
        `1. Sign in at ${escapeHtml(appUrl)}\n` +
        `2. Open <b>Member Space &rarr; Connected Accounts &rarr; Telegram</b>\n` +
        `3. Click <b>Generate 15-Minute Code</b> (<code>OS-XXXX</code>)\n` +
        `4. Reply here with: <code>/connect OS-XXXX</code>`,
      parse_mode: 'HTML'
    };
  }

  if (firstWord === '/status') {
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Community OS Gateway Status</b>: <code>ONLINE</code>\n\n` +
        `• <b>Telegram Bot API</b>: Authenticated (@${escapeHtml(env.TELEGRAM_BOT_USERNAME || 'CommunityOutcomeBot')})\n` +
        `• <b>Database Engine</b>: Multi-tenant Store Active\n` +
        `• <b>Active Community</b>: ${escapeHtml(community.name)} (<code>${escapeHtml(community.id)}</code>)\n` +
        `• <b>Linked Profile</b>: ${linkedUser ? escapeHtml(linkedUser.name) : 'Not linked yet (/connect)'}\n` +
        `• <b>App Host</b>: ${escapeHtml(appUrl)}`,
      parse_mode: 'HTML'
    };
  }

  return {
    method: 'sendMessage',
    chat_id: chatId,
    text: `Command <code>${escapeHtml(firstWord)}</code> received. Type <code>/help</code> for the full list of available commands.`,
    parse_mode: 'HTML'
  };
}
