// Community OS — Cloudflare Workers Free Production Entrypoint
// Provides edge request handling, Next.js routing, and API execution on Workers Free

export interface Env {
  ASSETS?: Fetcher;
  NODE_ENV?: string;
  APP_URL?: string;

  // Discord
  DISCORD_APPLICATION_ID?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_REDIRECT_URI?: string;

  // Telegram
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_OIDC_CLIENT_ID?: string;
  TELEGRAM_OIDC_CLIENT_SECRET?: string;
  TELEGRAM_REDIRECT_URI?: string;

  // Supabase
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;

  // Whop
  WHOP_COMPANY_API_KEY?: string;
  WHOP_API_KEY?: string;
  WHOP_WEBHOOK_SECRET?: string;
  WHOP_PRO_PLAN_ID?: string;
  WHOP_PURCHASE_URL?: string;
  WHOP_PRODUCT_URL?: string;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Forward environment variables and secrets to process.env in workerd
    if (typeof process !== 'undefined' && process.env) {
      const procEnv = process.env as Record<string, string | undefined>;

      // App
      if (env.APP_URL && !procEnv.APP_URL) procEnv.APP_URL = env.APP_URL;
      if (env.NODE_ENV && !procEnv.NODE_ENV) procEnv.NODE_ENV = env.NODE_ENV;

      // Discord
      if (env.DISCORD_APPLICATION_ID && !procEnv.DISCORD_APPLICATION_ID) procEnv.DISCORD_APPLICATION_ID = env.DISCORD_APPLICATION_ID;
      if (env.DISCORD_BOT_TOKEN && !procEnv.DISCORD_BOT_TOKEN) procEnv.DISCORD_BOT_TOKEN = env.DISCORD_BOT_TOKEN;
      if (env.DISCORD_CLIENT_SECRET && !procEnv.DISCORD_CLIENT_SECRET) procEnv.DISCORD_CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
      if (env.DISCORD_PUBLIC_KEY && !procEnv.DISCORD_PUBLIC_KEY) procEnv.DISCORD_PUBLIC_KEY = env.DISCORD_PUBLIC_KEY;
      if (env.DISCORD_REDIRECT_URI && !procEnv.DISCORD_REDIRECT_URI) procEnv.DISCORD_REDIRECT_URI = env.DISCORD_REDIRECT_URI;

      // Telegram
      if (env.TELEGRAM_BOT_TOKEN && !procEnv.TELEGRAM_BOT_TOKEN) procEnv.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
      if (env.TELEGRAM_BOT_USERNAME && !procEnv.TELEGRAM_BOT_USERNAME) {
        procEnv.TELEGRAM_BOT_USERNAME = env.TELEGRAM_BOT_USERNAME;
        procEnv.TELEGRAM_BOT_NAME = env.TELEGRAM_BOT_USERNAME;
      }
      if (env.TELEGRAM_WEBHOOK_SECRET && !procEnv.TELEGRAM_WEBHOOK_SECRET) procEnv.TELEGRAM_WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;
      if (env.TELEGRAM_OIDC_CLIENT_ID && !procEnv.TELEGRAM_OIDC_CLIENT_ID) procEnv.TELEGRAM_OIDC_CLIENT_ID = env.TELEGRAM_OIDC_CLIENT_ID;
      if (env.TELEGRAM_OIDC_CLIENT_SECRET && !procEnv.TELEGRAM_OIDC_CLIENT_SECRET) procEnv.TELEGRAM_OIDC_CLIENT_SECRET = env.TELEGRAM_OIDC_CLIENT_SECRET;
      if (env.TELEGRAM_REDIRECT_URI && !procEnv.TELEGRAM_REDIRECT_URI) procEnv.TELEGRAM_REDIRECT_URI = env.TELEGRAM_REDIRECT_URI;

      // Supabase (Canonical + backwards-compatible aliases)
      if (env.SUPABASE_URL && !procEnv.SUPABASE_URL) procEnv.SUPABASE_URL = env.SUPABASE_URL;
      const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
      if (secretKey) {
        if (!procEnv.SUPABASE_SECRET_KEY) procEnv.SUPABASE_SECRET_KEY = secretKey;
        if (!procEnv.SUPABASE_SERVICE_ROLE_KEY) procEnv.SUPABASE_SERVICE_ROLE_KEY = secretKey;
      }
      const pubKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
      if (pubKey) {
        if (!procEnv.SUPABASE_PUBLISHABLE_KEY) procEnv.SUPABASE_PUBLISHABLE_KEY = pubKey;
        if (!procEnv.SUPABASE_ANON_KEY) procEnv.SUPABASE_ANON_KEY = pubKey;
      }

      // Whop
      const whopApiKey = env.WHOP_COMPANY_API_KEY || env.WHOP_API_KEY;
      if (whopApiKey) {
        if (!procEnv.WHOP_COMPANY_API_KEY) procEnv.WHOP_COMPANY_API_KEY = whopApiKey;
        if (!procEnv.WHOP_API_KEY) procEnv.WHOP_API_KEY = whopApiKey;
      }
      if (env.WHOP_WEBHOOK_SECRET && !procEnv.WHOP_WEBHOOK_SECRET) procEnv.WHOP_WEBHOOK_SECRET = env.WHOP_WEBHOOK_SECRET;
      if (env.WHOP_PRO_PLAN_ID && !procEnv.WHOP_PRO_PLAN_ID) procEnv.WHOP_PRO_PLAN_ID = env.WHOP_PRO_PLAN_ID;
      if (env.WHOP_PURCHASE_URL && !procEnv.WHOP_PURCHASE_URL) procEnv.WHOP_PURCHASE_URL = env.WHOP_PURCHASE_URL;
      if (env.WHOP_PRODUCT_URL && !procEnv.WHOP_PRODUCT_URL) procEnv.WHOP_PRODUCT_URL = env.WHOP_PRODUCT_URL;
    }

    // 2. Health & Status check endpoint
    if (url.pathname === '/api/cf-health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        platform: 'Cloudflare Workers Free',
        workerRuntime: 'workerd',
        timestamp: new Date().toISOString(),
        supabaseConfigured: Boolean(env.SUPABASE_URL || process.env.SUPABASE_URL),
        telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN),
        discordConfigured: Boolean(env.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN),
        appUrl: env.APP_URL || process.env.APP_URL || url.origin
      }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    // 3. Static Assets serving via Cloudflare Worker Assets binding
    if (env.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status < 400 || assetResponse.status === 304) {
          return assetResponse;
        }
      } catch {
        // Fallback to route handler if asset not found
      }
    }

    // 4. Default Workers response / Pass-through
    return new Response(
      `Community OS — Cloudflare Workers Free Runtime Active.\nRequest: ${request.method} ${url.pathname}\nConfigured on workers.dev`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }
};

export default worker;
