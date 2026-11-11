import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

/**
 * Legacy HMAC Login Widget endpoint is deprecated in favor of official Telegram OpenID Connect (OIDC).
 * Directs clients to /api/auth/telegram/authorize.
 */
export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  const appUrl = getVerifiedAppUrl(env);
  return NextResponse.redirect(`${appUrl}/api/auth/telegram/authorize?redirect=true`);
}

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  const appUrl = getVerifiedAppUrl(env);
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
