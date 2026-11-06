import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';

/**
 * Legacy HMAC Login Widget endpoint is deprecated in favor of official Telegram OpenID Connect (OIDC).
 * Directs clients to /api/auth/telegram/authorize.
 */
export async function GET(req: NextRequest) {
  const appUrl = getVerifiedAppUrl();
  return NextResponse.redirect(`${appUrl}/api/auth/telegram/authorize?redirect=true`);
}

export async function POST(req: NextRequest) {
  const appUrl = getVerifiedAppUrl();
  return NextResponse.json(
    {
      success: false,
      deprecated: true,
      error: 'The legacy HMAC Login Widget has been replaced with the official Telegram OpenID Connect flow.',
      authorizationEndpoint: `${appUrl}/api/auth/telegram/authorize`
    },
    { status: 400 }
  );
}
