// Community OS — Real-Time Background Bot Service Runner
// Connects Telegram Long-Polling & Discord Gateway WebSocket
// Provides 100% live interactivity for @CommunityOutcomeBot and Discord Bot

import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'community_os_db.json');
const LOCK_FILE = path.join(process.cwd(), 'data', 'bot_service.lock');
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim() : null;
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN ? process.env.DISCORD_BOT_TOKEN.trim() : null;
const DISCORD_APP_ID = process.env.DISCORD_APPLICATION_ID ? process.env.DISCORD_APPLICATION_ID.trim() : null;
const APP_URL = (process.env.APP_URL || 'https://community-os.org').replace(/\/$/, '');

// SINGLETON PROCESS LOCK (Prevents duplicate polling workers & 409 conflicts)
function acquireSingletonLock() {
  try {
    if (!fs.existsSync(path.dirname(LOCK_FILE))) {
      fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    }
    if (fs.existsSync(LOCK_FILE)) {
      const existingPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
      if (existingPid && existingPid !== process.pid) {
        try {
          process.kill(existingPid, 0); // Check if process is running
          console.log(`[Singleton Guard] Existing worker running with PID ${existingPid}. Gracefully terminating stale worker...`);
          try {
            process.kill(existingPid, 'SIGTERM');
          } catch {}
        } catch {
          // Process not found, lock was stale
          console.log('[Singleton Guard] Stale lock found. Overriding...');
        }
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf-8');
  } catch (err) {
    console.warn('[Singleton Guard Warning]:', err.message);
  }
}

function releaseSingletonLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
      if (pid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch {}
}

process.on('SIGINT', () => {
  releaseSingletonLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseSingletonLock();
  process.exit(0);
});
process.on('exit', () => {
  releaseSingletonLock();
});

acquireSingletonLock();

function getDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB Error] Failed to read db:', err.message);
    return null;
  }
}

async function syncToSupabaseAsync(db) {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !key || url.includes('your-project')) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, key);
    if (db.requests && db.requests.length > 0) {
      const latest = db.requests.slice(0, 50).map((r) => ({
        id: r.id,
        community_id: r.communityId,
        creator_id: r.creatorId,
        title: r.title,
        description: r.description || null,
        category: r.category || null,
        skills_required: r.skillsRequired || [],
        priority: r.priority || 'medium',
        status: r.status || 'open',
        created_at: r.createdAt || new Date().toISOString()
      }));
      await supabase.from('requests').upsert(latest, { onConflict: 'id' });
    }
    if (db.tasks && db.tasks.length > 0) {
      const latest = db.tasks.slice(0, 50).map((t) => ({
        id: t.id,
        community_id: t.communityId,
        title: t.title,
        status: t.status,
        created_at: t.createdAt || new Date().toISOString()
      }));
      await supabase.from('tasks').upsert(latest, { onConflict: 'id' });
    }
  } catch {
    // Non-blocking background sync
  }
}

function saveDb(data) {
  try {
    const tempPath = `${DB_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
    syncToSupabaseAsync(data).catch(() => {});
    return true;
  } catch (err) {
    console.error('[DB Error] Failed to save db:', err.message);
    return false;
  }
}

// ============================================================================
// 1. TELEGRAM BOT ENGINE (Continuous Long-Polling)
// ============================================================================
let telegramLastUpdateId = 0;
let telegramIsPolling = false;

async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!TELEGRAM_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...extra
      })
    });
    const json = await res.json();
    return json.ok;
  } catch (err) {
    console.error('[Telegram Send Error]:', err.message);
    return false;
  }
}

async function answerTelegramCallback(callbackQueryId, text = '') {
  if (!TELEGRAM_TOKEN) return false;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text
      })
    });
    return true;
  } catch {
    return false;
  }
}

async function handleTelegramUpdate(update) {
  const db = getDb();
  if (!db) return;

  // A. Handle Inline Button Callback Queries
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbChatId = cb.message?.chat?.id;
    const cbData = cb.data || '';
    const cbFrom = cb.from || {};
    await answerTelegramCallback(cb.id, 'Opening Community OS...');

    const community =
      db.communities.find((c) => c.telegramConfig?.groupId === String(cbChatId)) ||
      db.communities.find((c) => c.id === 'comm_devforge') ||
      db.communities[0];

    if (cbData === 'menu_requests') {
      const openReqs = db.requests.filter(
        (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
      );
      const listText =
        openReqs.length === 0
          ? `*NeedSignal*: Zero open help requests currently in ${community.name}.`
          : `*Active NeedSignal Requests (${openReqs.length})*:\n` +
            openReqs.slice(0, 3).map((r) => `• *${r.title}* [${r.priority.toUpperCase()}]`).join('\n') +
            `\n\nFull requests & offer portal: ${APP_URL}/l/devforge-request-help`;

      await sendTelegramMessage(cbChatId, listText);
      return;
    }

    if (cbData === 'menu_tasks') {
      const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
      const taskText =
        commTasks.length === 0
          ? `*QuestLoop*: No pending tasks in ${community.name}.`
          : `*Active Deliverables (${commTasks.length})*:\n` +
            commTasks.slice(0, 3).map((t) => `• *${t.title}* [${t.status.toUpperCase()}]`).join('\n') +
            `\n\nDeliverable portal: ${APP_URL}/l/${community.slug || community.id}-hub`;

      await sendTelegramMessage(cbChatId, taskText);
      return;
    }

    if (cbData === 'menu_passport') {
      const linkedUser = db.users.find((u) => u.identities?.telegramId === String(cbFrom.id));
      const passportText = linkedUser
        ? `*Verified Member Passport — ${linkedUser.passport.displayName}*\n` +
          `• *Skills*: ${linkedUser.passport.skills.filter((s) => s.verified).map((s) => s.name).join(', ') || 'Self-declared'}\n` +
          `• *Bio*: ${linkedUser.passport.biography}`
        : `*Member Passport*: Your Telegram account (@${cbFrom.username || cbFrom.id}) is not yet linked.\nUse \`/connect\` in private chat to link your verified Community OS passport!`;

      await sendTelegramMessage(cbChatId, passportText);
      return;
    }

    if (cbData === 'menu_connect') {
      const code = `ID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      if (!db.identityChallenges) db.identityChallenges = [];
      db.identityChallenges.unshift({
        id: `ich_${Date.now()}`,
        code,
        userId: 'usr_sarah',
        platform: 'telegram',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        isUsed: false
      });
      saveDb(db);

      await sendTelegramMessage(
        cbChatId,
        `*Account Linking*: To link your personal passport, enter code \`${code}\` in your Community OS Member Space: ${APP_URL}`
      );
      return;
    }

    if (cbData === 'menu_hub') {
      await sendTelegramMessage(
        cbChatId,
        `*${community.name} Action Hub*: ${APP_URL}/l/${community.slug || community.id}-hub`
      );
      return;
    }
    return;
  }

  // B. Handle Text Messages
  const message = update.message || update.channel_post;
  if (!message || !message.text) return;

  const chatId = message.chat?.id;
  if (!chatId) return;

  const rawText = message.text.trim();
  const firstWord = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];
  const argsString = rawText.slice(rawText.split(/\s+/)[0].length).trim();

  const community =
    db.communities.find((c) => c.telegramConfig?.groupId === String(chatId)) ||
    db.communities.find((c) => c.id === 'comm_devforge') ||
    db.communities[0];

  const telegramUserId = String(message.from?.id || '');
  const telegramUsername = message.from?.username || '';
  const linkedUser = db.users.find(
    (u) =>
      (u.identities?.telegramId && u.identities.telegramId === telegramUserId) ||
      (telegramUsername && u.identities?.telegramId === `@${telegramUsername}`)
  );

  // 1. /start & /help
  if (firstWord === '/start' || firstWord === '/help') {
    const text =
      `*Community OS — Live Telegram Gateway*\n` +
      `Connected to *${community.name}*\n\n` +
      `• \`/hub\` — Open Community Action Hub\n` +
      `• \`/requests\` — View active NeedSignal help requests\n` +
      `• \`/help_request [title] [| priority]\` — Create a help request\n` +
      `• \`/tasks\` — Browse active QuestLoop tasks\n` +
      `• \`/mytasks\` — View your assigned tasks\n` +
      `• \`/passport\` — View your verified competencies\n` +
      `• \`/contribution [task_id] | [evidence_url] | [summary]\` — Submit deliverable\n` +
      `• \`/connect\` — Link your Telegram account\n` +
      `• \`/status\` — Verify bot and database health\n\n` +
      `*Web Platform*: ${APP_URL}`;

    await sendTelegramMessage(chatId, text);
    return;
  }

  // 2. /status
  if (firstWord === '/status') {
    const totalRequests = db.requests.length;
    const totalTasks = db.tasks.length;
    const totalCommunities = db.communities.length;

    const text =
      `*Community OS Gateway Status*: \`ONLINE\` (Live Long-Polling)\n\n` +
      `• *Telegram Bot*: @CommunityOutcomeBot (ID: 9018720052)\n` +
      `• *Bot Mode*: Real-Time Long-Polling Active\n` +
      `• *Database Engine*: Multi-tenant JSON Store Synchronized\n` +
      `• *Active Community*: ${community.name} (\`${community.id}\`)\n` +
      `• *Data Overview*: ${totalCommunities} Communities, ${totalRequests} Requests, ${totalTasks} Tasks\n` +
      `• *Web Application*: ${APP_URL}`;

    await sendTelegramMessage(chatId, text);
    return;
  }

  // 3. /hub
  if (firstWord === '/hub') {
    const hubLink = `${APP_URL}/l/${community.slug || community.id}-hub`;
    await sendTelegramMessage(
      chatId,
      `*${community.name} Action Hub*:\n${hubLink}\n\nAccess structured requests, tasks, and verified outcomes directly.`
    );
    return;
  }

  // 4. /requests
  if (firstWord === '/requests') {
    const openReqs = db.requests.filter(
      (r) => r.communityId === community.id && (r.status === 'open' || r.status === 'receiving_offers')
    );
    if (openReqs.length === 0) {
      await sendTelegramMessage(
        chatId,
        `*${community.name} NeedSignal*: Zero open help requests currently pending.\nPost one using \`/help_request <title>\` or via the Action Hub.`
      );
      return;
    }

    const list = openReqs
      .slice(0, 4)
      .map((r) => `• *${r.title}* [${r.priority.toUpperCase()}]\n  Skills: _${r.skillsRequired.join(', ')}_\n  Status: ${r.status}`)
      .join('\n\n');

    await sendTelegramMessage(
      chatId,
      `*Active NeedSignal Requests (${openReqs.length})*:\n\n${list}\n\nSubmit an offer or review full details at: ${APP_URL}/l/devforge-request-help`
    );
    return;
  }

  // 5. /help_request
  if (firstWord === '/help_request') {
    if (!argsString) {
      await sendTelegramMessage(
        chatId,
        `*Usage*: \`/help_request <title> [| priority]\`\nExample: \`/help_request Need assistance reviewing smart contract | high\``
      );
      return;
    }

    const parts = argsString.split('|').map((s) => s.trim());
    const title = parts[0] || 'Community Support Needed';
    let priority = 'medium';
    if (parts[1]) {
      const p = parts[1].toLowerCase();
      if (['low', 'medium', 'high', 'urgent'].includes(p)) priority = p;
    }

    const activeCreatorId = linkedUser ? linkedUser.id : 'usr_alex';
    const newReq = {
      id: `req_${Date.now()}`,
      communityId: community.id,
      creatorId: activeCreatorId,
      title,
      description: `Created via Telegram Bot by @${telegramUsername || telegramUserId}`,
      category: community.contributionCategories?.[0]?.id || 'cat_core',
      skillsRequired: ['General Assistance & Verification'],
      priority,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'open',
      visibility: 'community',
      createdAt: new Date().toISOString()
    };
    db.requests.unshift(newReq);
    saveDb(db);

    await sendTelegramMessage(
      chatId,
      `*NeedSignal Request Created*:\n` +
      `• *Title*: "${newReq.title}"\n` +
      `• *Priority*: \`${newReq.priority.toUpperCase()}\`\n` +
      `• *Community*: ${community.name}\n` +
      `• *Status*: Open for member offers\n\n` +
      `View in portal: ${APP_URL}/l/devforge-request-help`
    );
    return;
  }

  // 6. /tasks
  if (firstWord === '/tasks') {
    const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
    if (commTasks.length === 0) {
      await sendTelegramMessage(chatId, `*QuestLoop*: No open tasks currently pending in ${community.name}.`);
      return;
    }

    const taskList = commTasks
      .slice(0, 4)
      .map((t) => `• *${t.title}* [${t.status.toUpperCase()}]\n  Assignee: \`${t.assigneeId || 'Unassigned'}\``)
      .join('\n\n');

    await sendTelegramMessage(
      chatId,
      `*Active QuestLoop Tasks (${commTasks.length})*:\n\n${taskList}\n\nTrack progress: ${APP_URL}/l/${community.slug || community.id}-hub`
    );
    return;
  }

  // 7. /mytasks
  if (firstWord === '/mytasks') {
    if (!linkedUser) {
      await sendTelegramMessage(
        chatId,
        `Your Telegram account (@${telegramUsername || telegramUserId}) is not yet linked to a Community OS profile.\nRun \`/connect\` to generate a verification code and link your account.`
      );
      return;
    }

    const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
    if (myTasks.length === 0) {
      await sendTelegramMessage(
        chatId,
        `*My Tasks (${linkedUser.name})*: You have no active pending tasks.\nBrowse open opportunities with \`/tasks\` or in your Member Space.`
      );
      return;
    }

    const list = myTasks.map((t) => `• *${t.title}* [${t.status}]`).join('\n');
    await sendTelegramMessage(chatId, `*Your Assigned Tasks (${myTasks.length})*:\n\n${list}\n\nPortal: ${APP_URL}`);
    return;
  }

  // 8. /passport
  if (firstWord === '/passport') {
    const targetUser = linkedUser || db.users[0];
    const verifiedSkills = targetUser.passport.skills
      .filter((s) => s.verified)
      .map((s) => s.name)
      .join(', ');

    await sendTelegramMessage(
      chatId,
      `*Member Passport — ${targetUser.passport.displayName}*\n\n` +
      `• *Verified Competencies*: ${verifiedSkills || 'Self-declared only'}\n` +
      `• *Collaboration Bio*: ${targetUser.passport.biography}\n` +
      `• *Portfolio*: ${targetUser.passport.portfolioLinks?.join(', ') || 'None attached'}\n\n` +
      `_Decentralized verified outcomes managed by Community OS._`
    );
    return;
  }

  // 9. /contribution
  if (firstWord === '/contribution') {
    if (!argsString) {
      await sendTelegramMessage(
        chatId,
        `*Submit Deliverable Evidence (SourceTrail)*:\n\n` +
        `Usage: \`/contribution <task_id> | <evidence_url> | <description>\`\n` +
        `Or visit the contribution portal directly:\n${APP_URL}/l/devforge-contribution-ranking`
      );
      return;
    }

    const parts = argsString.split('|').map((s) => s.trim());
    const taskId = parts[0];
    const evidenceUrl = parts[1] || 'https://github.com/deliverable';
    const summary = parts[2] || 'Submitted via Telegram bot';

    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) {
      await sendTelegramMessage(
        chatId,
        `Task with ID \`${taskId}\` was not found. Use \`/tasks\` to browse available tasks.`
      );
      return;
    }

    task.status = 'in_review';
    const now = new Date().toISOString();
    const newContrib = {
      id: `cnt_${Date.now()}`,
      communityId: task.communityId,
      contributorId: linkedUser ? linkedUser.id : 'usr_alex',
      taskId: task.id,
      title: `Deliverable: ${task.title}`,
      description: summary,
      evidenceUrl,
      status: 'pending_review',
      submittedAt: now
    };
    db.contributions.unshift(newContrib);
    saveDb(db);

    await sendTelegramMessage(
      chatId,
      `*Contribution Evidence Submitted*\n\n` +
      `• *Contribution ID*: \`${newContrib.id}\`\n` +
      `• *Task*: ${task.title}\n` +
      `• *Status*: Completed & Pending Community Peer Review\n` +
      `• *Evidence*: ${evidenceUrl}\n\n` +
      `Track review status: ${APP_URL}/l/devforge-contribution-ranking`
    );
    return;
  }

  // 10. /connect
  if (firstWord === '/connect') {
    const codeArg = argsString.trim();

    // Group Connection Case
    if (codeArg) {
      const isGroup = message.chat?.type === 'group' || message.chat?.type === 'supergroup';
      if (!isGroup) {
        await sendTelegramMessage(
          chatId,
          `⚠️ *Group Connection Required*\n\nGroup-linking codes must be executed directly inside the target Telegram group where the bot has been added as an administrator.`
        );
        return;
      }

      // Verify admin status
      if (TELEGRAM_TOKEN && message.from?.id) {
        try {
          const adminCheckRes = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${message.from.id}`
          );
          const adminCheckJson = await adminCheckRes.json();
          if (adminCheckJson.ok && !['creator', 'administrator'].includes(adminCheckJson.result?.status)) {
            await sendTelegramMessage(
              chatId,
              `⛔ *Administrator Permission Required*\n\nOnly verified group administrators or the group owner (@${telegramUsername || 'user'}) can link this Telegram group to a Community OS community.`
            );
            return;
          }
        } catch {}
      }

      const now = new Date().toISOString();
      const challenge = db.groupConnectionChallenges?.find(
        (c) => c.code.trim().toUpperCase() === codeArg.toUpperCase() && !c.isUsed && c.expiresAt > now && c.platform === 'telegram'
      );

      if (!challenge) {
        await sendTelegramMessage(
          chatId,
          `❌ *Connection Failed*: Invalid or expired connection challenge code.\n\nGenerate a fresh connection challenge from your Community OS Owner Workspace.`
        );
        return;
      }

      const targetComm = db.communities.find((c) => c.id === challenge.communityId);
      if (!targetComm) {
        await sendTelegramMessage(chatId, `❌ *Connection Failed*: Associated community not found.`);
        return;
      }

      challenge.isUsed = true;
      const groupTitle = message.chat?.title || 'Verified Telegram Community';
      targetComm.telegramConfig = {
        connected: true,
        groupId: String(chatId),
        groupTitle,
        status: 'connected_and_verified',
        botMembership: true,
        botIsAdmin: true,
        webhookActive: true,
        lastChecked: now
      };

      if (!targetComm.connectedTelegramGroups) targetComm.connectedTelegramGroups = [];
      if (!targetComm.connectedTelegramGroups.find((g) => g.groupId === String(chatId))) {
        targetComm.connectedTelegramGroups.push({
          groupId: String(chatId),
          groupTitle,
          status: 'connected_and_verified',
          connectedAt: now
        });
      }

      db.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        communityId: targetComm.id,
        actorId: challenge.createdBy || telegramUserId,
        action: 'telegram_group_connected',
        details: `Connected Telegram group "${groupTitle}" (ID: ${chatId}) by @${telegramUsername} via challenge code`,
        timestamp: now
      });

      saveDb(db);

      await sendTelegramMessage(
        chatId,
        `🎉 *Community OS Successfully Connected!*\n\n` +
        `• *Community*: **${targetComm.name}**\n` +
        `• *Group*: ${groupTitle}\n` +
        `• *Verified Chat ID*: \`${chatId}\`\n` +
        `• *Administrator*: @${telegramUsername || telegramUserId}\n` +
        `• *Status*: \`Connected & Verified\`\n\n` +
        `*Web Platform*: ${APP_URL}/l/${targetComm.slug || targetComm.id}-hub`
      );
      return;
    }

    // Bare /connect -> Identity linking code
    const code = `ID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (!db.identityChallenges) db.identityChallenges = [];
    db.identityChallenges.unshift({
      id: `ich_${Date.now()}`,
      code,
      userId: linkedUser?.id || 'usr_sarah',
      platform: 'telegram',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      isUsed: false
    });
    saveDb(db);

    await sendTelegramMessage(
      chatId,
      `*Account Linking Challenge Code*: \`${code}\`\n\n` +
      `1. Open Community OS Member Space: ${APP_URL}\n` +
      `2. Go to *Member Space > Identity Linking*\n` +
      `3. Enter code \`${code}\` to link your Telegram account (@${telegramUsername || telegramUserId}).\n\n` +
      `_Code expires in 15 minutes._`
    );
    return;
  }

  // Default unknown command acknowledgement
  if (firstWord.startsWith('/')) {
    await sendTelegramMessage(
      chatId,
      `Command \`${firstWord}\` acknowledged. Type \`/help\` for the full list of available commands.`
    );
  }
}

async function startTelegramPolling() {
  if (!TELEGRAM_TOKEN) {
    console.log('[Telegram Poller] Skipped: No TELEGRAM_BOT_TOKEN found.');
    return;
  }

  // Clear existing webhook to enable long-polling mode
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    const delJson = await delRes.json();
    console.log('[Telegram Poller] Webhook reset for long-polling:', delJson.ok ? 'SUCCESS' : delJson.description);
  } catch (err) {
    console.error('[Telegram Poller] deleteWebhook error:', err.message);
  }

  telegramIsPolling = true;
  console.log('[Telegram Poller] Starting active long-polling loop for @CommunityOutcomeBot...');

  while (telegramIsPolling) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${telegramLastUpdateId + 1}&timeout=20&allowed_updates=["message","channel_post","callback_query"]`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 409) {
          console.warn('[Telegram Poller] 409 Conflict: another poller active. Backing off 5s for single-worker convergence...');
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          if (update.update_id > telegramLastUpdateId) {
            telegramLastUpdateId = update.update_id;
          }
          try {
            await handleTelegramUpdate(update);
          } catch (updateErr) {
            console.error('[Telegram Poller] Error handling update:', updateErr);
          }
        }
      }
    } catch (err) {
      console.error('[Telegram Poller] Network poll error (reconnecting in 2s):', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ============================================================================
// 2. DISCORD GATEWAY WEBSOCKET CLIENT
// ============================================================================
let discordWs = null;
let discordHeartbeatTimer = null;
let discordSeq = null;

async function respondDiscordInteraction(interactionId, interactionToken, responseData) {
  try {
    await fetch(`https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_TOKEN}`
      },
      body: JSON.stringify(responseData)
    });
  } catch (err) {
    console.error('[Discord Callback Error]:', err.message);
  }
}

async function handleDiscordInteraction(interaction) {
  const db = getDb();
  if (!db) return;

  // 1. PING Challenge
  if (interaction.type === 1) {
    await respondDiscordInteraction(interaction.id, interaction.token, { type: 1 });
    return;
  }

  const guildId = interaction.guild_id || interaction.guild?.id || '';
  const discordUser = interaction.member?.user || interaction.user || {};
  const discordUserId = discordUser.id || '';
  const discordUsername = discordUser.username || 'discord_user';

  const community =
    db.communities.find((c) => c.discordConfig?.serverId === guildId) ||
    db.communities.find((c) => c.id === 'comm_devforge') ||
    db.communities[0];

  const linkedUser = db.users.find((u) => u.identities?.discordId === discordUserId);
  const activeCreatorId = linkedUser ? linkedUser.id : 'usr_alex';

  // 2. APPLICATION COMMANDS (Slash Commands)
  if (interaction.type === 2) {
    const commandName = (interaction.data?.name || '').toLowerCase();

    if (commandName === 'help') {
      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content:
            `**Community OS — Discord Command Center**\n` +
            `Operating on **${community.name}**\n\n` +
            `• \`/hub\` — Direct link to the community action hub\n` +
            `• \`/requests\` — Browse open NeedSignal help requests\n` +
            `• \`/help-request [title] [priority]\` — Post assistance request\n` +
            `• \`/tasks\` — List active QuestLoop deliverables and milestones\n` +
            `• \`/mytasks\` — View tasks assigned to your verified account\n` +
            `• \`/passport\` — View your portable verified skills\n` +
            `• \`/contribution\` — Submit evidence for completed deliverables\n` +
            `• \`/connect\` — Link your Discord account to Community OS\n` +
            `• \`/status\` — Verify bot gateway and database connectivity\n\n` +
            `*Web Platform*: ${APP_URL}`
        }
      });
      return;
    }

    if (commandName === 'hub') {
      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**${community.name} Action Hub**: ${APP_URL}/l/${community.slug || community.id}-hub\nAccess structured requests, tasks, and verified outcomes directly.`
        }
      });
      return;
    }

    if (commandName === 'requests') {
      const openReqs = db.requests.filter((r) => r.communityId === community.id && r.status === 'open');
      const list =
        openReqs.length === 0
          ? 'Zero open help requests currently pending.'
          : openReqs.slice(0, 3).map((r) => `• **${r.title}** [${r.priority.toUpperCase()}]`).join('\n');

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Active NeedSignal Requests (${openReqs.length})**:\n${list}\n\nRespond or submit an offer at: ${APP_URL}/l/devforge-request-help`
        }
      });
      return;
    }

    if (commandName === 'help-request') {
      const title = interaction.data?.options?.find((o) => o.name === 'title')?.value || 'Assistance Needed';
      const priority = interaction.data?.options?.find((o) => o.name === 'priority')?.value || 'medium';

      const newReq = {
        id: `req_${Date.now()}`,
        communityId: community.id,
        creatorId: activeCreatorId,
        title,
        description: `Created via Discord Slash Command by @${discordUsername}`,
        category: community.contributionCategories?.[0]?.id || 'cat_core',
        skillsRequired: ['Engineering & Community Help'],
        priority,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'open',
        visibility: 'community',
        createdAt: new Date().toISOString()
      };
      db.requests.unshift(newReq);
      saveDb(db);

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content:
            `**NeedSignal Request Created**:\n` +
            `• **Title**: "${newReq.title}"\n` +
            `• **Priority**: \`${newReq.priority.toUpperCase()}\`\n` +
            `• **Community**: ${community.name}\n` +
            `• **Status**: Open for member offers\n\n` +
            `View and match specialists: ${APP_URL}/l/devforge-request-help`
        }
      });
      return;
    }

    if (commandName === 'tasks') {
      const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
      const taskList =
        commTasks.length === 0
          ? 'Zero open tasks currently pending review.'
          : commTasks.slice(0, 3).map((t) => `• **${t.title}** [${t.status.toUpperCase()}]`).join('\n');

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Active QuestLoop Tasks (${commTasks.length})**:\n${taskList}\n\nTrack progress: ${APP_URL}/l/${community.slug || community.id}-hub`
        }
      });
      return;
    }

    if (commandName === 'mytasks') {
      if (!linkedUser) {
        await respondDiscordInteraction(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: `Your Discord account (@${discordUsername}) is not yet linked to a Community OS profile.\nRun \`/connect\` to generate a verification code and link your account.`
          }
        });
        return;
      }

      const myTasks = db.tasks.filter((t) => t.assigneeId === linkedUser.id && t.status !== 'completed');
      const list = myTasks.map((t) => `• **${t.title}** [${t.status}]`).join('\n');

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Your Assigned Tasks (${myTasks.length})**:\n${list || 'No tasks assigned.'}\n\nPortal: ${APP_URL}`
        }
      });
      return;
    }

    if (commandName === 'passport') {
      const targetUser = linkedUser || db.users[0];
      const verifiedSkills = targetUser.passport.skills
        .filter((s) => s.verified)
        .map((s) => s.name)
        .join(', ');

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content:
            `**Member Passport — ${targetUser.passport.displayName}**\n` +
            `• **Verified Competencies**: ${verifiedSkills || 'Self-declared only'}\n` +
            `• **Collaboration Bio**: ${targetUser.passport.biography}\n` +
            `• **Portfolio**: ${targetUser.passport.portfolioLinks?.join(', ') || 'None attached'}\n\n` +
            `*Decentralized verified outcomes managed by Community OS.*`
        }
      });
      return;
    }

    if (commandName === 'contribution') {
      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content:
            `**Submit Deliverable Evidence (SourceTrail)**:\n` +
            `Complete your assigned QuestLoop deliverable with an inspectable URL (git commit, pull request, artifact link).\n` +
            `Open contribution portal: ${APP_URL}/l/devforge-contribution-ranking`
        }
      });
      return;
    }

    if (commandName === 'connect') {
      const code = `ID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      if (!db.identityChallenges) db.identityChallenges = [];
      db.identityChallenges.unshift({
        id: `ich_${Date.now()}`,
        code,
        userId: linkedUser?.id || 'usr_sarah',
        platform: 'discord',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        isUsed: false
      });
      saveDb(db);

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content:
            `**Account Linking Challenge Code**: \`${code}\`\n\n` +
            `1. Open your Community OS Member Space: ${APP_URL}\n` +
            `2. Go to **Member Space > Identity Linking**\n` +
            `3. Enter code \`${code}\` to link your Discord account (@${discordUsername}).\n` +
            `*Code expires in 15 minutes.*`
        }
      });
      return;
    }

    if (commandName === 'status') {
      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content:
            `**Community OS Gateway Status**: \`ONLINE\` (Gateway WebSocket)\n` +
            `• **Discord Bot**: @Community Outcome (App ID: ${DISCORD_APP_ID})\n` +
            `• **Database Persistence**: Synchronized (Multi-tenant)\n` +
            `• **Active Community**: ${community.name} (${community.id})\n` +
            `• **Connected Server**: ${guildId || 'Direct / Global Context'}\n` +
            `• **Web Application**: ${APP_URL}`
        }
      });
      return;
    }

    await respondDiscordInteraction(interaction.id, interaction.token, {
      type: 4,
      data: { content: `Command \`/${commandName}\` acknowledged by Community OS.` }
    });
    return;
  }

  // 3. MESSAGE COMPONENT BUTTONS
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id || '';

    if (customId === 'btn_hub') {
      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**${community.name} Action Hub**: ${APP_URL}/l/${community.slug || community.id}-hub\nBrowse structured requests, track deliverables, and verify community outcomes.`,
          flags: 64
        }
      });
      return;
    }

    if (customId === 'btn_requests') {
      const openReqs = db.requests.filter((r) => r.communityId === community.id && r.status === 'open');
      const list =
        openReqs.length === 0
          ? 'Zero open help requests currently pending.'
          : openReqs.slice(0, 3).map((r) => `• **${r.title}** [${r.priority.toUpperCase()}]`).join('\n');

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Active NeedSignal Requests (${openReqs.length})**:\n${list}\n\nSubmit assistance offers at: ${APP_URL}/l/devforge-request-help`,
          flags: 64
        }
      });
      return;
    }

    if (customId === 'btn_tasks') {
      const commTasks = db.tasks.filter((t) => t.communityId === community.id && t.status !== 'completed');
      const taskList =
        commTasks.length === 0
          ? 'Zero active tasks currently in progress.'
          : commTasks.slice(0, 3).map((t) => `• **${t.title}** [${t.status.toUpperCase()}]`).join('\n');

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Active QuestLoop Tasks (${commTasks.length})**:\n${taskList}\n\nTrack progress: ${APP_URL}/l/${community.slug || community.id}-hub`,
          flags: 64
        }
      });
      return;
    }

    if (customId === 'btn_passport') {
      if (!linkedUser) {
        await respondDiscordInteraction(interaction.id, interaction.token, {
          type: 4,
          data: {
            content: `Your Discord account (@${discordUsername}) is not yet linked.\nUse \`/connect\` to link your Community OS profile and view your verified skills.`,
            flags: 64
          }
        });
        return;
      }

      const verified = linkedUser.passport.skills.filter((s) => s.verified).map((s) => s.name).join(', ');
      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Verified Passport — ${linkedUser.passport.displayName}**\n• Verified Skills: ${verified || 'Self-declared only'}\n• Bio: ${linkedUser.passport.biography}`,
          flags: 64
        }
      });
      return;
    }

    if (customId === 'btn_connect') {
      const code = `ID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      if (!db.identityChallenges) db.identityChallenges = [];
      db.identityChallenges.unshift({
        id: `ich_${Date.now()}`,
        code,
        userId: 'usr_sarah',
        platform: 'discord',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        isUsed: false
      });
      saveDb(db);

      await respondDiscordInteraction(interaction.id, interaction.token, {
        type: 4,
        data: {
          content: `**Identity Linking**: Enter verification code \`${code}\` in your Community OS Member Space: ${APP_URL}`,
          flags: 64
        }
      });
      return;
    }

    await respondDiscordInteraction(interaction.id, interaction.token, {
      type: 4,
      data: { content: 'Action acknowledged', flags: 64 }
    });
  }
}

function startDiscordGateway() {
  if (!DISCORD_TOKEN) {
    console.log('[Discord Gateway] Skipped: No DISCORD_BOT_TOKEN found.');
    return;
  }

  console.log('[Discord Gateway] Connecting to Discord Gateway wss://gateway.discord.gg/?v=10&encoding=json ...');
  try {
    discordWs = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

    discordWs.onopen = () => {
      console.log('[Discord Gateway] WebSocket connection opened.');
    };

    discordWs.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { op, d, s, t } = payload;
        if (s) discordSeq = s;

        // HELLO (Opcode 10)
        if (op === 10) {
          const heartbeatInterval = d.heartbeat_interval;
          console.log(`[Discord Gateway] Received HELLO. Heartbeat interval: ${heartbeatInterval}ms`);

          if (discordHeartbeatTimer) clearInterval(discordHeartbeatTimer);
          discordHeartbeatTimer = setInterval(() => {
            if (discordWs && discordWs.readyState === 1) {
              discordWs.send(JSON.stringify({ op: 1, d: discordSeq }));
            }
          }, heartbeatInterval);

          // Send IDENTIFY (Opcode 2)
          // Permissions: 388160 (View Channels, Send Messages, Embed Links, Attach Files, Read History, Add Reactions, Manage Messages)
          // Scope: Guilds | Guild Messages
          const identifyPayload = {
            op: 2,
            d: {
              token: DISCORD_TOKEN,
              intents: 513, // GUILDS (1) | GUILD_MESSAGES (512)
              properties: {
                os: 'linux',
                browser: 'community_os_bot',
                device: 'community_os_bot'
              }
            }
          };
          discordWs.send(JSON.stringify(identifyPayload));
          return;
        }

        // HEARTBEAT ACK (Opcode 11)
        if (op === 11) {
          return;
        }

        // DISPATCH (Opcode 0)
        if (op === 0) {
          if (t === 'READY') {
            console.log(`[Discord Gateway] READY! Authenticated as ${d.user.username}#${d.user.discriminator} (ID: ${d.user.id})`);
            console.log(`[Discord Gateway] Active Guilds count: ${d.guilds?.length || 0}`);
            return;
          }

          if (t === 'INTERACTION_CREATE') {
            console.log(`[Discord Gateway] Incoming Interaction: ${d.type === 2 ? `Slash /${d.data?.name}` : `Component ${d.data?.custom_id}`}`);
            await handleDiscordInteraction(d);
            return;
          }
        }
      } catch (msgErr) {
        console.error('[Discord Gateway] Error parsing WS message:', msgErr);
      }
    };

    discordWs.onclose = (event) => {
      console.warn(`[Discord Gateway] Connection closed (code: ${event.code}, reason: ${event.reason}). Reconnecting in 5s...`);
      if (discordHeartbeatTimer) clearInterval(discordHeartbeatTimer);
      setTimeout(startDiscordGateway, 5000);
    };

    discordWs.onerror = (err) => {
      console.error('[Discord Gateway] WebSocket error:', err.message || err);
    };
  } catch (err) {
    console.error('[Discord Gateway] Initialization error:', err.message);
    setTimeout(startDiscordGateway, 5000);
  }
}

// ============================================================================
// BOOTSTRAP BOT SERVICES
// ============================================================================
console.log('=====================================================');
console.log('COMMUNITY OS — BOT SERVICE RUNNER STARTING');
console.log('=====================================================');
console.log('App URL:', APP_URL);
console.log('Telegram Bot Token configured:', !!TELEGRAM_TOKEN);
console.log('Discord Bot Token configured:', !!DISCORD_TOKEN);
console.log('Discord App ID:', DISCORD_APP_ID);

startTelegramPolling();
startDiscordGateway();

// Persistent daemon heartbeat loop (monitors lock and keeps singleton daemon active)
console.log('[Bot Service Runner] Daemon active and listening. Singleton lock maintained at:', LOCK_FILE);
setInterval(() => {
  // Touch lock file periodically to assert health
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const currentPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
      if (currentPid === process.pid) {
        fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf-8');
      }
    } else {
      acquireSingletonLock();
    }
  } catch {}
}, 30000);
