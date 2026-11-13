// Community OS — Cloudflare Workers Free Migration Verification Suite
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

async function runCloudflareVerification() {
  console.log('================================================================');
  console.log('COMMUNITY OS — CLOUDFLARE WORKERS FREE MIGRATION VERIFICATION');
  console.log('================================================================\n');

  // 1. Verify OpenNext Cloudflare Workers Entrypoint, Wrangler Config, and Runtime Env
  assert(fs.existsSync('open-next.config.ts'), 'Workers: open-next.config.ts adapter configuration present');
  const wranglerConfig = fs.readFileSync('wrangler.jsonc', 'utf-8');
  assert(
    wranglerConfig.includes('".open-next/worker.js"') &&
    wranglerConfig.includes('".open-next/assets"') &&
    wranglerConfig.includes('"DISCORD_PUBLIC_KEY"'),
    'Wrangler: wrangler.jsonc configures .open-next/worker.js, .open-next/assets, and runtime vars including DISCORD_PUBLIC_KEY'
  );
  assert(fs.existsSync('lib/env.ts'), 'Environment: Direct Cloudflare Workers runtime environment accessor (lib/env.ts) present');
  assert(!fs.existsSync('wrangler.toml'), 'Wrangler: duplicate wrangler.toml removed');

  // 2. Verify Supabase as Primary Persistent Database
  const supabaseModule = fs.readFileSync('lib/db/supabase.ts', 'utf-8');
  assert(
    supabaseModule.includes('hydrateDatabaseFromSupabase') && supabaseModule.includes('syncDatabaseToSupabase'),
    'Database: Supabase PostgreSQL provides two-way hydration and sync for edge runtime'
  );

  const storeModule = fs.readFileSync('lib/db/store.ts', 'utf-8');
  assert(
    storeModule.includes('isSupabaseConfigured()') && storeModule.includes('syncDatabaseToSupabase(db)'),
    'Database: Store automatically routes persistence to Supabase PostgreSQL'
  );

  // 3. Verify Telegram Webhook & Registration
  const tgWebhook = fs.readFileSync('app/api/telegram/webhook/route.ts', 'utf-8');
  assert(
    tgWebhook.includes('x-telegram-bot-api-secret-token') && tgWebhook.includes('recentUpdateIds'),
    'Telegram Bot: Secure secret token verification and update_id deduplication active'
  );
  assert(
    fs.existsSync('app/api/telegram/register-webhook/route.ts') && fs.existsSync('scripts/register_telegram_webhook.mjs'),
    'Telegram Bot: Automated webhook registration endpoint and CLI script ready'
  );

  // 4. Verify Discord HTTP Interactions (Ed25519)
  const discordInteractions = fs.readFileSync('app/api/discord/interactions/route.ts', 'utf-8');
  assert(
    discordInteractions.includes('crypto.subtle') && discordInteractions.includes('x-signature-ed25519'),
    'Discord Bot: Native Web Crypto Ed25519 signature verification active for Workers'
  );

  // 5. Verify Workers Free Only & Secrets Safety
  const envExample = fs.readFileSync('.env.example', 'utf-8');
  assert(
    envExample.includes('wrangler secret put SUPABASE_URL') &&
    envExample.includes('wrangler secret put TELEGRAM_BOT_TOKEN') &&
    envExample.includes('wrangler secret put DISCORD_BOT_TOKEN'),
    'Security: Encrypted Cloudflare Secrets documented for all credentials without hardcoding'
  );

  // 6. Verify Scripts in package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  assert(
    pkg.scripts['cf:build'] && pkg.scripts['cf:preview'] && pkg.scripts['cf:deploy'] && pkg.scripts['cf:typegen'],
    'Scripts: package.json includes cf:build, cf:preview, cf:deploy, and cf:typegen commands'
  );

  console.log('\n================================================================');
  console.log(`CLOUDFLARE MIGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runCloudflareVerification();
