import { NextRequest, NextResponse } from 'next/server';
import {
  getCommunitySubscription,
  getCommunityEntitlements,
  WHOP_PRO_CHECKOUT_URL,
  PRO_PLAN_PRICE_USD,
  PLAN_DEFINITIONS
} from '@/lib/services/subscriptionService';
import { getAuthenticatedUserFromRequest, getUserRoleInCommunity } from '@/lib/services/auth';

/**
 * GET /api/billing/subscription?communityId=comm_devforge
 * Returns active subscription tier, limits, entitlement breakdown and Whop checkout URL
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const communityId = url.searchParams.get('communityId') || 'comm_devforge';

    const authUser = await getAuthenticatedUserFromRequest(req);
    const userRole = authUser ? getUserRoleInCommunity(authUser.id, communityId) : 'guest';
    const isOwner = ['platform_admin', 'community_owner', 'admin'].includes(userRole);

    const subscription = getCommunitySubscription(communityId);
    const entitlements = getCommunityEntitlements(communityId);

    const checkoutUrl = `${WHOP_PRO_CHECKOUT_URL}?custom_community_id=${encodeURIComponent(communityId)}&email=${encodeURIComponent(authUser?.email || '')}`;

    return NextResponse.json({
      success: true,
      communityId,
      isOwner,
      userRole,
      subscription,
      entitlements,
      plans: PLAN_DEFINITIONS,
      checkout: {
        provider: 'whop',
        priceMonthlyUsd: PRO_PLAN_PRICE_USD,
        productName: 'Community Pro',
        checkoutUrl,
        providerConfigured: Boolean(process.env.WHOP_COMPANY_API_KEY || process.env.WHOP_API_KEY || process.env.WHOP_WEBHOOK_SECRET)
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
