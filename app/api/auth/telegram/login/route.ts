import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, getDatabase, saveDatabase } from '@/lib/db/store';
import {
  createSession,
  getAuthenticatedUserFromRequest,
  setSessionCookie,
  verifyTelegramAuthData
} from '@/lib/services/auth';
import { User } from '@/lib/types';

function getAppBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https:') ? 'https' : 'http');
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  return new URL(req.url).origin.replace(/\/$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    if (!id || !hash) {
      return NextResponse.json(
        { success: false, error: 'Telegram authentication payload is incomplete (missing id or hash)' },
        { status: 400 }
      );
    }

    const authData: Record<string, string> = {
      id: String(id),
      auth_date: String(auth_date || Math.floor(Date.now() / 1000)),
      hash: String(hash)
    };
    if (first_name) authData.first_name = String(first_name);
    if (last_name) authData.last_name = String(last_name);
    if (username) authData.username = String(username);
    if (photo_url) authData.photo_url = String(photo_url);

    // Cryptographic HMAC Verification against TELEGRAM_BOT_TOKEN
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const verification = verifyTelegramAuthData(authData, botToken);
    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || 'Invalid Telegram authentication signature. Check bot token configuration.'
        },
        { status: 401 }
      );
    }

    const db = getDatabase();
    if (!db.users) db.users = [];

    // Check if user is already logged in (account linking mode)
    const existingSessionUser = await getAuthenticatedUserFromRequest(req);
    if (existingSessionUser) {
      const u = db.users.find((usr) => usr.id === existingSessionUser.id);
      if (u) {
        if (!u.identities) u.identities = {};
        u.identities.telegramId = String(id);
        if (username) u.identities.telegramUsername = String(username);
        saveDatabase(db);
        return NextResponse.json({
          success: true,
          mode: 'linked',
          user: u,
          message: 'Telegram account successfully linked to your Community OS passport.'
        });
      }
    }

    // Find existing user by Telegram ID
    let user = db.users.find((u) => u.identities?.telegramId === String(id));

    if (!user) {
      const displayName = [first_name, last_name].filter(Boolean).join(' ') || username || `tg_${id}`;
      const newUserId = `usr_tg_${id}`;
      const now = new Date().toISOString();

      const newUser: User = {
        id: newUserId,
        name: displayName,
        email: username ? `${username.toLowerCase()}@telegram.user` : `tg_${id}@telegram.user`,
        avatar: photo_url || `https://picsum.photos/seed/${newUserId}/200/200`,
        bio: 'Telegram verified community member.',
        platformRole: 'user',
        createdAt: now,
        identities: {
          telegramId: String(id),
          telegramUsername: username ? String(username) : undefined
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
      // Update metadata
      if (!user.identities) user.identities = {};
      user.identities.telegramId = String(id);
      if (username) user.identities.telegramUsername = String(username);
      saveDatabase(db);
    }

    const session = createSession(user.id, req.headers.get('user-agent') || undefined);
    const res = NextResponse.json({
      success: true,
      user,
      sessionToken: session.token
    });
    setSessionCookie(res, session.token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const first_name = url.searchParams.get('first_name');
    const last_name = url.searchParams.get('last_name');
    const username = url.searchParams.get('username');
    const photo_url = url.searchParams.get('photo_url');
    const auth_date = url.searchParams.get('auth_date');
    const hash = url.searchParams.get('hash');

    const appUrl = getAppBaseUrl(req);

    if (!id || !hash) {
      return NextResponse.redirect(`${appUrl}/?auth_error=${encodeURIComponent('Incomplete Telegram login payload')}`);
    }

    const authData: Record<string, string> = {
      id: String(id),
      auth_date: String(auth_date || Math.floor(Date.now() / 1000)),
      hash: String(hash)
    };
    if (first_name) authData.first_name = String(first_name);
    if (last_name) authData.last_name = String(last_name);
    if (username) authData.username = String(username);
    if (photo_url) authData.photo_url = String(photo_url);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const verification = verifyTelegramAuthData(authData, botToken);
    if (!verification.valid) {
      return NextResponse.redirect(
        `${appUrl}/?auth_error=${encodeURIComponent(verification.error || 'Invalid Telegram HMAC signature')}`
      );
    }

    const db = getDatabase();
    if (!db.users) db.users = [];

    let user = db.users.find((u) => u.identities?.telegramId === String(id));
    if (!user) {
      const displayName = [first_name, last_name].filter(Boolean).join(' ') || username || `tg_${id}`;
      const newUserId = `usr_tg_${id}`;
      const now = new Date().toISOString();

      const newUser: User = {
        id: newUserId,
        name: displayName,
        email: username ? `${username.toLowerCase()}@telegram.user` : `tg_${id}@telegram.user`,
        avatar: photo_url || `https://picsum.photos/seed/${newUserId}/200/200`,
        bio: 'Telegram verified community member.',
        platformRole: 'user',
        createdAt: now,
        identities: {
          telegramId: String(id),
          telegramUsername: username ? String(username) : undefined
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
    }

    const session = createSession(user.id, req.headers.get('user-agent') || undefined);
    const res = NextResponse.redirect(`${appUrl}/?session_token=${session.token}&connected_platform=telegram&login_success=true`);
    setSessionCookie(res, session.token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const appUrl = getAppBaseUrl(req);
    return NextResponse.redirect(`${appUrl}/?auth_error=${encodeURIComponent(message)}`);
  }
}
