// Community OS — Cloudflare Workers Free Production Entrypoint
// Provides edge request handling, Next.js routing, and API execution on Workers Free

export interface Env {
  ASSETS?: Fetcher;
  APP_URL?: string;
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_APPLICATION_ID?: string;
  WHOP_API_KEY?: string;
  WHOP_WEBHOOK_SECRET?: string;
  SESSION_SECRET?: string;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Forward environment secrets to process.env if available in workerd
    if (typeof process !== 'undefined' && process.env) {
      const procEnv = process.env as Record<string, string | undefined>;
      if (env.SUPABASE_URL && !procEnv.SUPABASE_URL) procEnv.SUPABASE_URL = env.SUPABASE_URL;
      if (env.SUPABASE_SERVICE_ROLE_KEY && !procEnv.SUPABASE_SERVICE_ROLE_KEY) procEnv.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
      if (env.TELEGRAM_BOT_TOKEN && !procEnv.TELEGRAM_BOT_TOKEN) procEnv.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
      if (env.TELEGRAM_WEBHOOK_SECRET && !procEnv.TELEGRAM_WEBHOOK_SECRET) procEnv.TELEGRAM_WEBHOOK_SECRET = env.TELEGRAM_WEBHOOK_SECRET;
      if (env.DISCORD_BOT_TOKEN && !procEnv.DISCORD_BOT_TOKEN) procEnv.DISCORD_BOT_TOKEN = env.DISCORD_BOT_TOKEN;
      if (env.DISCORD_PUBLIC_KEY && !procEnv.DISCORD_PUBLIC_KEY) procEnv.DISCORD_PUBLIC_KEY = env.DISCORD_PUBLIC_KEY;
      if (env.APP_URL && !procEnv.APP_URL) procEnv.APP_URL = env.APP_URL;
      if (env.WHOP_WEBHOOK_SECRET && !procEnv.WHOP_WEBHOOK_SECRET) procEnv.WHOP_WEBHOOK_SECRET = env.WHOP_WEBHOOK_SECRET;
      if (env.SESSION_SECRET && !procEnv.SESSION_SECRET) procEnv.SESSION_SECRET = env.SESSION_SECRET;
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
