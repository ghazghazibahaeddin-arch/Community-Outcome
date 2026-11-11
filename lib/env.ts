// Community OS — Cloudflare Workers Runtime Environment & Secrets Accessor
// Reads variables and secrets directly from Cloudflare Workers runtime (env.VARIABLE_NAME)

export interface CloudflareEnv {
  ASSETS?: Fetcher;
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
  TELEGRAM_BOT_NAME?: string;
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
  NEXT_PUBLIC_WHOP_CHECKOUT_URL?: string;

  // Misc
  SMTP_HOST?: string;
  SMTP_USER?: string;
  GUMROAD_SELLER_ID?: string;

  [key: string]: any;
}

let activeRuntimeEnv: CloudflareEnv | null = null;

/**
 * Sets the active Cloudflare Workers environment object captured in fetch(request, env, ctx).
 */
export function setRuntimeEnv(env: CloudflareEnv): void {
  activeRuntimeEnv = env;
}

/**
 * Accesses the active Cloudflare Workers runtime environment.
 * Evaluates explicitEnv first (passed from fetch(request, env, ctx)),
 * then activeRuntimeEnv, and falls back to process.env in local/test environments.
 */
export function getRuntimeEnv(explicitEnv?: CloudflareEnv): CloudflareEnv {
  if (explicitEnv && Object.keys(explicitEnv).length > 0) {
    return explicitEnv;
  }
  if (activeRuntimeEnv && Object.keys(activeRuntimeEnv).length > 0) {
    return activeRuntimeEnv;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env as unknown as CloudflareEnv;
  }
  return {} as CloudflareEnv;
}
