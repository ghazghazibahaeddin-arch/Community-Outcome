// Community OS — Telegram Group Connection Challenge Generator
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, ensureDatabaseHydrated, getDatabase, persistDatabaseNow } from '@/lib/db/store';
import { getAuthenticatedUserFromRequest, getUserRoleInCommunity } from '@/lib/services/auth';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const body = (await req.json()) as { communityId?: string };
    const { communityId } = body;

    if (!communityId) {
      return NextResponse.json({ success: false, error: 'communityId is required' }, { status: 400 });
    }

    await ensureDatabaseHydrated(env);
    const authUser = await getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const actorId = authUser.id;
    const role = getUserRoleInCommunity(actorId, communityId);

    if (!['platform_admin', 'community_owner', 'admin'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: only community owners can generate connection challenges' }, { status: 403 });
    }

    const db = getDatabase();
    const community = db.communities.find(c => c.id === communityId);
    if (!community) {
      return NextResponse.json({ success: false, error: 'Community not found' }, { status: 404 });
    }

    // Determine bot identity
    let botUsername = 'CommunityOutcomeBot';
    const token = env.TELEGRAM_BOT_TOKEN;
    if (token) {
      try {
        const getMeRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
        const getMeJson = (await getMeRes.json()) as any;
        if (getMeJson.ok && getMeJson.result?.username) {
          botUsername = getMeJson.result.username;
        }
      } catch (err) {
        console.warn('[Telegram Challenge] Failed to fetch bot username from getMe:', err);
      }
    }

    const challenge = dbOperations.createGroupConnectionChallenge(communityId, actorId, 'telegram');
    await persistDatabaseNow(env);

    return NextResponse.json({
      success: true,
      challenge: {
        code: challenge.code,
        command: `/connect ${challenge.code}`,
        expiresAt: challenge.expiresAt,
        botUsername,
        botLink: `https://t.me/${botUsername}?startgroup=true`,
        communityName: community.name,
        instructions: [
          `1. Open Telegram and add @${botUsername} to your community group.`,
          `2. Promote @${botUsername} to Administrator with "Send Messages" and "Pin Messages" permissions.`,
          `3. Inside the group, send: /connect ${challenge.code}`,
          `4. Community OS webhook will verify your admin permissions and link the group instantly.`
        ]
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
