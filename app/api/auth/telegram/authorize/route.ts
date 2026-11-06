import { NextRequest, NextResponse } from 'next/server';
import {
  buildTelegramOidcAuthorization,
  TELEGRAM_OIDC_COOKIE_NAME
} from '@/lib/services/telegramOidc';

/**
 * Initiates the official Telegram OpenID Connect (OIDC) flow with PKCE S256.
 * Generates code_verifier, code_challenge (S256), state, and nonce.
 * Stores session parameters in an HttpOnly, Secure cookie.
 */
export async function GET(req: NextRequest) {
  try {
    const { authUrl, sessionState } = buildTelegramOidcAuthorization();
    const url = new URL(req.url);
    const shouldRedirect = url.searchParams.get('redirect') !== 'false';

    const response = shouldRedirect
      ? NextResponse.redirect(authUrl)
      : NextResponse.json({
          success: true,
          authUrl,
          clientId: sessionState.clientId,
          redirectUri: sessionState.redirectUri
        });

    // Store state in HttpOnly, Secure cookie for callback validation
    response.cookies.set({
      name: TELEGRAM_OIDC_COOKIE_NAME,
      value: JSON.stringify(sessionState),
      httpOnly: true,
      secure: true,
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
