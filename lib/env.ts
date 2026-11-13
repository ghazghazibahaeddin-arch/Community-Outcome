// Community OS — Central Environment Accessor for Cloudflare Workers & Node.js
export interface CloudflareEnv {
  ASSETS?: any;
  NODE_ENV?: string;
  APP_URL?: string;
  APP_INTERNAL_URL?: string;
  ORIGIN_URL?: string;

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

  [key: string]: any;
}

export const DEFAULT_VARS: Partial<CloudflareEnv> = Object.freeze({
  APP_URL: 'https://community-outcome.ghazghazibahaeddin.workers.dev',
  DISCORD_APPLICATION_ID: '1565501338597462099',
  DISCORD_PUBLIC_KEY: 'b8eac088933e82f4025ac3063b4a35c1a5c53533225117b27e4910870f226482',
  DISCORD_REDIRECT_URI: 'https://community-outcome.ghazghazibahaeddin.workers.dev/api/discord/callback',
  TELEGRAM_BOT_USERNAME: 'CommunityOutcomeBot',
  TELEGRAM_OIDC_CLIENT_ID: '9018720052',
  TELEGRAM_REDIRECT_URI: 'https://community-outcome.ghazghazibahaeddin.workers.dev/api/auth/telegram/callback',
  WHOP_PRO_PLAN_ID: 'prod_community_pro_15',
  WHOP_PURCHASE_URL: 'https://whop.com/baha-1a44/community-os-pro',
  WHOP_PRODUCT_URL: 'https://whop.com/baha-1a44'
});

let activeRuntimeEnv: CloudflareEnv | null = null;

export function setRuntimeEnv(env: CloudflareEnv): void {
  activeRuntimeEnv = env;
}

function mergeNonEmpty(target: CloudflareEnv, source?: Record<string, any> | null): void {
  if (!source || typeof source !== 'object') return;
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val !== undefined && val !== null && val !== '') {
      target[key] = val;
    }
  }
}

function getOpenNextCloudflareEnv(): CloudflareEnv | null {
  try {
    const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (ctx && ctx.env && typeof ctx.env === 'object') {
      return ctx.env as CloudflareEnv;
    }
  } catch {
    // Ignore outside request context
  }
  return null;
}

export function getRuntimeEnv(explicitEnv?: CloudflareEnv): CloudflareEnv {
  const merged: CloudflareEnv = { ...DEFAULT_VARS };
  const procEnv = typeof process !== 'undefined' && process.env ? (process.env as Record<string, any>) : null;
  const cfContextEnv = getOpenNextCloudflareEnv();

  // Merge layers: defaults -> process.env -> Cloudflare Workers runtime env -> active -> explicit
  mergeNonEmpty(merged, procEnv);
  mergeNonEmpty(merged, cfContextEnv);
  mergeNonEmpty(merged, activeRuntimeEnv);
  mergeNonEmpty(merged, explicitEnv);

  return merged;
}
