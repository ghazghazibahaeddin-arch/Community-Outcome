import { NextRequest, NextResponse } from 'next/server';
import {
  buildTelegramOidcAuthorization,
  TELEGRAM_OIDC_COOKIE_NAME
} from '@/lib/services/telegramOidc';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

import { isHttpsRequest } from '@/lib/services/auth';
import { sanitizeReturnTo } from '@/lib/services/validation';

/**
 * Initiates the official Telegram OpenID Connect (OIDC) flow with PKCE S256.
 * Generates code_verifier, code_challenge (S256), state, and nonce.
 * Stores session parameters in an HttpOnly cookie.
 */
export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const url = new URL(req.url);
    const intentParam = url.searchParams.get('intent');
    const intent: 'owner' | 'member' = intentParam === 'owner' ? 'owner' : 'member';
    const rawReturnTo = url.searchParams.get('returnTo');
    const returnTo = rawReturnTo ? sanitizeReturnTo(rawReturnTo, '') : '';
    const { authUrl, sessionState } = buildTelegramOidcAuthorization(env, intent, returnTo || undefined);
    const shouldRedirect = url.searchParams.get('redirect') !== 'false';

    const response = shouldRedirect
      ? NextResponse.redirect(authUrl)
      : NextResponse.json({
          success: true,
          authUrl,
          intent,
          clientId: sessionState.clientId,
          redirectUri: sessionState.redirectUri
        });

    // Store state in HttpOnly cookie for callback validation (protocol-aware Secure flag)
    response.cookies.set({
      name: TELEGRAM_OIDC_COOKIE_NAME,
      value: JSON.stringify(sessionState),
      httpOnly: true,
      secure: isHttpsRequest(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 600 // 10 minutes expiry
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
