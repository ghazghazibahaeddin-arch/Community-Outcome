// Community OS — Real Live Discord & Telegram Verification Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { IntegrationCheckResult } from '@/lib/types';
import { dbOperations } from '@/lib/db/store';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const body = (await req.json()) as { platform?: string; customToken?: string; customAppId?: string };
    const { platform, customToken, customAppId } = body;

    const checkedAt = new Date().toISOString();

    if (platform === 'discord') {
      const token = customToken || env.DISCORD_BOT_TOKEN;
      const appId = customAppId || env.DISCORD_APPLICATION_ID || '1565501338597462099';

      if (!token || token.trim() === '') {
        const result: IntegrationCheckResult = {
          platform: 'discord',
          configured: false,
          status: 'not_configured',
          details: 'DISCORD_BOT_TOKEN is not configured in server environment or secrets panel.',
          checkedAt
        };
        return NextResponse.json({ success: true, result });
      }

      // Live verification against official Discord API
      try {
        const apiRes = await fetch('https://discord.com/api/v10/users/@me', {
          headers: {
            Authorization: `Bot ${token.trim()}`,
            'User-Agent': 'CommunityOS/1.0 (https://community-outcome.ghazghazibahaeddin.workers.dev)'
          }
        });

        if (apiRes.ok) {
          const botUser = (await apiRes.json()) as any;
          const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=277025507392&scope=bot%20applications.commands`;

          const result: IntegrationCheckResult = {
            platform: 'discord',
            configured: true,
            status: 'connected',
            botUsername: botUser.username,
            botId: botUser.id,
            botName: botUser.global_name || botUser.username,
            details: `Successfully authenticated with Discord API. Bot: @${botUser.username} (ID: ${botUser.id}). Gateway interaction endpoint active.`,
            inviteUrl,
            checkedAt
          };
          return NextResponse.json({ success: true, result });
        } else {
          const errData = ((await apiRes.json().catch(() => ({}))) || {}) as any;
          const result: IntegrationCheckResult = {
            platform: 'discord',
            configured: true,
            status: 'error',
            details: `Discord API rejected credentials (HTTP ${apiRes.status}): ${errData.message || 'Invalid bot token or expired secret.'}`,
            checkedAt
          };
          return NextResponse.json({ success: true, result });
        }
      } catch (netErr: any) {
        return NextResponse.json({
          success: true,
          result: {
            platform: 'discord',
            configured: true,
            status: 'error',
            details: `Network error connecting to Discord API: ${netErr.message}`,
            checkedAt
          }
        });
      }
    }

    if (platform === 'telegram') {
      const token = customToken || env.TELEGRAM_BOT_TOKEN;

      if (!token || token.trim() === '') {
        const result: IntegrationCheckResult = {
          platform: 'telegram',
          configured: false,
          status: 'not_configured',
          details: 'TELEGRAM_BOT_TOKEN is not configured in server environment or secrets panel.',
          checkedAt
        };
        return NextResponse.json({ success: true, result });
      }

      // Live verification against official Telegram Bot API
      try {
        const getMeRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
        const getMeJson = (await getMeRes.json()) as any;

        if (getMeJson.ok && getMeJson.result) {
          const bot = getMeJson.result;

          // Check webhook info deeply so empty or failing webhooks are surfaced clearly
          let webhookDetails = 'Webhook status unverified';
          let webhookUrl: string | undefined;
          let webhookActive = false;
          let pendingUpdateCount: number | undefined;
          let lastErrorMessage: string | undefined;
          let lastErrorDate: number | undefined;
          try {
            const whRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`);
            const whJson = (await whRes.json()) as any;
            if (whJson.ok && whJson.result) {
              const info = whJson.result;
              webhookUrl = info.url || undefined;
              pendingUpdateCount = typeof info.pending_update_count === 'number' ? info.pending_update_count : undefined;
              lastErrorMessage = info.last_error_message || undefined;
              lastErrorDate = typeof info.last_error_date === 'number' ? info.last_error_date : undefined;
              webhookActive = Boolean(info.url) && !info.last_error_message;

              if (!info.url) {
                webhookDetails = `WARNING: No webhook registered (url is empty, pending: ${info.pending_update_count ?? 0}). Click "Sync Telegram Webhook" to activate automatic replies.`;
              } else if (info.last_error_message) {
                webhookDetails = `Webhook error on ${info.url}: ${info.last_error_message} (pending: ${info.pending_update_count ?? 0})`;
              } else {
                webhookDetails = `Webhook active at: ${info.url} (pending: ${info.pending_update_count ?? 0})`;
              }
            }
          } catch (whErr) {
            console.warn('[Integrations Verify] Could not fetch Telegram webhook info:', whErr);
            webhookDetails = 'Webhook verification request failed; check network/bot token.';
          }

          const result: IntegrationCheckResult = {
            platform: 'telegram',
            configured: true,
            status: lastErrorMessage ? 'error' : 'connected',
            botUsername: bot.username,
            botId: String(bot.id),
            botName: bot.first_name,
            webhookUrl,
            webhookActive,
            pendingUpdateCount,
            lastErrorMessage,
            lastErrorDate,
            details: `Authenticated with Telegram Bot API (@${bot.username}). ${webhookDetails}`,
            checkedAt
          };
          return NextResponse.json({ success: true, result });
        } else {
          const result: IntegrationCheckResult = {
            platform: 'telegram',
            configured: true,
            status: 'error',
            details: `Telegram API rejected credentials: ${getMeJson.description || 'Invalid bot token format.'}`,
            checkedAt
          };
          return NextResponse.json({ success: true, result });
        }
      } catch (netErr: any) {
        return NextResponse.json({
          success: true,
          result: {
            platform: 'telegram',
            configured: true,
            status: 'error',
            details: `Network error connecting to Telegram Bot API: ${netErr.message}`,
            checkedAt
          }
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Unsupported platform' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
