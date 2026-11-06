import { NextRequest, NextResponse } from 'next/server';
import { getTelegramRedirectUri, getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { getTelegramOidcClientId } from '@/lib/services/telegramOidc';

export async function GET(req: NextRequest) {
  const verifiedAppUrl = getVerifiedAppUrl();
  const redirectUri = getTelegramRedirectUri();
  const clientId = getTelegramOidcClientId();
  const botUsername = process.env.TELEGRAM_BOT_NAME || 'CommunityOutcomeBot';
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);

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
