// Community OS — Telegram Group Connection Challenge Generator
import { NextRequest, NextResponse } from 'next/server';
import { dbOperations, getDatabase } from '@/lib/db/store';
import { getAuthenticatedUserFromRequest, getUserRoleInCommunity } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { communityId } = body;

    const authUser = await getAuthenticatedUserFromRequest(req);
    const actorId = authUser?.id || 'usr_sarah';
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
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      try {
        const getMeRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
        const getMeJson = await getMeRes.json();
        if (getMeJson.ok && getMeJson.result?.username) {
          botUsername = getMeJson.result.username;
        }
      } catch {}
    }

    const challenge = dbOperations.createGroupConnectionChallenge(communityId, actorId, 'telegram');

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
