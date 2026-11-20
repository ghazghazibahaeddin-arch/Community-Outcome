import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseHydrated, getDatabase } from '@/lib/db/store';
import { getAuthenticatedUserFromRequest } from '@/lib/services/auth';
import { getVerifiedAppUrl, isAllowedOrigin } from '@/lib/services/securityConfig';
import { getRuntimeEnv } from '@/lib/env';
import { syncTelegramBotCommands } from '@/lib/services/telegramBotProcessor';

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
      expectedWebhookUrl: `${getVerifiedAppUrl(env)}/api/telegram/webhook`,
      webhookInfo: data.result || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    await ensureDatabaseHydrated(env);
    const authUser = await getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to register Telegram webhook' },
        { status: 401 }
      );
    }
    const db = getDatabase();
    const ownsCommunity = db.communities.some((c) => c.ownerId === authUser.id);
    const isAuthorized =
      ['platform_admin', 'community_owner', 'admin'].includes(authUser.platformRole) || ownsCommunity;
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: requires community owner or platform admin role' },
        { status: 403 }
      );
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN is not configured in server environment'
      }, { status: 400 });
    }

    const body = ((await req.json().catch(() => ({}))) || {}) as { appUrl?: string; dropPending?: boolean };
    const candidateUrl = body.appUrl ? body.appUrl.trim().replace(/\/$/, '') : '';
    const rawAppUrl = candidateUrl && isAllowedOrigin(candidateUrl) ? candidateUrl : getVerifiedAppUrl(env);
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

    const commandsSync = await syncTelegramBotCommands(token);
    const infoRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`).catch(() => null);
    const infoData = infoRes ? ((await infoRes.json()) as any) : null;

    return NextResponse.json({
      success: true,
      message: 'Telegram Webhook & command menu registered successfully',
      webhookUrl,
      commandsSynced: commandsSync.ok,
      webhookInfo: infoData?.result || null,
      telegramResponse: setResult
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
