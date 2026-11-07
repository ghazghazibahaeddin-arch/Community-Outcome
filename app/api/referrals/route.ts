import { NextRequest, NextResponse } from 'next/server';
import { createOrGetReferral, trackReferralEvent } from '@/lib/services/subscriptionService';
import { getAuthenticatedUserFromRequest } from '@/lib/services/auth';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';

/**
 * GET /api/referrals?code=ref_xxx
 * Resolves referral code and records a click event
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing referral code' }, { status: 400 });
    }

    const result = trackReferralEvent(code, 'click');
    if (!result.success || !result.referral) {
      return NextResponse.json({ success: false, error: 'Referral code not found' }, { status: 404 });
    }

    const appUrl = getVerifiedAppUrl();
    const ref = result.referral;

    // Generate redirect target URL based on target type
    let targetPath = `/?ref=${code}&communityId=${ref.communityId}`;
    if (ref.targetType === 'request' && ref.targetId) {
      targetPath = `/?ref=${code}&communityId=${ref.communityId}&tab=requests&requestId=${ref.targetId}`;
    } else if (ref.targetType === 'task' && ref.targetId) {
      targetPath = `/?ref=${code}&communityId=${ref.communityId}&tab=tasks&taskId=${ref.targetId}`;
    } else if (ref.targetType === 'passport' && ref.targetId) {
      targetPath = `/p/${ref.targetId}?ref=${code}`;
    }

    return NextResponse.json({
      success: true,
      referral: ref,
      targetUrl: `${appUrl}${targetPath}`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/referrals
 * Generates or retrieves a shareable viral invitation / referral link
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUserFromRequest(req);
    const body = (await req.json()) as { communityId?: string; targetType?: 'passport' | 'community' | 'request' | 'task'; targetId?: string };
    const { communityId, targetId } = body;
    const targetType: 'passport' | 'community' | 'request' | 'task' =
      body.targetType && ['passport', 'community', 'request', 'task'].includes(body.targetType)
        ? body.targetType
        : 'community';

    if (!communityId) {
      return NextResponse.json({ success: false, error: 'communityId is required' }, { status: 400 });
    }

    const referrerUserId = authUser?.id || 'usr_guest';
    const referral = createOrGetReferral({
      communityId,
      referrerUserId,
      targetType,
      targetId
    });

    const appUrl = getVerifiedAppUrl();
    let shareUrl = `${appUrl}/?ref=${referral.referralCode}&communityId=${communityId}`;
    if (targetType === 'request' && targetId) {
      shareUrl = `${appUrl}/?ref=${referral.referralCode}&communityId=${communityId}&tab=requests&requestId=${targetId}`;
    } else if (targetType === 'task' && targetId) {
      shareUrl = `${appUrl}/?ref=${referral.referralCode}&communityId=${communityId}&tab=tasks&taskId=${targetId}`;
    } else if (targetType === 'passport' && targetId) {
      shareUrl = `${appUrl}/p/${targetId}?ref=${referral.referralCode}`;
    }

    return NextResponse.json({
      success: true,
      referral,
      shareUrl
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
