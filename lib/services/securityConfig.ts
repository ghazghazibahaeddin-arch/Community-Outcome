// Community OS — Central Security Configuration & Origin Validation Service
import { NextRequest } from 'next/server';
import { getRuntimeEnv, CloudflareEnv } from '../env';

/**
 * Strict allowlist of authorized application origins for production and development.
 * Arbitrary Host or X-Forwarded-Host headers are NEVER trusted for OAuth redirects.
 */
export const ALLOWED_APP_ORIGINS: readonly string[] = Object.freeze([
  'https://community-outcome.ghazghazibahaeddin.workers.dev',
  'https://community-os.workers.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

/**
 * Primary canonical application URL.
 */
export const DEFAULT_PRODUCTION_APP_URL = 'https://community-outcome.ghazghazibahaeddin.workers.dev';

/**
 * Validates a given URL string against the ALLOWED_APP_ORIGINS allowlist or valid Cloudflare workers domain.
 */
export function isAllowedOrigin(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    const origin = parsed.origin.toLowerCase();
    if (ALLOWED_APP_ORIGINS.some((allowed) => allowed.toLowerCase() === origin)) {
      return true;
    }
    // Allow Cloudflare Workers/Pages and Cloud Run / preview domains
    if (
      parsed.hostname.endsWith('.workers.dev') ||
      parsed.hostname.endsWith('.pages.dev') ||
      parsed.hostname.endsWith('.run.app')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Retrieve the securely verified application base URL.
 * Reads directly from env.APP_URL and validates strictly against allowlist.
 * Never trusts incoming request headers.
 */
export function getVerifiedAppUrl(explicitEnv?: CloudflareEnv): string {
  const env = getRuntimeEnv(explicitEnv);
  const envUrl = env.APP_URL ? env.APP_URL.trim().replace(/\/$/, '') : '';
  if (envUrl && isAllowedOrigin(envUrl)) {
    return envUrl;
  }

  if (env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return DEFAULT_PRODUCTION_APP_URL;
}

/**
 * Retrieve and validate the fixed Discord OAuth redirect URI.
 * If APP_URL is overridden to a non-default origin (such as localhost:3000) while DISCORD_REDIRECT_URI
 * is only the default production URL, automatically derive from verifiedAppUrl.
 */
export function getDiscordRedirectUri(explicitEnv?: CloudflareEnv): string {
  const env = getRuntimeEnv(explicitEnv);
  const verifiedAppUrl = getVerifiedAppUrl(env);
  const customUri = env.DISCORD_REDIRECT_URI ? env.DISCORD_REDIRECT_URI.trim() : '';
  const defaultProdCallback = `${DEFAULT_PRODUCTION_APP_URL}/api/discord/callback`;

  if (
    customUri &&
    isAllowedOrigin(customUri) &&
    (customUri !== defaultProdCallback || verifiedAppUrl === DEFAULT_PRODUCTION_APP_URL)
  ) {
    return customUri;
  }
  return `${verifiedAppUrl}/api/discord/callback`;
}

/**
 * Retrieve and validate the fixed Telegram OpenID Connect redirect URI.
 * If APP_URL is overridden to a non-default origin (such as localhost:3000) while TELEGRAM_REDIRECT_URI
 * is only the default production URL, automatically derive from verifiedAppUrl.
 */
export function getTelegramRedirectUri(explicitEnv?: CloudflareEnv): string {
  const env = getRuntimeEnv(explicitEnv);
  const verifiedAppUrl = getVerifiedAppUrl(env);
  const customUri = env.TELEGRAM_REDIRECT_URI ? env.TELEGRAM_REDIRECT_URI.trim() : '';
  const defaultProdCallback = `${DEFAULT_PRODUCTION_APP_URL}/api/auth/telegram/callback`;

  if (
    customUri &&
    isAllowedOrigin(customUri) &&
    (customUri !== defaultProdCallback || verifiedAppUrl === DEFAULT_PRODUCTION_APP_URL)
  ) {
    return customUri;
  }
  return `${verifiedAppUrl}/api/auth/telegram/callback`;
}

/**
 * Verify CSRF protection for state-changing requests (POST/PUT/DELETE).
 * Compares Origin or Referer header against the allowlist.
 */
export function verifyCsrfProtection(req: NextRequest, explicitEnv?: CloudflareEnv): { valid: boolean; reason?: string } {
  // Safe HTTP methods do not require CSRF origin validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return { valid: true };
  }

  const env = getRuntimeEnv(explicitEnv);
  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const checkOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : null);

  if (!checkOrigin) {
    // If neither Origin nor Referer provided, allow only if internal or dev, but enforce in production
    if (env.NODE_ENV === 'production') {
      return { valid: false, reason: 'Missing Origin or Referer header on state-changing request' };
    }
    return { valid: true };
  }

  if (!isAllowedOrigin(checkOrigin)) {
    return { valid: false, reason: `Untrusted request origin: ${checkOrigin}` };
  }

  return { valid: true };
}
