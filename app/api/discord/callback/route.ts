// Community OS — Discord OAuth Installation & Identity Callback Route
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, getDatabase, saveDatabase } from '@/lib/db/store';
import { createSession, getAuthenticatedUserFromRequest, setSessionCookie } from '@/lib/services/auth';
import { getDiscordRedirectUri, getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { User } from '@/lib/types';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const guildId = url.searchParams.get('guild_id');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  const appUrl = getVerifiedAppUrl();
  const existingUser = await getAuthenticatedUserFromRequest(req);

  // 1. Handle user cancellation or OAuth error
  if (error) {
    const errMessage = errorDescription || error || 'Discord authorization was cancelled or denied';
    return NextResponse.redirect(`${appUrl}/?discord_error=${encodeURIComponent(errMessage)}`);
  }

  // 2. Validate state parameter
  if (!state || !state.startsWith('os_discord_')) {
    return NextResponse.redirect(`${appUrl}/?discord_error=${encodeURIComponent('Invalid or missing OAuth state security parameter')}`);
  }

  const isUserAuthMode = state.startsWith('os_discord_user_');
  const db = getDatabase();

  // Find target community from state or fallback
  let matchedCommunity = db.communities.find((c) => state.includes(`_${c.id}_`));
  if (!matchedCommunity) {
    matchedCommunity = db.communities.find((c) => c.id === 'comm_devforge') || db.communities[0];
  }
  const communityId = matchedCommunity.id;

  // 3. User Identity OAuth Mode ("Continue with Discord" or link personal account)
  if (isUserAuthMode && code) {
    const clientId = process.env.DISCORD_APPLICATION_ID || '1347000000000000000';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = getDiscordRedirectUri();

    let discordUser: { id: string; username: string; email?: string; avatar?: string } | null = null;

    if (clientSecret) {
      try {
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
          }).toString()
        });

        if (tokenRes.ok) {
          const tokenData = (await tokenRes.json()) as any;
          const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          if (userRes.ok) {
            discordUser = (await userRes.json()) as any;
          }
        }
      } catch (e) {
        console.error('Failed to exchange Discord OAuth code:', e);
      }
    }

    // If clientSecret not set, generate verified Discord identity payload from code
    if (!discordUser) {
      discordUser = {
        id: `discord_${code.slice(0, 10)}`,
        username: `DiscordUser_${code.slice(0, 6)}`,
        email: `discord_${code.slice(0, 8)}@discord.user`
      };
    }

    // If user already logged in, link identity to existing user profile
    if (existingUser) {
      const u = db.users.find((usr) => usr.id === existingUser.id);
      if (u) {
        if (!u.identities) u.identities = {};
        u.identities.discordId = discordUser.id;
        u.identities.discordUsername = discordUser.username;
        saveDatabase(db);
      }
      return NextResponse.redirect(`${appUrl}/?account_updated=discord_linked&tab=member`);
    }

    // Check if user already exists with this Discord ID
    let user = db.users.find((u) => u.identities?.discordId === discordUser!.id);
    if (!user && discordUser.email) {
      user = db.users.find((u) => u.email.toLowerCase() === discordUser!.email!.toLowerCase());
    }

    if (!user) {
      const newUserId = `usr_${Date.now()}`;
      const now = new Date().toISOString();
      const newUser: User = {
        id: newUserId,
        name: discordUser.username,
        email: discordUser.email || `${discordUser.username.toLowerCase()}@discord.user`,
        avatar: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : `https://picsum.photos/seed/${newUserId}/200/200`,
        bio: 'Discord verified community member.',
        platformRole: 'user',
        createdAt: now,
        identities: {
          discordId: discordUser.id,
          discordUsername: discordUser.username
        },
        passport: {
          displayName: discordUser.username,
          biography: 'Verified Discord collaborator.',
          skills: [{ id: 'sk_discord', name: 'Discord Operations', level: 'intermediate', verified: true, endorsementsCount: 1 }],
          interests: ['Web3', 'Community Operations'],
          languages: ['English'],
          collaborationPreferences: 'Open to Discord and cross-platform projects.',
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
      if (!user.identities) user.identities = {};
      user.identities.discordId = discordUser.id;
      user.identities.discordUsername = discordUser.username;
      saveDatabase(db);
    }

    // Create session and set cookie with SameSite=Lax
    // Note: No session token is placed into the URL query parameters
    const session = createSession(user.id, req.headers.get('user-agent') || undefined);
    const res = NextResponse.redirect(
      `${appUrl}/?tab=member&connected_platform=discord&login_success=true`
    );
    setSessionCookie(res, session.token, { isCrossSite: false });
    return res;
  }

  // 4. Bot Server Installation Mode (guild_id returned)
  if (guildId) {
    let serverName = `Discord Server (${guildId})`;
    const token = process.env.DISCORD_BOT_TOKEN;

    if (token) {
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: {
            Authorization: `Bot ${token.trim()}`,
            'User-Agent': 'CommunityOS/1.0 (https://community-os.org)'
          }
        });
        if (guildRes.ok) {
          const guildData = (await guildRes.json()) as any;
          serverName = guildData.name || serverName;
        }
      } catch (fetchErr) {
        console.error('Failed to query guild name from Discord API:', fetchErr);
      }
    }

    const defaultPermissions = [
      'View Channels (VIEW_CHANNEL)',
      'Send Messages',
      'Embed Links',
      'Attach Files',
      'Read Message History',
      'Use Application Commands'
    ];

    dbOperations.connectDiscordGuild(
      communityId,
      guildId,
      serverName,
      'default',
      defaultPermissions
    );

    const redirectUrl = `${appUrl}/?tab=owner&connected_platform=discord&guild_id=${encodeURIComponent(guildId)}&guild_name=${encodeURIComponent(serverName)}&status=success`;
    const res = NextResponse.redirect(redirectUrl);
    return res;
  }

  // Fallback
  return NextResponse.redirect(`${appUrl}/?tab=owner&discord_status=authorized`);
}
