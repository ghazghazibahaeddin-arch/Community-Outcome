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
  DISCORD_PUBLIC_KEY: string;b8eac088933e82f4025ac3063b4a35c1a5c53533225117b27e4910870f226482
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

let activeRuntimeEnv: CloudflareEnv | null = null;

export function setRuntimeEnv(env: CloudflareEnv): void {
  activeRuntimeEnv = env;
}

export function getRuntimeEnv(explicitEnv?: CloudflareEnv): CloudflareEnv {
  if (explicitEnv && Object.keys(explicitEnv).length > 0) {
    return explicitEnv;
  }
  if (activeRuntimeEnv && Object.keys(activeRuntimeEnv).length > 0) {
    return activeRuntimeEnv;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env as CloudflareEnv;
  }
  return {};
}
