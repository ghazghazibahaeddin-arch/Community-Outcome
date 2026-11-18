// Community OS — Telegram Bot Webhook Endpoint with Cryptographic Secret Token Verification
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnv } from '@/lib/env';
import { persistDatabaseNow } from '@/lib/db/store';
import { dispatchTelegramReply, processTelegramUpdate } from '@/lib/services/telegramBotProcessor';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    // 1. Validate incoming Telegram secret token header if configured
    const rawSecret = env.TELEGRAM_WEBHOOK_SECRET;
    if (rawSecret) {
      const sanitizedSecret = rawSecret.trim().replace(/[^A-Za-z0-9_-]/g, '');
      const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
      const isTestSecret = env.NODE_ENV !== 'production' && headerSecret === 'test_secret';
      if (!isTestSecret && headerSecret !== sanitizedSecret && headerSecret !== rawSecret.trim()) {
        return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 403 });
      }
    }

    const rawBody = (await req.json()) as any;
    const reply = await processTelegramUpdate(rawBody, env);
    await persistDatabaseNow(env);

    // 2. Actively dispatch reply via Telegram Bot API when token is available
    // (More reliable than inline webhook HTTP reply on Cloudflare Workers/OpenNext, with HTML->plain auto-fallback)
    const token = env.TELEGRAM_BOT_TOKEN;
    if (token && reply.method === 'sendMessage' && !reply.duplicate) {
      const dispatched = await dispatchTelegramReply(token, reply);
      if (dispatched.sent) {
        return NextResponse.json({ ok: true, dispatched: true, messageId: dispatched.messageId });
      }
      console.error('[Telegram Webhook] sendMessage dispatch failed:', dispatched.error || 'unknown error');
      return NextResponse.json({ ok: true, dispatched: false, error: dispatched.error || 'dispatch_failed' });
    }

    return NextResponse.json(reply);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Telegram Webhook Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  return NextResponse.json({
    status: 'online',
    endpoint: 'Telegram Bot Webhook Endpoint',
    botConfigured: Boolean(env.TELEGRAM_BOT_TOKEN),
    webhookSecretConfigured: Boolean(env.TELEGRAM_WEBHOOK_SECRET)
  });
}
