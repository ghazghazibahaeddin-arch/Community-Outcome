// Community OS — Shared Telegram Bot Command & Interactive Button Processor
// Synchronizes all Telegram commands & inline callback buttons directly with the central store & Supabase.
import { dbOperations, ensureDatabaseHydrated, getCommunityHubSlug, getDatabase } from '@/lib/db/store';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { CloudflareEnv } from '@/lib/env';

// Deduplicate Telegram update retries
const recentUpdateIds = new Set<number>();
const MAX_RECENT_UPDATES = 2000;

export const TELEGRAM_BOT_COMMANDS = [
  { command: 'start', description: 'Open Community OS interactive menu' },
  { command: 'help', description: 'View all commands and quick actions' },
  { command: 'hub', description: 'Open live Community Action Hub' },
  { command: 'requests', description: 'Browse & offer help on NeedSignal requests' },
  { command: 'help_request', description: 'Create a help request (title | priority)' },
  { command: 'tasks', description: 'Browse & claim QuestLoop tasks' },
  { command: 'mytasks', description: 'Manage & complete your assigned tasks' },
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

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:b|strong|i|em|code|pre|u|s|a)(?:\s+[^>]*)?>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rarr;/g, '->')
    .replace(/&quot;/g, '"');
}

function clampTelegramText(text: string, maxLen = 4000): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 24)}\n\n…(truncated)`;
}

function shortLabel(text: string, maxLen = 28): string {
  const clean = String(text || '').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1)}…`;
}

function buildMainMenuKeyboard(communityName: string, hubLink: string) {
  const isHttps = hubLink.startsWith('https://');
  return {
    inline_keyboard: [
      ...(isHttps ? [[{ text: `🚀 Open ${shortLabel(communityName, 22)} Hub`, url: hubLink }]] : []),
      [
        { text: '🆘 Open Requests', callback_data: 'menu_requests' },
        { text: '📋 QuestLoop Tasks', callback_data: 'menu_tasks' }
      ],
      [
        { text: '🎯 My Tasks', callback_data: 'menu_mytasks' },
        { text: '🎖️ My Passport', callback_data: 'menu_passport' }
      ],
      [
        { text: '➕ New Request', callback_data: 'menu_new_request' },
        { text: '⚡ Link Profile', callback_data: 'menu_connect' }
      ]
    ]
  };
}

function buildNavFooter(hubLink: string, refreshCallback?: string) {
  const row: any[] = [];
  if (refreshCallback) {
    row.push({ text: '🔄 Refresh', callback_data: refreshCallback });
  }
  row.push({ text: '🏠 Main Menu', callback_data: 'menu_home' });
  const rows: any[][] = [row];
  if (hubLink.startsWith('https://')) {
    rows.push([{ text: '🌐 Open Synced Web Hub', url: hubLink }]);
  }
  return rows;
}

export async function dispatchTelegramReply(
  token: string,
  reply: TelegramReplyPayload
): Promise<{ sent: boolean; messageId?: number; error?: string }> {
  if (!token || reply.method !== 'sendMessage' || reply.chat_id === undefined || reply.chat_id === null || !reply.text) {
    return { sent: false };
  }
  const safeText = clampTelegramText(reply.text);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: reply.chat_id,
        text: safeText,
        parse_mode: reply.parse_mode || 'HTML',
        ...(reply.reply_markup ? { reply_markup: reply.reply_markup } : {})
      })
    });
    const json = (await res.json()) as any;
    if (json.ok) {
      return { sent: true, messageId: json.result?.message_id };
    }

    const errDesc = String(json.description || '');
    if (
      errDesc.includes('parse entities') ||
      errDesc.includes('WEBPAGE_URL_INVALID') ||
      errDesc.includes('Wrong HTTP URL') ||
      errDesc.includes('inline keyboard')
    ) {
      const plainText = clampTelegramText(stripHtmlToPlainText(safeText));
      const fallbackRes = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: reply.chat_id,
          text: plainText
        })
      });
      const fallbackJson = (await fallbackRes.json()) as any;
      if (fallbackJson.ok) {
        return { sent: true, messageId: fallbackJson.result?.message_id };
      }
      return { sent: false, error: fallbackJson.description || errDesc };
    }

    return { sent: false, error: errDesc || 'Telegram API rejected sendMessage' };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'Failed to send Telegram reply' };
  }
}

export async function processTelegramUpdate(rawBody: any, env: CloudflareEnv): Promise<TelegramReplyPayload> {
  const updateId = typeof rawBody?.update_id === 'number' ? rawBody.update_id : null;
  if (updateId !== null && recentUpdateIds.has(updateId)) {
    return { ok: true, duplicate: true };
  }

  const reply = await buildTelegramReply(rawBody, env);
  if (updateId !== null) {
    recentUpdateIds.add(updateId);
    if (recentUpdateIds.size > MAX_RECENT_UPDATES) {
      const firstEntry = recentUpdateIds.values().next().value;
      if (firstEntry !== undefined) recentUpdateIds.delete(firstEntry);
    }
  }
  return reply;
}

async function answerCallback(token: string | undefined, callbackId: string | undefined, text: string) {
  if (!token || !callbackId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token.trim()}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId, text })
    });
  } catch {}
}

async function buildTelegramReply(rawBody: any, env: CloudflareEnv): Promise<TelegramReplyPayload> {
  // 1. Handle Inline Button Callback Queries
  if (rawBody?.callback_query) {
    const cb = rawBody.callback_query;
    const cbChatId = cb.message?.chat?.id;
    const cbData = String(cb.data || '');
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

    const hubSlug = getCommunityHubSlug(community, db.links);
    const hubLink = `${appUrl}/l/${hubSlug}`;
    const cbUid = String(cbFrom.id || '');
    const cbUsername = cbFrom.username || '';
    const cbDisplayName = [cbFrom.first_name, cbFrom.last_name].filter(Boolean).join(' ') || cbUsername || `tg_${cbUid}`;
    const linkedUser = db.users.find(
      (u) =>
        (u.identities?.telegramId && u.identities.telegramId === cbUid) ||
        (cbUsername && u.identities?.telegramUsername?.toLowerCase() === cbUsername.toLowerCase()) ||
        (cbUsername && u.identities?.telegramId === `@${cbUsername}`)
    );

    if (cbChatId === undefined || cbChatId === null) {
      await answerCallback(token, cb.id, 'Done');
      return { ok: true };
    }

    // Home Menu
    if (cbData === 'menu_home') {
      await answerCallback(token, cb.id, 'Main menu');
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Community OS — ${escapeHtml(community.name)}</b>\n` +
          `Everything here stays synced in real time with the Web platform.\n\n` +
          `Choose an action below:`,
        parse_mode: 'HTML',
        reply_markup: buildMainMenuKeyboard(community.name, hubLink)
      };
    }

    // New Request Guide
    if (cbData === 'menu_new_request') {
      await answerCallback(token, cb.id, 'New Request guide');
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Create a NeedSignal Help Request</b>\n\n` +
          `Send a command right here and it will appear instantly on the Web platform:\n` +
          `<code>/help_request Fix payment webhook | high</code>\n\n` +
          `Priorities: <code>low</code>, <code>medium</code>, <code>high</code>, <code>urgent</code>`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
      };
    }

    // Requests List with Direct "Offer Help" Buttons
    if (cbData === 'menu_requests') {
      await answerCallback(token, cb.id, 'Loading open requests...');
      const openReqs = db.requests.filter(
        (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
      );
      if (openReqs.length === 0) {
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `<b>NeedSignal (${escapeHtml(community.name)})</b>: Zero open help requests right now.\n\nCreate one with <code>/help_request Title | high</code>.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_requests') }
        };
      }

      const topReqs = openReqs.slice(0, 4);
      const listText = topReqs
        .map(
          (r, idx) =>
            `${idx + 1}. <b>${escapeHtml(r.title)}</b> [${escapeHtml(r.priority.toUpperCase())}]\n   Status: <code>${escapeHtml(r.status)}</code>`
        )
        .join('\n\n');

      const offerButtons = topReqs.map((r) => [
        { text: `🤝 Offer Help: ${shortLabel(r.title, 26)}`, callback_data: `offer_req:${r.id}` }
      ]);

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Active NeedSignal Requests (${openReqs.length})</b>\n\n` +
          `${listText}\n\n` +
          `Tap a button below to submit an offer directly from Telegram (synced live to Web):`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [...offerButtons, ...buildNavFooter(hubLink, 'menu_requests')]
        }
      };
    }

    // Direct Offer Help on a Request from Telegram
    if (cbData.startsWith('offer_req:')) {
      const reqId = cbData.slice('offer_req:'.length).trim();
      const targetReq = db.requests.find((r) => r.id === reqId);
      if (!targetReq) {
        await answerCallback(token, cb.id, 'Request no longer open');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `This NeedSignal request could not be found or was removed.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_requests') }
        };
      }

      if (!linkedUser) {
        await answerCallback(token, cb.id, 'Link your account first');
        const authUrl = `${appUrl}/api/auth/telegram/authorize?redirect=true`;
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `<b>Link Account to Offer Help</b>\n\n` +
            `Link your Telegram (@${escapeHtml(cbDisplayName)}) once so your offer appears under your real Member Profile on the platform:\n` +
            `• Tap the button below to sign in &amp; auto-link\n` +
            `• Or send <code>/connect OS-XXXX</code> from Member Space`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              ...(authUrl.startsWith('https://') ? [[{ text: '⚡ Sign In & Link Telegram', url: authUrl }]] : []),
              [{ text: '🔙 Back to Requests', callback_data: 'menu_requests' }, { text: '🏠 Main Menu', callback_data: 'menu_home' }]
            ]
          }
        };
      }

      if (targetReq.status === 'in_progress' || targetReq.status === 'completed') {
        await answerCallback(token, cb.id, 'Request already assigned');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `ℹ️ <b>Request Already In Progress</b>\n\n` +
            `<b>${escapeHtml(targetReq.title)}</b> has already been assigned to a contributor and is no longer accepting new offers.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_requests') }
        };
      }

      const isSuspended = db.memberships?.some(
        (m) => m.communityId === targetReq.communityId && m.userId === linkedUser.id && m.moderationStatus === 'suspended'
      );
      if (isSuspended) {
        await answerCallback(token, cb.id, 'Membership suspended');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `⛔ Your membership in <b>${escapeHtml(community.name)}</b> is currently suspended.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
        };
      }

      const existingOffer = db.offers.find(
        (o) => o.requestId === targetReq.id && o.memberId === linkedUser.id && o.status !== 'declined'
      );
      if (existingOffer) {
        await answerCallback(token, cb.id, 'Offer already active!');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `✅ <b>Offer Already Recorded</b>\n\n` +
            `You already submitted an active offer for <b>${escapeHtml(targetReq.title)}</b>.\n` +
            `Status: <code>${escapeHtml(existingOffer.status)}</code>`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_requests') }
        };
      }

      dbOperations.createOffer({
        requestId: targetReq.id,
        communityId: targetReq.communityId,
        memberId: linkedUser.id,
        proposedHelp: `Offered assistance directly via Telegram (@${cbDisplayName}). Ready to collaborate and deliver.`,
        skills: linkedUser.passport.skills.map((s) => s.name).slice(0, 3),
        experienceDescription: linkedUser.passport.biography || 'Community contributor via Telegram',
        availability: 'Available immediately via Telegram & Web',
        estimatedHours: 4,
        portfolioLinks: linkedUser.passport.portfolioLinks || []
      });

      await answerCallback(token, cb.id, 'Offer submitted & synced!');
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `✅ <b>Offer Submitted &amp; Synced!</b>\n\n` +
          `• <b>Request</b>: ${escapeHtml(targetReq.title)}\n` +
          `• <b>Contributor</b>: ${escapeHtml(linkedUser.name)}\n` +
          `• <b>Request Status</b>: <code>${escapeHtml(targetReq.status)}</code>\n\n` +
          `Your offer is now live on the Web platform for the owner to accept.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_requests') }
      };
    }

    // Tasks List with Direct "Claim Task" & "Submit Deliverable" Buttons
    if (cbData === 'menu_tasks') {
      await answerCallback(token, cb.id, 'Loading tasks...');
      const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
      if (commTasks.length === 0) {
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `<b>QuestLoop (${escapeHtml(community.name)})</b>: No pending tasks right now.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_tasks') }
        };
      }

      const topTasks = commTasks.slice(0, 4);
      const taskText = topTasks
        .map((t, idx) => {
          const assigneeName = t.assigneeId
            ? db.users.find((u) => u.id === t.assigneeId)?.name || t.assigneeId
            : 'Open Bounty';
          return `${idx + 1}. <b>${escapeHtml(t.title)}</b> [${escapeHtml(t.status.toUpperCase())}]\n   Assignee: <code>${escapeHtml(assigneeName)}</code>`;
        })
        .join('\n\n');

      const taskButtons: any[][] = [];
      for (const t of topTasks) {
        if (!t.assigneeId) {
          taskButtons.push([{ text: `✋ Claim: ${shortLabel(t.title, 28)}`, callback_data: `claim_task:${t.id}` }]);
        } else if (linkedUser && t.assigneeId === linkedUser.id) {
          taskButtons.push([{ text: `✅ Complete: ${shortLabel(t.title, 25)}`, callback_data: `complete_task:${t.id}` }]);
        }
      }

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Active QuestLoop Tasks (${commTasks.length})</b>\n\n` +
          `${taskText}\n\n` +
          `Claim open tasks or complete your assigned work directly below:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [...taskButtons, ...buildNavFooter(hubLink, 'menu_tasks')]
        }
      };
    }

    // My Tasks Menu
    if (cbData === 'menu_mytasks') {
      if (!linkedUser) {
        await answerCallback(token, cb.id, 'Account not linked');
        const authUrl = `${appUrl}/api/auth/telegram/authorize?redirect=true`;
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `<b>My Tasks</b>: Link your Telegram account (@${escapeHtml(cbDisplayName)}) to see and complete tasks assigned to you.\n\n` +
            `Send <code>/connect OS-XXXX</code> or sign in with 1 tap below:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              ...(authUrl.startsWith('https://') ? [[{ text: '⚡ Sign In & Link Telegram', url: authUrl }]] : []),
              ...buildNavFooter(hubLink)
            ]
          }
        };
      }

      await answerCallback(token, cb.id, 'Loading your tasks...');
      const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
      if (myTasks.length === 0) {
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `<b>My Tasks (${escapeHtml(linkedUser.name)})</b>\n\n` +
            `You have no active pending tasks right now. Tap <b>QuestLoop Tasks</b> to claim an open bounty!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Browse Open Tasks', callback_data: 'menu_tasks' }],
              ...buildNavFooter(hubLink, 'menu_mytasks')
            ]
          }
        };
      }

      const topMine = myTasks.slice(0, 4);
      const list = topMine
        .map((t, i) => `${i + 1}. <b>${escapeHtml(t.title)}</b> [<code>${escapeHtml(t.status)}</code>]`)
        .join('\n');
      const completeButtons = topMine.map((t) => [
        { text: `✅ Mark Delivered: ${shortLabel(t.title, 22)}`, callback_data: `complete_task:${t.id}` }
      ]);

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Your Assigned Tasks (${myTasks.length})</b>\n\n` +
          `${list}\n\n` +
          `Tap a task below to submit completion immediately (or use <code>/contribution task_id | url | note</code>):`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [...completeButtons, ...buildNavFooter(hubLink, 'menu_mytasks')]
        }
      };
    }

    // Direct Claim Task
    if (cbData.startsWith('claim_task:')) {
      const taskId = cbData.slice('claim_task:'.length).trim();
      if (!linkedUser) {
        await answerCallback(token, cb.id, 'Link account first');
        const authUrl = `${appUrl}/api/auth/telegram/authorize?redirect=true`;
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `<b>Link Account to Claim Task</b>\n\n` +
            `Link your Telegram (@${escapeHtml(cbDisplayName)}) once to claim tasks under your Member Passport:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              ...(authUrl.startsWith('https://') ? [[{ text: '⚡ Sign In & Link Telegram', url: authUrl }]] : []),
              [{ text: '🔙 Back to Tasks', callback_data: 'menu_tasks' }, { text: '🏠 Main Menu', callback_data: 'menu_home' }]
            ]
          }
        };
      }

      const claimed = dbOperations.claimTask(taskId, linkedUser.id);
      if (!claimed || (claimed as any).error) {
        await answerCallback(token, cb.id, 'Already claimed or unavailable');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `⚠️ ${(claimed as any)?.error || 'Task was not found or already claimed.'}`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_tasks') }
        };
      }

      await answerCallback(token, cb.id, 'Task claimed & synced!');
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `✋ <b>Task Claimed &amp; Synced!</b>\n\n` +
          `• <b>Task</b>: ${escapeHtml((claimed as any).title)}\n` +
          `• <b>Assignee</b>: ${escapeHtml(linkedUser.name)}\n` +
          `• <b>Status</b>: <code>in_progress</code>\n\n` +
          `Your active commitment is live on the Web platform. When ready, tap below to mark it delivered:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Mark Delivered Now', callback_data: `complete_task:${taskId}` }],
            [{ text: '🎯 My Tasks', callback_data: 'menu_mytasks' }, { text: '🏠 Main Menu', callback_data: 'menu_home' }]
          ]
        }
      };
    }

    // Direct Complete Task
    if (cbData.startsWith('complete_task:')) {
      const taskId = cbData.slice('complete_task:'.length).trim();
      if (!linkedUser) {
        await answerCallback(token, cb.id, 'Link account first');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `Link your Telegram account first via <code>/connect OS-XXXX</code> to submit deliverables.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
        };
      }

      const targetTask = db.tasks.find((t) => t.id === taskId);
      if (!targetTask) {
        await answerCallback(token, cb.id, 'Task not found');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `Task <code>${escapeHtml(taskId)}</code> was not found.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_mytasks') }
        };
      }
      if (targetTask.status === 'completed') {
        await answerCallback(token, cb.id, 'Already completed!');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `✅ <b>Already Delivered</b>\n\nTask <b>${escapeHtml(targetTask.title)}</b> was already marked as completed.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_mytasks') }
        };
      }
      if (targetTask.assigneeId && targetTask.assigneeId !== linkedUser.id) {
        await answerCallback(token, cb.id, 'Assigned to another member');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `⛔ This task is assigned to another contributor.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_tasks') }
        };
      }

      const res = dbOperations.completeTaskWithEvidence(
        taskId,
        hubLink,
        `Delivered directly from Telegram Bot by ${linkedUser.name} (@${cbDisplayName})`,
        linkedUser.id
      );

      if (!res) {
        await answerCallback(token, cb.id, 'Task not found');
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `Task <code>${escapeHtml(taskId)}</code> was not found.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_mytasks') }
        };
      }

      await answerCallback(token, cb.id, 'Deliverable submitted!');
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `🎉 <b>Deliverable Submitted &amp; Synced!</b>\n\n` +
          `• <b>Task</b>: ${escapeHtml(res.task.title)}\n` +
          `• <b>Contribution ID</b>: <code>${escapeHtml(res.contribution.id)}</code>\n` +
          `• <b>Status</b>: Pending Peer Review in Web Workspace\n\n` +
          `To attach a custom GitHub/URL proof instead, send:\n<code>/contribution ${escapeHtml(taskId)} | https://your-proof-url | summary</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 My Tasks', callback_data: 'menu_mytasks' }, { text: '🎖️ My Passport', callback_data: 'menu_passport' }],
            ...buildNavFooter(hubLink)
          ]
        }
      };
    }

    // Passport View
    if (cbData === 'menu_passport') {
      await answerCallback(token, cb.id, 'Loading passport...');
      const authUrl = `${appUrl}/api/auth/telegram/authorize?redirect=true`;
      const passportText = linkedUser
        ? `<b>Verified Member Passport — ${escapeHtml(linkedUser.passport.displayName)}</b>\n\n` +
          `• <b>Verified Skills</b>: ${escapeHtml(linkedUser.passport.skills.filter((s) => s.verified).map((s) => s.name).join(', ') || 'Self-declared')}\n` +
          `• <b>Bio</b>: ${escapeHtml(linkedUser.passport.biography)}`
        : `<b>Member Passport</b>: Your Telegram account (@${escapeHtml(cbDisplayName)}) is not linked yet.\n` +
          `Tap below to sign in &amp; link instantly, or send <code>/connect OS-XXXX</code>.`;

      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text: passportText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...(!linkedUser && authUrl.startsWith('https://') ? [[{ text: '⚡ Sign In & Link Telegram', url: authUrl }]] : []),
            [{ text: '🎯 My Tasks', callback_data: 'menu_mytasks' }],
            ...buildNavFooter(hubLink, 'menu_passport')
          ]
        }
      };
    }

    // Connect Profile View
    if (cbData === 'menu_connect') {
      await answerCallback(token, cb.id, linkedUser ? 'Account linked' : 'Link options');
      if (linkedUser) {
        return {
          method: 'sendMessage',
          chat_id: cbChatId,
          text:
            `✅ <b>Already Linked &amp; Synced</b>\n\n` +
            `Your Telegram account (@${escapeHtml(cbDisplayName)}) is linked to <b>${escapeHtml(linkedUser.name)}</b>.\n` +
            `All buttons and commands sync directly with your Web account.`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
        };
      }
      const authUrl = `${appUrl}/api/auth/telegram/authorize?redirect=true`;
      return {
        method: 'sendMessage',
        chat_id: cbChatId,
        text:
          `<b>Link Your Community OS Profile</b>\n\n` +
          `1. <b>One-Click Telegram Sign-In / Link</b>:\n${escapeHtml(authUrl)}\n\n` +
          `2. <b>Or Link Existing Web Account via Code</b>:\n` +
          `Open Member Space &rarr; Connected Accounts &rarr; Telegram, generate an <code>OS-XXXX</code> code, and send <code>/connect OS-XXXX</code> here.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...(authUrl.startsWith('https://') ? [[{ text: '⚡ One-Click Telegram Link', url: authUrl }]] : []),
            ...buildNavFooter(hubLink)
          ]
        }
      };
    }

    await answerCallback(token, cb.id, 'Done');
    return { ok: true };
  }

  // 2. Handle Text Commands
  const message = rawBody?.message || rawBody?.channel_post;
  if (!message || !message.text) {
    return { ok: true };
  }

  const chatId = message.chat?.id;
  if (chatId === undefined || chatId === null) {
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

  const hubSlug = getCommunityHubSlug(community, db.links);
  const hubLink = `${appUrl}/l/${hubSlug}`;

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
      `<b>Community OS — Interactive Command Center</b>\n` +
      `Operating on <b>${escapeHtml(community.name)}</b>\n\n` +
      `Use the live buttons below to browse &amp; act directly from Telegram, or use commands:\n` +
      `• <code>/hub</code> — Open Community Action Hub\n` +
      `• <code>/requests</code> — Browse &amp; offer help on open requests\n` +
      `• <code>/help_request title | priority</code> — Create a help request\n` +
      `• <code>/tasks</code> — Browse &amp; claim QuestLoop tasks\n` +
      `• <code>/mytasks</code> — Manage &amp; complete your assigned tasks\n` +
      `• <code>/passport</code> — View your verified competencies\n` +
      `• <code>/contribution task_id | evidence_url | summary</code> — Submit deliverable\n` +
      `• <code>/connect OS-XXXX</code> — Link your personal Member account\n` +
      `• <code>/connect CONNECT-TG-XXXX</code> — Link a Telegram Group (Group Admin)\n` +
      `• <code>/status</code> — Verify bot and database health`;

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: buildMainMenuKeyboard(community.name, hubLink)
    };
  }

  if (firstWord === '/hub') {
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>${escapeHtml(community.name)} Action Hub</b>:\n${escapeHtml(hubLink)}\n\nTap below to open the synced interactive Hub or act directly in Telegram:`,
      parse_mode: 'HTML',
      reply_markup: buildMainMenuKeyboard(community.name, hubLink)
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
        text: `<b>${escapeHtml(community.name)} NeedSignal</b>: Zero open help requests currently pending.\nPost one using <code>/help_request Title | high</code> or via the Action Hub.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_requests') }
      };
    }

    const topReqs = openReqs.slice(0, 4);
    const list = topReqs
      .map(
        (r, i) =>
          `${i + 1}. <b>${escapeHtml(r.title)}</b> [${escapeHtml(r.priority.toUpperCase())}]\n   Skills: <i>${escapeHtml(r.skillsRequired.join(', '))}</i>\n   Status: <code>${escapeHtml(r.status)}</code>`
      )
      .join('\n\n');
    const offerButtons = topReqs.map((r) => [
      { text: `🤝 Offer Help: ${shortLabel(r.title, 26)}`, callback_data: `offer_req:${r.id}` }
    ]);

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>Active NeedSignal Requests (${openReqs.length})</b>:\n\n${list}\n\nTap any request below to offer help directly:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...offerButtons, ...buildNavFooter(hubLink, 'menu_requests')]
      }
    };
  }

  if (firstWord === '/help_request') {
    if (!argsString) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>Usage</b>: <code>/help_request title | priority</code>\nExample: <code>/help_request Need assistance reviewing smart contract | high</code>`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
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

    const activeCreatorId = linkedUser ? linkedUser.id : (db.users[0]?.id || 'usr_alex');
    if (
      linkedUser &&
      db.memberships?.some(
        (m) => m.communityId === community.id && m.userId === linkedUser.id && m.moderationStatus === 'suspended'
      )
    ) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `⛔ Suspended members cannot create help requests in <b>${escapeHtml(community.name)}</b>.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
      };
    }
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
        `<b>NeedSignal Request Created &amp; Synced</b>:\n` +
        `• <b>Title</b>: "${escapeHtml(newReq.title)}"\n` +
        `• <b>Priority</b>: <code>${escapeHtml(newReq.priority.toUpperCase())}</code>\n` +
        `• <b>Community</b>: ${escapeHtml(community.name)}\n` +
        `• <b>Status</b>: Open for member offers`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🆘 View All Requests', callback_data: 'menu_requests' }],
          ...buildNavFooter(hubLink)
        ]
      }
    };
  }

  if (firstWord === '/tasks') {
    const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
    if (commTasks.length === 0) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>QuestLoop</b>: No open tasks currently pending in ${escapeHtml(community.name)}.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_tasks') }
      };
    }

    const topTasks = commTasks.slice(0, 4);
    const taskList = topTasks
      .map(
        (t, i) =>
          `${i + 1}. <b>${escapeHtml(t.title)}</b> [${escapeHtml(t.status.toUpperCase())}]\n   ID: <code>${escapeHtml(t.id)}</code> | Assignee: <code>${escapeHtml(t.assigneeId || 'Unassigned')}</code>`
      )
      .join('\n\n');
    const taskButtons: any[][] = [];
    for (const t of topTasks) {
      if (!t.assigneeId) {
        taskButtons.push([{ text: `✋ Claim: ${shortLabel(t.title, 28)}`, callback_data: `claim_task:${t.id}` }]);
      } else if (linkedUser && t.assigneeId === linkedUser.id) {
        taskButtons.push([{ text: `✅ Complete: ${shortLabel(t.title, 25)}`, callback_data: `complete_task:${t.id}` }]);
      }
    }

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>Active QuestLoop Tasks (${commTasks.length})</b>:\n\n${taskList}\n\nTap a button below to claim or deliver:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...taskButtons, ...buildNavFooter(hubLink, 'menu_tasks')]
      }
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
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
      };
    }

    const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
    if (myTasks.length === 0) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `<b>My Tasks (${escapeHtml(linkedUser.name)})</b>: You have no active pending tasks.\nBrowse open opportunities with <code>/tasks</code>.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Browse Open Tasks', callback_data: 'menu_tasks' }],
            ...buildNavFooter(hubLink, 'menu_mytasks')
          ]
        }
      };
    }

    const topMine = myTasks.slice(0, 4);
    const list = topMine
      .map((t) => `• <b>${escapeHtml(t.title)}</b> [${escapeHtml(t.status)}] — Deadline: ${escapeHtml(new Date(t.deadline).toLocaleDateString())}`)
      .join('\n');
    const completeButtons = topMine.map((t) => [
      { text: `✅ Mark Delivered: ${shortLabel(t.title, 22)}`, callback_data: `complete_task:${t.id}` }
    ]);

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: `<b>Your Assigned Tasks (${myTasks.length})</b>:\n\n${list}\n\nTap a button below to complete immediately:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...completeButtons, ...buildNavFooter(hubLink, 'menu_mytasks')]
      }
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
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
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
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_passport') }
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
          `Or tap <b>My Tasks</b> below to submit with one tap:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 My Tasks', callback_data: 'menu_mytasks' }],
            ...buildNavFooter(hubLink)
          ]
        }
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
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_tasks') }
      };
    }
    if (task.status === 'completed') {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `✅ Task <b>${escapeHtml(task.title)}</b> was already completed and submitted for review.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_mytasks') }
      };
    }
    const actorUserId = linkedUser ? linkedUser.id : (db.users[0]?.id || 'usr_alex');
    if (task.assigneeId && task.assigneeId !== actorUserId) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text: `⛔ Task <code>${escapeHtml(task.id)}</code> is assigned to another contributor.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buildNavFooter(hubLink, 'menu_tasks') }
      };
    }

    const result = dbOperations.completeTaskWithEvidence(
      task.id,
      evidenceUrl,
      summary,
      actorUserId
    );
    const newContribution = result?.contribution;

    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Contribution Evidence Submitted &amp; Synced</b>\n\n` +
        `• <b>Contribution ID</b>: <code>${escapeHtml(newContribution?.id || 'pending')}</code>\n` +
        `• <b>Task</b>: ${escapeHtml(task.title)}\n` +
        `• <b>Status</b>: Completed &amp; Pending Community Peer Review\n` +
        `• <b>Evidence</b>: ${escapeHtml(evidenceUrl)}`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
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
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
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
          `All buttons (Offer Help, Claim Task, Complete, Passport) are now synced to your profile.`,
        parse_mode: 'HTML',
        reply_markup: buildMainMenuKeyboard(community.name, hubLink)
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
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buildNavFooter(hubLink) }
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
      const targetHubSlug = getCommunityHubSlug(targetComm, db.links);
      const targetHubLink = `${appUrl}/l/${targetHubSlug}`;
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `🎉 <b>Community OS Successfully Connected!</b>\n\n` +
          `• <b>Community</b>: ${escapeHtml(targetComm.name)}\n` +
          `• <b>Group</b>: ${escapeHtml(groupTitle)}\n` +
          `• <b>Verified Chat ID</b>: <code>${escapeHtml(chatId)}</code>\n` +
          `• <b>Administrator</b>: @${escapeHtml(telegramUsername || telegramUserId)}\n` +
          `• <b>Status</b>: <code>Connected &amp; Verified</code>`,
        parse_mode: 'HTML',
        reply_markup: buildMainMenuKeyboard(targetComm.name, targetHubLink)
      };
    }

    if (linkedUser) {
      return {
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `✅ <b>Telegram Account Connected</b>\n\n` +
          `Your Telegram (@${escapeHtml(telegramUsername || telegramUserId)}) is linked to <b>${escapeHtml(linkedUser.name)}</b>.`,
        parse_mode: 'HTML',
        reply_markup: buildMainMenuKeyboard(community.name, hubLink)
      };
    }

    const authUrl = `${appUrl}/api/auth/telegram/authorize?redirect=true`;
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Connect Your Telegram to Community OS</b>\n\n` +
        `<b>Option 1 — Instant Telegram OIDC Sign-In / Link:</b>\n` +
        `${escapeHtml(authUrl)}\n\n` +
        `<b>Option 2 — Link to Existing Email/Discord Account via Code:</b>\n` +
        `1. Sign in at ${escapeHtml(appUrl)}\n` +
        `2. Open <b>Member Space &rarr; Connected Accounts &rarr; Telegram</b>\n` +
        `3. Click <b>Generate 15-Minute Code</b> (<code>OS-XXXX</code>)\n` +
        `4. Reply here with: <code>/connect OS-XXXX</code>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          ...(authUrl.startsWith('https://') ? [[{ text: '⚡ One-Click Telegram Link', url: authUrl }]] : []),
          ...buildNavFooter(hubLink)
        ]
      }
    };
  }

  if (firstWord === '/status') {
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text:
        `<b>Community OS Gateway Status</b>: <code>ONLINE</code>\n\n` +
        `• <b>Telegram Bot API</b>: Authenticated (@${escapeHtml(env.TELEGRAM_BOT_USERNAME || 'CommunityOutcomeBot')})\n` +
        `• <b>Database Engine</b>: Multi-tenant Store + Supabase Sync Active\n` +
        `• <b>Active Community</b>: ${escapeHtml(community.name)} (<code>${escapeHtml(community.id)}</code>)\n` +
        `• <b>Linked Profile</b>: ${linkedUser ? escapeHtml(linkedUser.name) : 'Not linked yet (/connect)'}\n` +
        `• <b>Hub URL</b>: ${escapeHtml(hubLink)}`,
      parse_mode: 'HTML',
      reply_markup: buildMainMenuKeyboard(community.name, hubLink)
    };
  }

  return {
    method: 'sendMessage',
    chat_id: chatId,
    text: `Command <code>${escapeHtml(firstWord)}</code> received. Tap any button below or type <code>/help</code>.`,
    parse_mode: 'HTML',
    reply_markup: buildMainMenuKeyboard(community.name, hubLink)
  };
}
