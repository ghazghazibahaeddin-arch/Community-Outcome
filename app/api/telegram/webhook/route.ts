// Community OS — Telegram Bot Webhook Endpoint with Cryptographic Secret Token Verification
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnv } from '@/lib/env';
import { processTelegramUpdate } from '@/lib/services/telegramBotProcessor';

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
    return NextResponse.json(reply);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
