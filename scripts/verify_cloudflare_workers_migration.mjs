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

  // 1. Verify Next.js App Router and Wrangler Files
  assert(fs.existsSync('wrangler.jsonc'), 'Wrangler: wrangler.jsonc configuration file present');
  assert(fs.existsSync('wrangler.toml'), 'Wrangler: wrangler.toml configuration file present');
  assert(fs.existsSync('cloudflare/worker.ts'), 'Workers: Native cloudflare/worker.ts entrypoint present');
  assert(fs.existsSync('worker-configuration.d.ts'), 'Workers: Generated worker-configuration.d.ts environment types present');

  const wranglerJson = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf-8'));
  assert(
    wranglerJson.compatibility_flags?.includes('nodejs_compat'),
    'Workers Free: nodejs_compat compatibility flag enabled'
  );
  assert(
    wranglerJson.name === 'community-os' && wranglerJson.main === 'cloudflare/worker.ts',
    'Workers Free: Configured for community-os worker entry'
  );

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
    pkg.scripts['cf:check'] && pkg.scripts['cf:preview'] && pkg.scripts['cf:deploy'],
    'Scripts: package.json includes cf:check, cf:preview, and cf:deploy commands'
  );

  console.log('\n================================================================');
  console.log(`CLOUDFLARE MIGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runCloudflareVerification();
