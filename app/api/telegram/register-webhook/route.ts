// Community OS — Telegram Bot Webhook Auto-Registration Handler
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/services/auth';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({
        configured: false,
        error: 'TELEGRAM_BOT_TOKEN environment variable is not configured'
      }, { status: 400 });
    }

    // Check current webhook status from Telegram Bot API
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`);
    const data = (await res.json()) as any;

    return NextResponse.json({
      success: true,
      webhookInfo: data.result || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const authUser = await getAuthenticatedUserFromRequest(req);
    // Only platform admin can register webhooks
    if (authUser && authUser.platformRole !== 'platform_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized: requires platform admin role' }, { status: 403 });
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN is not configured in server environment'
      }, { status: 400 });
    }

    const body = ((await req.json().catch(() => ({}))) || {}) as { appUrl?: string; dropPending?: boolean };
    const rawAppUrl = body.appUrl || env.APP_URL || 'https://community-os.workers.dev';
    const appUrl = rawAppUrl.trim().replace(/\/$/, '');
    const webhookUrl = `${appUrl}/api/telegram/webhook`;

    const rawSecret = env.TELEGRAM_WEBHOOK_SECRET || 'comm_tg_sec_prod_9918';
    const sanitizedSecret = rawSecret.trim().replace(/[^A-Za-z0-9_-]/g, '');

    const params = new URLSearchParams({
      url: webhookUrl,
      secret_token: sanitizedSecret,
      allowed_updates: JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query']),
      drop_pending_updates: body.dropPending ? 'true' : 'false'
    });

    const setRes = await fetch(`https://api.telegram.org/bot${token.trim()}/setWebhook?${params.toString()}`);
    const setResult = (await setRes.json()) as any;

    if (!setResult.ok) {
      return NextResponse.json({
        success: false,
        error: setResult.description || 'Failed to register webhook with Telegram',
        targetUrl: webhookUrl
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram Webhook registered successfully for Cloudflare Workers',
      webhookUrl,
      telegramResponse: setResult
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
