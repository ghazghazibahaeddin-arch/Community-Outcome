// Community OS — Central Security Configuration & Origin Validation Service
import { NextRequest } from 'next/server';

/**
 * Strict allowlist of authorized application origins for production and development.
 * Arbitrary Host or X-Forwarded-Host headers are NEVER trusted for OAuth redirects.
 */
export const ALLOWED_APP_ORIGINS: readonly string[] = Object.freeze([
  'https://ais-dev-x3f327qfyrgqv3sqcrumjr-942709702494.europe-west2.run.app',
  'https://ais-pre-x3f327qfyrgqv3sqcrumjr-942709702494.europe-west2.run.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

/**
 * Primary canonical application URL.
 */
export const DEFAULT_PRODUCTION_APP_URL = 'https://ais-dev-x3f327qfyrgqv3sqcrumjr-942709702494.europe-west2.run.app';

/**
 * Validates a given URL string against the ALLOWED_APP_ORIGINS allowlist.
 */
export function isAllowedOrigin(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const origin = new URL(urlStr).origin.toLowerCase();
    return ALLOWED_APP_ORIGINS.some((allowed) => allowed.toLowerCase() === origin);
  } catch {
    return false;
  }
}

/**
 * Retrieve the securely verified application base URL.
 * Reads from process.env.APP_URL and validates strictly against allowlist.
 * Never trusts incoming request headers.
 */
export function getVerifiedAppUrl(): string {
  const envUrl = process.env.APP_URL ? process.env.APP_URL.trim().replace(/\/$/, '') : '';
  if (envUrl && isAllowedOrigin(envUrl)) {
    return envUrl;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return DEFAULT_PRODUCTION_APP_URL;
}

/**
 * Retrieve and validate the fixed Discord OAuth redirect URI.
 * Reads DISCORD_REDIRECT_URI from environment and validates against allowlist.
 */
export function getDiscordRedirectUri(): string {
  const customUri = process.env.DISCORD_REDIRECT_URI ? process.env.DISCORD_REDIRECT_URI.trim() : '';
  if (customUri && isAllowedOrigin(customUri)) {
    return customUri;
  }
  return `${getVerifiedAppUrl()}/api/discord/callback`;
}

/**
 * Retrieve and validate the fixed Telegram OpenID Connect redirect URI.
 * Reads TELEGRAM_REDIRECT_URI from environment and validates against allowlist.
 */
export function getTelegramRedirectUri(): string {
  const customUri = process.env.TELEGRAM_REDIRECT_URI ? process.env.TELEGRAM_REDIRECT_URI.trim() : '';
  if (customUri && isAllowedOrigin(customUri)) {
    return customUri;
  }
  return `${getVerifiedAppUrl()}/api/auth/telegram/callback`;
}

/**
 * Verify CSRF protection for state-changing requests (POST/PUT/DELETE).
 * Compares Origin or Referer header against the allowlist.
 */
export function verifyCsrfProtection(req: NextRequest): { valid: boolean; reason?: string } {
  // Safe HTTP methods do not require CSRF origin validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return { valid: true };
  }

  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const checkOrigin = originHeader || (refererHeader ? new URL(refererHeader).origin : null);

  if (!checkOrigin) {
    // If neither Origin nor Referer provided, allow only if internal or dev, but enforce in production
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, reason: 'Missing Origin or Referer header on state-changing request' };
    }
    return { valid: true };
  }

  if (!isAllowedOrigin(checkOrigin)) {
    return { valid: false, reason: `Untrusted request origin: ${checkOrigin}` };
  }

  return { valid: true };
}
