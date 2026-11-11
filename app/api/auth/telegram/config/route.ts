import { NextRequest, NextResponse } from 'next/server';
import { getTelegramRedirectUri, getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { getTelegramOidcClientId } from '@/lib/services/telegramOidc';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  const verifiedAppUrl = getVerifiedAppUrl(env);
  const redirectUri = getTelegramRedirectUri(env);
  const clientId = getTelegramOidcClientId(env);
  const botUsername = env.TELEGRAM_BOT_USERNAME || env.TELEGRAM_BOT_NAME || 'CommunityOutcomeBot';
  const hasToken = Boolean(env.TELEGRAM_BOT_TOKEN);

  return NextResponse.json({
    success: true,
    protocol: 'OpenID Connect (OIDC) with PKCE S256',
    botUsername,
    clientId,
    isConfigured: hasToken,
    allowedRedirectUrl: redirectUri,
    appUrl: verifiedAppUrl,
    endpoints: {
      authorization: 'https://oauth.telegram.org/auth',
      token: 'https://oauth.telegram.org/token',
      jwks: 'https://oauth.telegram.org/.well-known/jwks.json',
      localAuthorize: `${verifiedAppUrl}/api/auth/telegram/authorize`,
      localCallback: redirectUri
    },
    botFatherInstructions: [
      `1. Open Telegram and search for @BotFather.`,
      `2. Send /mybots and select @${botUsername}.`,
      `3. Select 'Bot Settings' -> 'OpenID Connect Login'.`,
      `4. Select 'Allowed Redirect URLs' and add this exact URL:`,
      `   ${redirectUri}`,
      `5. (Optional legacy fallback) If using Web Login domain, send /setdomain and enter:`,
      `   ${new URL(verifiedAppUrl).host}`
    ]
  });
}
