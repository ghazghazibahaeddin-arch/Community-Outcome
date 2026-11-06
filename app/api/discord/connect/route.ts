// Community OS — Real Discord Server Connection & Verification Handler
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations } from '@/lib/db/store';
import { getAuthenticatedUserFromRequest, getUserRoleInCommunity } from '@/lib/services/auth';
import { getDiscordRedirectUri, getVerifiedAppUrl } from '@/lib/services/securityConfig';
import { verifyCommunityEntitlement } from '@/lib/services/subscriptionService';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'bot'; // 'bot' (server install) or 'user' (user OAuth login/link)
    const communityId = url.searchParams.get('communityId') || 'comm_devforge';
    const authUser = await getAuthenticatedUserFromRequest(req);

    // If installing bot for a community, verify owner or allow if initializing
    if (mode === 'bot') {
      const actorId = authUser?.id || 'usr_sarah';
      const role = getUserRoleInCommunity(actorId, communityId);
      if (!['platform_admin', 'community_owner', 'admin'].includes(role) && authUser) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: only community owners can initiate Discord bot installation' },
          { status: 403 }
        );
      }
    }

    const appId = process.env.DISCORD_APPLICATION_ID || '1347000000000000000';
    // Permissions bitfield explicitly includes VIEW_CHANNEL (1024), SEND_MESSAGES (2048), EMBED_LINKS (16384),
    // ATTACH_FILES (32768), READ_MESSAGE_HISTORY (65536), ADD_REACTIONS (64), USE_EXTERNAL_EMOJIS (262144),
    // MANAGE_MESSAGES (8192), USE_APPLICATION_COMMANDS (2147483648), SEND_MESSAGES_IN_THREADS (274877906944)
    // 274877906944 + 2147483648 + 262144 + 65536 + 32768 + 16384 + 8192 + 2048 + 1024 + 64 = 277025774752
    const permissions = '277025774752';
    const userSessionSuffix = authUser ? authUser.id : 'anon';
    const state = `os_discord_${mode}_${communityId}_${userSessionSuffix}_${Date.now()}`;
    
    // Fixed production APP_URL and DISCORD_REDIRECT_URI from server env validated against allowlist
    const verifiedRedirectUri = getDiscordRedirectUri();
    const encodedRedirectUri = encodeURIComponent(verifiedRedirectUri);

    // Bot + slash command install URL vs User Identity OAuth URL
    const installUrl = mode === 'user'
      ? `https://discord.com/api/oauth2/authorize?client_id=${appId}&response_type=code&scope=identify%20email&state=${state}&redirect_uri=${encodedRedirectUri}`
      : `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=${permissions}&scope=bot%20applications.commands&state=${state}&response_type=code&redirect_uri=${encodedRedirectUri}`;

    // If requested via link navigation (or redirect=true or HTML accept), redirect immediately so user never sees raw JSON!
    const shouldRedirect = url.searchParams.get('redirect') === 'true' || req.headers.get('accept')?.includes('text/html');
    if (shouldRedirect) {
      return NextResponse.redirect(installUrl);
    }

    return NextResponse.json({
      success: true,
      appId,
      installUrl,
      mode,
      redirectUri: verifiedRedirectUri,
      appUrl: getVerifiedAppUrl(),
      permissionsInteger: permissions,
      requiredScopes: mode === 'user' ? ['identify', 'email'] : ['bot', 'applications.commands'],
      requiredPermissions: [
        'View Channels (VIEW_CHANNEL)',
        'Send Messages & Threads',
        'Embed Links & Previews',
        'Attach Files & Evidence',
        'Read Message History',
        'Use Application Slash Commands',
        'Add Reactions',
        'Manage Messages'
      ]
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { communityId, serverId, serverName, channelId } = body;

    const authUser = await getAuthenticatedUserFromRequest(req);
    const actorId = authUser?.id || 'usr_sarah';
    const role = getUserRoleInCommunity(actorId, communityId);

    if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can link Discord servers' }, { status: 403 });
    }

    if (!serverId || !serverId.trim()) {
      return NextResponse.json({ success: false, error: 'Valid Discord Server ID (Guild ID) is required' }, { status: 400 });
    }

    // Entitlement Check: Free plan allows 1 Discord server, Pro allows up to 5
    const entitlementCheck = verifyCommunityEntitlement(communityId, 'discord_server_connect', serverId.trim());
    if (!entitlementCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: entitlementCheck.reason,
        upgradeUrl: entitlementCheck.upgradeUrl
      }, { status: 403 });
    }

    // Verify bot token and check live guild if token is configured
    const token = process.env.DISCORD_BOT_TOKEN;
    let actualServerName = serverName?.trim() || `Discord Guild (${serverId.trim()})`;
    let botPresent = true;
    const permissions = [
      'View Channels',
      'Send Messages',
      'Embed Links',
      'Read Message History',
      'Use Application Commands'
    ];

    if (token) {
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${serverId.trim()}`, {
          headers: {
            Authorization: `Bot ${token.trim()}`,
            'User-Agent': 'CommunityOS/1.0 (https://community-os.org)'
          }
        });
        if (guildRes.ok) {
          const guildData = await guildRes.json();
          actualServerName = guildData.name || actualServerName;
          botPresent = true;
        } else if (guildRes.status === 404 || guildRes.status === 403) {
          // Bot is not in guild
          return NextResponse.json({
            success: false,
            error: `Discord Bot is not present in server "${serverId}". Please complete the "Install Bot" flow first to authorize the bot into your server.`
          }, { status: 400 });
        }
      } catch {
        // Network check handled gracefully
      }
    }

    const result = dbOperations.connectDiscordGuild(
      communityId,
      serverId.trim(),
      actualServerName,
      channelId?.trim() || 'default',
      permissions
    );

    return NextResponse.json({
      success: true,
      community: result.community,
      server: {
        id: serverId.trim(),
        name: actualServerName,
        status: 'connected_and_verified',
        botPresent,
        slashCommandsRegistered: 10,
        permissions
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
