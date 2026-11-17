// Community OS — Telegram Bot Live Polling & Command Sync Endpoint
// Allows Telegram bot to respond in real-time in local/sandbox dev when webhook URL is unset.
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnv } from '@/lib/env';
import {
  dispatchTelegramReply,
  processTelegramUpdate,
  syncTelegramBotCommands
} from '@/lib/services/telegramBotProcessor';

const globalPollState = globalThis as unknown as {
  __tgPollOffset?: number;
  __tgCommandsSynced?: boolean;
};

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, configured: false, error: 'TELEGRAM_BOT_TOKEN missing' }, { status: 400 });
  }

  try {
    const whRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`);
    const whJson = (await whRes.json()) as any;
    const webhookUrl = whJson.result?.url || '';
    const pendingCount = whJson.result?.pending_update_count || 0;

    return NextResponse.json({
      success: true,
      mode: webhookUrl ? 'webhook' : 'polling_ready',
      webhookUrl: webhookUrl || null,
      pendingUpdates: pendingCount,
      commandsSynced: Boolean(globalPollState.__tgCommandsSynced)
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Status lookup failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' }, { status: 400 });
  }

  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as { syncCommands?: boolean; limit?: number };
    let commandsResult: { ok: boolean; description?: string } | null = null;

    if (body.syncCommands !== false || !globalPollState.__tgCommandsSynced) {
      commandsResult = await syncTelegramBotCommands(token);
      if (commandsResult.ok) {
        globalPollState.__tgCommandsSynced = true;
      }
    }

    // Verify if webhook is active — Telegram blocks getUpdates while webhook is set
    const whRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`);
    const whJson = (await whRes.json()) as any;
    const webhookUrl = whJson.result?.url || '';

    if (webhookUrl) {
      return NextResponse.json({
        success: true,
        mode: 'webhook',
        webhookUrl,
        commandsSynced: commandsResult?.ok ?? true,
        processedCount: 0,
        repliedCount: 0,
        message: 'Live webhook is active; Telegram pushes updates directly to your HTTPS webhook.'
      });
    }

    // Pull pending updates via getUpdates (no webhook active)
    const offsetParam = globalPollState.__tgPollOffset ? `&offset=${globalPollState.__tgPollOffset}` : '';
    const limit = Math.min(Math.max(Number(body.limit || 20), 1), 50);
    const updatesRes = await fetch(
      `https://api.telegram.org/bot${token.trim()}/getUpdates?limit=${limit}&timeout=0${offsetParam}&allowed_updates=${encodeURIComponent(
        JSON.stringify(['message', 'channel_post', 'callback_query'])
      )}`
    );
    const updatesJson = (await updatesRes.json()) as any;
    if (!updatesJson.ok) {
      return NextResponse.json({
        success: false,
        error: updatesJson.description || 'Failed to fetch Telegram updates'
      }, { status: 400 });
    }

    const updates: any[] = Array.isArray(updatesJson.result) ? updatesJson.result : [];
    let processedCount = 0;
    let repliedCount = 0;
    let maxUpdateId = globalPollState.__tgPollOffset ? globalPollState.__tgPollOffset - 1 : 0;

    for (const upd of updates) {
      if (typeof upd.update_id === 'number' && upd.update_id > maxUpdateId) {
        maxUpdateId = upd.update_id;
      }
      const reply = await processTelegramUpdate(upd, env);
      processedCount++;
      if (reply.method === 'sendMessage' && !reply.duplicate) {
        const sent = await dispatchTelegramReply(token, reply);
        if (sent.sent) repliedCount++;
      }
    }

    if (maxUpdateId > 0) {
      globalPollState.__tgPollOffset = maxUpdateId + 1;
      // Acknowledge offset with Telegram so old messages aren't re-fetched
      await fetch(`https://api.telegram.org/bot${token.trim()}/getUpdates?offset=${globalPollState.__tgPollOffset}&limit=1&timeout=0`).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      mode: 'polling',
      commandsSynced: commandsResult?.ok ?? true,
      processedCount,
      repliedCount,
      message:
        processedCount > 0
          ? `Processed ${processedCount} Telegram update(s) and sent ${repliedCount} live reply(ies).`
          : 'Synced bot commands. No new pending Telegram messages right now.'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Polling failed' }, { status: 500 });
  }
}
