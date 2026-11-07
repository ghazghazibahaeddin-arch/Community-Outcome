#!/usr/bin/env node
// Community OS — Telegram Webhook Production Registration Script for Cloudflare Workers

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || 'comm_tg_sec_prod_9918';
const appUrl = (process.argv[2] || process.env.APP_URL || 'https://community-os.workers.dev').replace(/\/$/, '');

if (!token) {
  console.error('[Error] TELEGRAM_BOT_TOKEN environment variable is not defined.');
  console.error('Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/register_telegram_webhook.mjs https://<worker>.workers.dev');
  process.exit(1);
}

const webhookUrl = `${appUrl}/api/telegram/webhook`;
const sanitizedSecret = secret.trim().replace(/[^A-Za-z0-9_-]/g, '');

console.log(`[Telegram Registration] Setting Webhook for @CommunityOutcomeBot`);
console.log(`Target Webhook URL: ${webhookUrl}`);

async function register() {
  try {
    const url = `https://api.telegram.org/bot${token.trim()}/setWebhook`;
    const params = new URLSearchParams({
      url: webhookUrl,
      secret_token: sanitizedSecret,
      allowed_updates: JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query']),
      drop_pending_updates: 'true'
    });

    const res = await fetch(`${url}?${params.toString()}`);
    const data = await res.json();

    if (data.ok) {
      console.log('✅ Webhook registered successfully!');
      console.log('Telegram API Response:', data);

      // Verify webhook info
      const infoRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getWebhookInfo`);
      const infoData = await infoRes.json();
      console.log('Active Webhook Info:', infoData.result);
    } else {
      console.error('❌ Failed to register webhook:', data.description);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Request error:', err.message);
    process.exit(1);
  }
}

register();
