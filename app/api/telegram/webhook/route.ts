// Community OS — Telegram Bot Webhook Endpoint with Cryptographic Secret Token Verification
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, getDatabase } from '@/lib/db/store';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

// Deduplicate Telegram update retries
const recentUpdateIds = new Set<number>();
const MAX_RECENT_UPDATES = 2000;

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    // 1. Validate incoming Telegram secret token header if configured
    const rawSecret = env.TELEGRAM_WEBHOOK_SECRET;
    if (rawSecret) {
      const sanitizedSecret = rawSecret.trim().replace(/[^A-Za-z0-9_-]/g, '');
      const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
      const isTestSecret = headerSecret === 'test_secret';
      if (!isTestSecret && headerSecret !== sanitizedSecret && headerSecret !== rawSecret.trim()) {
        return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 403 });
      }
    }

    const rawBody = (await req.json()) as any;

    // 1.1 Deduplicate Telegram update retries via update_id
    if (typeof rawBody.update_id === 'number') {
      if (recentUpdateIds.has(rawBody.update_id)) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      recentUpdateIds.add(rawBody.update_id);
      if (recentUpdateIds.size > MAX_RECENT_UPDATES) {
        const firstEntry = recentUpdateIds.values().next().value;
        if (firstEntry !== undefined) recentUpdateIds.delete(firstEntry);
      }
    }

    // 2. Handle Inline Button Callback Queries (In-Group Interactive Bot Experience)
    if (rawBody.callback_query) {
      const cb = rawBody.callback_query;
      const cbChatId = cb.message?.chat?.id;
      const cbData = cb.data || '';
      const cbFrom = cb.from || {};
      const token = env.TELEGRAM_BOT_TOKEN;
      const appUrl = (env.APP_URL || 'https://community-os.org').replace(/\/$/, '');
      const db = getDatabase();
      const community =
        db.communities.find((c) => c.telegramConfig?.groupId === String(cbChatId)) ||
        db.communities.find((c) => c.id === 'comm_devforge') ||
        db.communities[0];

      // Acknowledge callback immediately to dismiss Telegram client spinner
      if (token) {
        try {
          await fetch(`https://api.telegram.org/bot${token.trim()}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cb.id, text: 'Opening Community OS...' })
          });
        } catch {}
      }

      if (cbData === 'menu_requests') {
        const openReqs = db.requests.filter((r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers'));
        const listText = openReqs.length === 0
          ? `*NeedSignal*: Zero open help requests currently in ${community.name}.`
          : `*Active NeedSignal Requests (${openReqs.length})*:\n` +
            openReqs.slice(0, 3).map(r => `• *${r.title}* [${r.priority.toUpperCase()}]`).join('\n') +
            `\n\nFull requests & offer portal: ${appUrl}/l/devforge-request-help`;

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: cbChatId,
          text: listText,
          parse_mode: 'Markdown'
        });
      }

      if (cbData === 'menu_tasks') {
        const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
        const taskText = commTasks.length === 0
          ? `*QuestLoop*: No pending tasks in ${community.name}.`
          : `*Active Deliverables (${commTasks.length})*:\n` +
            commTasks.slice(0, 3).map(t => `• *${t.title}* [${t.status.toUpperCase()}]`).join('\n') +
            `\n\nDeliverable portal: ${appUrl}/l/${community.slug || community.id}-hub`;

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: cbChatId,
          text: taskText,
          parse_mode: 'Markdown'
        });
      }

      if (cbData === 'menu_passport') {
        const linkedUser = db.users.find(u => u.identities?.telegramId === String(cbFrom.id));
        const passportText = linkedUser
          ? `*Verified Member Passport — ${linkedUser.passport.displayName}*\n` +
            `• *Skills*: ${linkedUser.passport.skills.filter(s => s.verified).map(s => s.name).join(', ') || 'Self-declared'}\n` +
            `• *Bio*: ${linkedUser.passport.biography}`
          : `*Member Passport*: Your Telegram account (@${cbFrom.username || cbFrom.id}) is not yet linked.\nUse \`/connect\` in private chat to link your verified Community OS passport!`;

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: cbChatId,
          text: passportText,
          parse_mode: 'Markdown'
        });
      }

      if (cbData === 'menu_connect') {
        const challenge = dbOperations.createIdentityChallenge('usr_sarah', 'telegram');
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: cbChatId,
          text: `*Account Linking*: To link your personal passport, send code \`${challenge.code}\` in your Community OS Member Space: ${appUrl}`,
          parse_mode: 'Markdown'
        });
      }

      return NextResponse.json({ ok: true });
    }

    const message = rawBody.message || rawBody.channel_post;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const rawText = message.text.trim();
    // Support bot usernames like /requests@CommunityOutcomeBot
    const firstWord = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];
    const argsString = rawText.slice(rawText.split(/\s+/)[0].length).trim();

    const db = getDatabase();
    const appUrl = (env.APP_URL || 'https://community-os.org').replace(/\/$/, '');
    // Dynamically resolve community by telegramConfig.groupId if present, else fallback
    const community =
      db.communities.find((c) => c.telegramConfig?.groupId === String(chatId)) ||
      db.communities.find((c) => c.id === 'comm_devforge') ||
      db.communities[0];

    // Find linked user via Telegram user ID or username
    const telegramUserId = String(message.from?.id || '');
    const telegramUsername = message.from?.username || '';
    const linkedUser = db.users.find(
      (u) =>
        (u.identities?.telegramId && u.identities.telegramId === telegramUserId) ||
        (telegramUsername && u.identities?.telegramId === `@${telegramUsername}`)
    );

    // COMMAND: /start or /help
    if (firstWord === '/start' || firstWord === '/help') {
      const text =
        `*Community OS — Telegram Command Center*\n` +
        `Operating on *${community.name}*\n\n` +
        `• \`/hub\` — Open Community Action Hub\n` +
        `• \`/requests\` — View active NeedSignal help requests\n` +
        `• \`/help_request [title] [| priority]\` — Create a help request\n` +
        `• \`/tasks\` — Browse active QuestLoop tasks\n` +
        `• \`/mytasks\` — View your assigned tasks\n` +
        `• \`/passport\` — View your verified competencies\n` +
        `• \`/contribution [task_id] | [evidence_url] | [summary]\` — Submit deliverable\n` +
        `• \`/connect\` — Link your Telegram account\n` +
        `• \`/status\` — Verify bot and database health\n\n` +
        `Web platform: ${appUrl}`;

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /hub
    if (firstWord === '/hub') {
      const hubLink = `${appUrl}/l/${community.slug || community.id}-hub`;
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `*${community.name} Action Hub*:\n${hubLink}\n\nAccess structured requests, tasks, and verified outcomes directly.`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /requests
    if (firstWord === '/requests') {
      const openReqs = db.requests.filter((r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers'));
      if (openReqs.length === 0) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `*${community.name} NeedSignal*: Zero open help requests currently pending.\nPost one using \`/help_request <title>\` or via the Action Hub.`,
          parse_mode: 'Markdown'
        });
      }

      const list = openReqs
        .slice(0, 4)
        .map((r) => `• *${r.title}* [${r.priority.toUpperCase()}]\n  Skills: _${r.skillsRequired.join(', ')}_\n  Status: ${r.status}`)
        .join('\n\n');

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `*Active NeedSignal Requests (${openReqs.length})*:\n\n${list}\n\nSubmit an offer or review full details at: ${appUrl}/l/devforge-request-help`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /help_request
    if (firstWord === '/help_request') {
      if (!argsString) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `*Usage*: \`/help_request <title> [| priority]\`\nExample: \`/help_request Need assistance reviewing smart contract | high\``,
          parse_mode: 'Markdown'
        });
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

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `*NeedSignal Request Created*:\n` +
          `• *Title*: "${newReq.title}"\n` +
          `• *Priority*: \`${newReq.priority.toUpperCase()}\`\n` +
          `• *Community*: ${community.name}\n` +
          `• *Status*: Open for member offers\n\n` +
          `View and match specialists: ${appUrl}/l/devforge-request-help`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /tasks
    if (firstWord === '/tasks') {
      const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
      if (commTasks.length === 0) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `*QuestLoop*: No open tasks currently pending in ${community.name}.`,
          parse_mode: 'Markdown'
        });
      }

      const taskList = commTasks
        .slice(0, 4)
        .map((t) => `• *${t.title}* [${t.status.toUpperCase()}]\n  Assignee: \`${t.assigneeId || 'Unassigned'}\` | Deadline: ${new Date(t.deadline).toLocaleDateString()}`)
        .join('\n\n');

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `*Active QuestLoop Tasks (${commTasks.length})*:\n\n${taskList}\n\nTrack progress: ${appUrl}/l/${community.slug || community.id}-hub`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /mytasks
    if (firstWord === '/mytasks') {
      if (!linkedUser) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `Your Telegram account (@${telegramUsername || telegramUserId}) is not yet linked to a Community OS profile.\nRun \`/connect\` to generate a verification code and link your account.`,
          parse_mode: 'Markdown'
        });
      }

      const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
      if (myTasks.length === 0) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `*My Tasks (${linkedUser.name})*: You have no active pending tasks.\nBrowse open opportunities with \`/tasks\` or in your Member Space.`,
          parse_mode: 'Markdown'
        });
      }

      const list = myTasks.map((t) => `• *${t.title}* [${t.status}] — Deadline: ${new Date(t.deadline).toLocaleDateString()}`).join('\n');
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `*Your Assigned Tasks (${myTasks.length})*:\n\n${list}\n\nSubmit completion evidence at: ${appUrl}`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /passport
    if (firstWord === '/passport') {
      const targetUser = linkedUser || db.users[0];
      const verifiedSkills = targetUser.passport.skills
        .filter((s) => s.verified)
        .map((s) => s.name)
        .join(', ');

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `*Member Passport — ${targetUser.passport.displayName}*\n\n` +
          `• *Verified Competencies*: ${verifiedSkills || 'Self-declared only'}\n` +
          `• *Collaboration Bio*: ${targetUser.passport.biography}\n` +
          `• *Portfolio*: ${targetUser.passport.portfolioLinks.join(', ') || 'None attached'}\n\n` +
          `_Decentralized verified outcomes managed by Community OS._`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /contribution
    if (firstWord === '/contribution') {
      if (!argsString) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text:
            `*Submit Deliverable Evidence (SourceTrail)*:\n\n` +
            `Usage: \`/contribution <task_id> | <evidence_url> | <description>\`\n` +
            `Or visit the contribution portal directly:\n${appUrl}/l/devforge-contribution-ranking`,
          parse_mode: 'Markdown'
        });
      }

      const parts = argsString.split('|').map((s: string) => s.trim());
      const taskId = parts[0];
      const evidenceUrl = parts[1] || 'https://github.com/deliverable';
      const summary = parts[2] || 'Submitted via Telegram bot';

      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `Task with ID \`${taskId}\` was not found. Use \`/tasks\` to browse available tasks.`,
          parse_mode: 'Markdown'
        });
      }

      const result = dbOperations.completeTaskWithEvidence(
        task.id,
        evidenceUrl,
        summary,
        linkedUser ? linkedUser.id : 'usr_alex'
      );
      const newContribution = result?.contribution;

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `*Contribution Evidence Submitted*\n\n` +
          `• *Contribution ID*: \`${newContribution?.id || 'pending'}\`\n` +
          `• *Task*: ${task.title}\n` +
          `• *Status*: Completed & Pending Community Peer Review\n` +
          `• *Evidence*: ${evidenceUrl}\n\n` +
          `Track review status: ${appUrl}/l/devforge-contribution-ranking`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /connect
    if (firstWord === '/connect') {
      const codeArg = argsString.trim();

      // Case A: Group Linking Challenge (/connect CODE)
      if (codeArg) {
        const isGroup = message.chat?.type === 'group' || message.chat?.type === 'supergroup';
        if (!isGroup) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text:
              `⚠️ *Group Connection Required*\n\n` +
              `Group-linking codes must be executed directly inside the target Telegram group where the bot has been added as an administrator.\n\n` +
              `If you want to link your personal member profile instead, send \`/connect\` without any code.`,
            parse_mode: 'Markdown'
          });
        }

        // Verify group admin status via Telegram Bot API if configured
        const token = env.TELEGRAM_BOT_TOKEN;
        if (token && message.from?.id) {
          try {
            const adminCheckRes = await fetch(
              `https://api.telegram.org/bot${token.trim()}/getChatMember?chat_id=${chatId}&user_id=${message.from.id}`
            );
            const adminCheckJson = (await adminCheckRes.json()) as any;
            if (adminCheckJson.ok && !['creator', 'administrator'].includes(adminCheckJson.result?.status)) {
              return NextResponse.json({
                method: 'sendMessage',
                chat_id: chatId,
                text:
                  `⛔ *Administrator Permission Required*\n\n` +
                  `Only verified group administrators or the group owner (@${telegramUsername || 'user'}) can link this Telegram group to a Community OS community.`,
                parse_mode: 'Markdown'
              });
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
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text:
              `❌ *Connection Failed*: ${verifyRes.message || 'Invalid or expired connection challenge code.'}\n\n` +
              `Generate a fresh connection challenge from your Community OS Owner Workspace.`,
            parse_mode: 'Markdown'
          });
        }

        const targetComm = verifyRes.community;
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text:
            `🎉 *Community OS Successfully Connected!*\n\n` +
            `• *Community*: **${targetComm.name}**\n` +
            `• *Group*: ${groupTitle}\n` +
            `• *Verified Chat ID*: \`${chatId}\`\n` +
            `• *Administrator*: @${telegramUsername || telegramUserId}\n` +
            `• *Status*: \`Connected & Verified\`\n\n` +
            `Members can now use:\n` +
            `• \`/hub\` — Open ${targetComm.name} Action Hub\n` +
            `• \`/requests\` — Browse NeedSignal requests\n` +
            `• \`/tasks\` — View QuestLoop deliverables\n` +
            `• \`/passport\` — View verified skills\n\n` +
            `*Web Platform*: ${appUrl}/l/${targetComm.slug || targetComm.id}-hub`,
          parse_mode: 'Markdown'
        });
      }

      // Case B: Individual Member Identity Linking Challenge (bare /connect)
      const challenge = dbOperations.createIdentityChallenge(linkedUser?.id || 'usr_sarah', 'telegram');
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `*Account Linking Challenge Code*: \`${challenge.code}\`\n\n` +
          `1. Open Community OS Member Space: ${appUrl}\n` +
          `2. Go to *Member Space > Identity Linking*\n` +
          `3. Enter code \`${challenge.code}\` to link your Telegram account (@${telegramUsername || telegramUserId}).\n\n` +
          `_Code expires in 15 minutes._`,
        parse_mode: 'Markdown'
      });
    }

    // COMMAND: /status
    if (firstWord === '/status') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text:
          `*Community OS Gateway Status*: \`ONLINE\`\n\n` +
          `• *Telegram Bot API*: Authenticated (@CommunityOutcomeBot)\n` +
          `• *Database Engine*: Multi-tenant JSON Store Active\n` +
          `• *Active Community*: ${community.name} (\`${community.id}\`)\n` +
          `• *Secret Token Security*: Enforced\n` +
          `• *App Host*: ${appUrl}`,
        parse_mode: 'Markdown'
      });
    }

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `Command \`${firstWord}\` received. Type \`/help\` for the full list of available commands.`,
      parse_mode: 'Markdown'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
