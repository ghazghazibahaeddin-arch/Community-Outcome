import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, saveDatabase } from '@/lib/db/store';
import {
  createSession,
  getAuthenticatedUserFromRequest,
  setSessionCookie
} from '@/lib/services/auth';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';
import {
  exchangeTelegramAuthorizationCode,
  TelegramOidcSessionState,
  TELEGRAM_OIDC_COOKIE_NAME,
  verifyTelegramIdToken
} from '@/lib/services/telegramOidc';
import { User } from '@/lib/types';

/**
 * Handles the official Telegram OpenID Connect (OIDC) callback.
 * 1. Validates CSRF state against the stored HttpOnly cookie.
 * 2. Exchanges authorization code with PKCE code_verifier.
 * 3. Verifies Telegram ID Token JWT via RS256 JWKS, checks issuer, audience, exp, and nonce.
 * 4. Resolves or creates user, provisions session with SameSite=Lax HttpOnly cookie.
 */
export async function GET(req: NextRequest) {
  const appUrl = getVerifiedAppUrl();
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  // Handle Telegram provider-level cancellation / rejection
  if (errorParam) {
    const errorDesc = url.searchParams.get('error_description') || errorParam;
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent(`Telegram login error: ${errorDesc}`)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Missing code or state in Telegram OIDC callback')}`
    );
  }

  // Retrieve stored PKCE state cookie
  const cookieValue = req.cookies.get(TELEGRAM_OIDC_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Missing Telegram OIDC state cookie or session expired')}`
    );
  }

  let sessionState: TelegramOidcSessionState;
  try {
    sessionState = JSON.parse(cookieValue);
  } catch {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Corrupted Telegram OIDC state cookie')}`
    );
  }

  // Verify state
  if (sessionState.state !== state) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Telegram OIDC state mismatch (possible CSRF attack)')}`
    );
  }

  // Check state age (10 minutes)
  if (Date.now() - sessionState.createdAt > 10 * 60 * 1000) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent('Telegram OIDC session has expired')}`
    );
  }

  // 1. Exchange authorization code with PKCE code_verifier
  const exchangeResult = await exchangeTelegramAuthorizationCode({
    code,
    codeVerifier: sessionState.codeVerifier,
    redirectUri: sessionState.redirectUri
  });

  if (!exchangeResult.success || !exchangeResult.idToken) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent(exchangeResult.error || 'Failed to exchange authorization code')}`
    );
  }

  // 2. Server-side JWKS signature verification, issuer, audience, expiration, and nonce checks
  const tokenVerification = await verifyTelegramIdToken(
    exchangeResult.idToken,
    sessionState.nonce,
    sessionState.clientId
  );

  if (!tokenVerification.valid || !tokenVerification.payload) {
    return NextResponse.redirect(
      `${appUrl}/?auth_error=${encodeURIComponent(tokenVerification.error || 'Invalid Telegram ID Token')}`
    );
  }

  const payload = tokenVerification.payload;
  const telegramSub = payload.sub;
  const username = payload.preferred_username || payload.username;
  const displayName =
    payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(' ') || username || `tg_${telegramSub}`;

  const db = getDatabase();
  if (!db.users) db.users = [];

  // Check if an existing logged-in user is linking their Telegram account
  const existingSessionUser = await getAuthenticatedUserFromRequest(req);
  if (existingSessionUser) {
    const userToUpdate = db.users.find((u) => u.id === existingSessionUser.id);
    if (userToUpdate) {
      if (!userToUpdate.identities) userToUpdate.identities = {};
      userToUpdate.identities.telegramId = telegramSub;
      if (username) userToUpdate.identities.telegramUsername = username;
      saveDatabase(db);

      const redirectRes = NextResponse.redirect(
        `${appUrl}/?tab=member&connected=telegram`
      );
      // Clear OIDC state cookie
      redirectRes.cookies.set({
        name: TELEGRAM_OIDC_COOKIE_NAME,
        value: '',
        path: '/',
        maxAge: 0
      });
      return redirectRes;
    }
  }

  // Resolve user by verified Telegram ID
  let user = db.users.find((u) => u.identities?.telegramId === telegramSub);

  if (!user) {
    const newUserId = `usr_tg_${telegramSub}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id: newUserId,
      name: displayName,
      email: username ? `${username.toLowerCase()}@telegram.user` : `tg_${telegramSub}@telegram.user`,
      avatar: payload.picture || `https://picsum.photos/seed/${newUserId}/200/200`,
      bio: 'Verified Telegram community member.',
      platformRole: 'user',
      createdAt: now,
      identities: {
        telegramId: telegramSub,
        telegramUsername: username
      },
      passport: {
        displayName,
        biography: 'Verified Telegram community member.',
        skills: [{ id: 'sk_tg', name: 'Telegram Operations', level: 'intermediate', verified: true, endorsementsCount: 1 }],
        interests: ['Decentralized Communities', 'Collaboration'],
        languages: ['English'],
        collaborationPreferences: 'Available for community tasks and verification.',
        portfolioLinks: [],
        isPublic: true
      },
      privacy: {
        showBio: true,
        showSkills: true,
        showVerifiedOnly: false,
        allowDiscovery: true,
        allowCrossCommunitySharing: false,
        shareableRecordIds: []
      }
    };

    db.users.push(newUser);
    saveDatabase(db);
    user = newUser;
  } else {
    // Update identity record
    if (!user.identities) user.identities = {};
    user.identities.telegramId = telegramSub;
    if (username) user.identities.telegramUsername = username;
    saveDatabase(db);
  }

  // Create persistent session
  const session = createSession(user.id, req.headers.get('user-agent') || undefined);

  // Return redirect with secure HttpOnly SameSite=Lax cookie.
  // Note: Session token is NEVER exposed in the URL query parameters!
  const redirectRes = NextResponse.redirect(
    `${appUrl}/?tab=member&login_success=true&provider=telegram`
  );
  setSessionCookie(redirectRes, session.token, { isCrossSite: false });

  // Clear the OIDC transient state cookie
  redirectRes.cookies.set({
    name: TELEGRAM_OIDC_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0
  });

  return redirectRes;
}
