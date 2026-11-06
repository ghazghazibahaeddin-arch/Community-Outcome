// Community OS — Plan Entitlements & Subscription Enforcement Service
import {
  PlanTier,
  PlanEntitlements,
  CommunitySubscription,
  SubscriptionStatus,
  PaymentProvider,
  PaymentWebhookEvent,
  ReferralRecord
} from '@/lib/types';
import { getDatabase, saveDatabase } from '@/lib/db/store';

import {
  WHOP_PRO_CHECKOUT_URL,
  PRO_PLAN_PRICE_USD,
  PLAN_DEFINITIONS
} from '@/lib/plans';

export { WHOP_PRO_CHECKOUT_URL, PRO_PLAN_PRICE_USD, PLAN_DEFINITIONS };

/**
 * Get active subscription for a community. Defaults to Free if none exists or if expired.
 */
export function getCommunitySubscription(communityId: string): CommunitySubscription {
  const db = getDatabase();
  if (!db.subscriptions) db.subscriptions = [];

  let sub = db.subscriptions.find((s) => s.communityId === communityId);
  const now = new Date();

  if (!sub) {
    const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    sub = {
      id: `sub_free_${communityId}`,
      communityId,
      tier: 'free',
      status: 'active',
      provider: 'manual',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      amountUsd: 0,
      currency: 'USD',
      billingInterval: 'month',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    db.subscriptions.push(sub);
    saveDatabase(db);
    return sub;
  }

  // Graceful handling of expired periods without deleting community data
  if (sub.tier === 'pro' && sub.currentPeriodEnd) {
    const expiry = new Date(sub.currentPeriodEnd);
    if (now > expiry && sub.status === 'active') {
      sub.status = 'expired';
      sub.tier = 'free'; // graceful fallback to Free
      sub.updatedAt = now.toISOString();
      saveDatabase(db);
    }
  }

  return sub;
}

/**
 * Retrieve effective entitlements for a community based on its subscription status.
 */
export function getCommunityEntitlements(communityId: string): PlanEntitlements & {
  subscription: CommunitySubscription;
  currentUsage: {
    membersCount: number;
    discordServersCount: number;
    telegramGroupsCount: number;
  };
} {
  const sub = getCommunitySubscription(communityId);
  const isPro = sub.tier === 'pro' && sub.status === 'active';
  const effectiveTier: PlanTier = isPro ? 'pro' : 'free';
  const plan = PLAN_DEFINITIONS[effectiveTier];

  const db = getDatabase();
  const comm = db.communities?.find((c) => c.id === communityId);
  const membersCount = (db.memberships || []).filter((m) => m.communityId === communityId).length;
  const discordServersCount = comm?.connectedDiscordServers?.length || (comm?.discordConfig?.connected ? 1 : 0);
  const telegramGroupsCount = comm?.connectedTelegramGroups?.length || (comm?.telegramConfig?.connected ? 1 : 0);

  return {
    ...plan,
    subscription: sub,
    currentUsage: {
      membersCount,
      discordServersCount,
      telegramGroupsCount
    }
  };
}

/**
 * Check if a specific Pro feature or resource limit is allowed for a community.
 */
export function verifyCommunityEntitlement(
  communityId: string,
  feature:
    | 'discord_server_connect'
    | 'telegram_group_connect'
    | 'member_limit'
    | 'advanced_automations'
    | 'scheduled_publishing'
    | 'advanced_analytics'
    | 'custom_branding'
    | 'api_webhooks'
    | 'community_shield_advanced',
  candidateId?: string
): { allowed: boolean; reason?: string; currentTier: PlanTier; upgradeUrl?: string } {
  const entitlements = getCommunityEntitlements(communityId);
  const isPro = entitlements.subscription.tier === 'pro' && entitlements.subscription.status === 'active';
  const upgradeUrl = `${WHOP_PRO_CHECKOUT_URL}?custom_community_id=${encodeURIComponent(communityId)}`;

  switch (feature) {
    case 'discord_server_connect': {
      // If candidateId matches existing primary server or is in connected servers, allow update/re-verification
      if (candidateId) {
        const db = getDatabase();
        const comm = db.communities?.find((c) => c.id === communityId);
        const isAlreadyConnected =
          comm?.discordConfig?.serverId === candidateId ||
          comm?.connectedDiscordServers?.some((s) => s.serverId === candidateId);
        if (isAlreadyConnected) {
          return { allowed: true, currentTier: entitlements.tier };
        }
      }
      if (entitlements.currentUsage.discordServersCount >= entitlements.maxDiscordServers) {
        return {
          allowed: false,
          currentTier: entitlements.tier,
          upgradeUrl,
          reason: `Discord server limit reached (${entitlements.currentUsage.discordServersCount}/${entitlements.maxDiscordServers}). ${
            isPro ? 'Maximum 5 servers reached.' : 'Free plan allows 1 server. Upgrade to Community Pro for up to 5 servers.'
          }`
        };
      }
      return { allowed: true, currentTier: entitlements.tier };
    }

    case 'telegram_group_connect':
      if (entitlements.currentUsage.telegramGroupsCount >= entitlements.maxTelegramGroups) {
        return {
          allowed: false,
          currentTier: entitlements.tier,
          upgradeUrl,
          reason: `Telegram group limit reached (${entitlements.currentUsage.telegramGroupsCount}/${entitlements.maxTelegramGroups}). ${
            isPro ? 'Maximum 5 groups reached.' : 'Free plan allows 1 group. Upgrade to Community Pro for up to 5 groups.'
          }`
        };
      }
      return { allowed: true, currentTier: entitlements.tier };

    case 'member_limit':
      if (entitlements.currentUsage.membersCount >= entitlements.maxMonthlyActiveMembers) {
        return {
          allowed: false,
          currentTier: entitlements.tier,
          upgradeUrl,
          reason: `Active member limit reached (${entitlements.currentUsage.membersCount}/${entitlements.maxMonthlyActiveMembers}). Upgrade to Community Pro for up to 1,000 members.`
        };
      }
      return { allowed: true, currentTier: entitlements.tier };

    case 'advanced_automations':
    case 'scheduled_publishing':
    case 'advanced_analytics':
    case 'custom_branding':
    case 'api_webhooks':
    case 'community_shield_advanced':
      if (!isPro) {
        return {
          allowed: false,
          currentTier: 'free',
          upgradeUrl,
          reason: `This feature requires Community Pro ($15/month). Upgrade to unlock advanced capabilities.`
        };
      }
      return { allowed: true, currentTier: 'pro' };

    default:
      return { allowed: true, currentTier: entitlements.tier };
  }
}

/**
 * Idempotent update or creation of a subscription from a verified payment webhook.
 * Never trusts frontend query params or unverified client assertions.
 */
export function applySubscriptionUpdate(params: {
  communityId: string;
  provider: PaymentProvider;
  tier: PlanTier;
  status: SubscriptionStatus;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  providerPlanId?: string;
  eventId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}): { success: boolean; subscription: CommunitySubscription } {
  const db = getDatabase();
  if (!db.subscriptions) db.subscriptions = [];

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

  let sub = db.subscriptions.find((s) => s.communityId === params.communityId);

  if (!sub) {
    sub = {
      id: `sub_${Date.now()}`,
      communityId: params.communityId,
      tier: params.tier,
      status: params.status,
      provider: params.provider,
      providerCustomerId: params.providerCustomerId,
      providerSubscriptionId: params.providerSubscriptionId,
      providerPlanId: params.providerPlanId,
      currentPeriodStart: params.currentPeriodStart || now.toISOString(),
      currentPeriodEnd: params.currentPeriodEnd || nextMonth.toISOString(),
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      amountUsd: params.tier === 'pro' ? PRO_PLAN_PRICE_USD : 0,
      currency: 'USD',
      billingInterval: 'month',
      lastPaymentEventId: params.eventId,
      lastPaymentAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    db.subscriptions.push(sub);
  } else {
    sub.tier = params.tier;
    sub.status = params.status;
    sub.provider = params.provider;
    if (params.providerCustomerId) sub.providerCustomerId = params.providerCustomerId;
    if (params.providerSubscriptionId) sub.providerSubscriptionId = params.providerSubscriptionId;
    if (params.providerPlanId) sub.providerPlanId = params.providerPlanId;
    if (params.currentPeriodStart) sub.currentPeriodStart = params.currentPeriodStart;
    if (params.currentPeriodEnd) sub.currentPeriodEnd = params.currentPeriodEnd;
    if (params.cancelAtPeriodEnd !== undefined) sub.cancelAtPeriodEnd = params.cancelAtPeriodEnd;
    if (params.eventId) sub.lastPaymentEventId = params.eventId;
    sub.lastPaymentAt = now.toISOString();
    sub.amountUsd = params.tier === 'pro' ? PRO_PLAN_PRICE_USD : 0;
    sub.updatedAt = now.toISOString();
  }

  // Record audit log
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `aud_sub_${Date.now()}`,
    communityId: params.communityId,
    actorId: 'system_billing',
    action: `subscription_${params.tier}_${params.status}`,
    details: `Subscription updated to ${params.tier.toUpperCase()} (${params.status}) via ${params.provider}`,
    timestamp: now.toISOString()
  });

  saveDatabase(db);
  return { success: true, subscription: sub };
}

/**
 * Graceful subscription downgrade to Free
 */
export function downgradeToFree(communityId: string, reason = 'subscription_cancelled'): CommunitySubscription {
  const db = getDatabase();
  const sub = getCommunitySubscription(communityId);
  sub.tier = 'free';
  sub.status = 'canceled';
  sub.canceledAt = new Date().toISOString();
  sub.updatedAt = new Date().toISOString();

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `aud_downgrade_${Date.now()}`,
    communityId,
    actorId: 'system_billing',
    action: 'subscription_downgrade_free',
    details: `Gracefully downgraded to Free plan. Community data preserved. Reason: ${reason}`,
    timestamp: new Date().toISOString()
  });

  saveDatabase(db);
  return sub;
}

/**
 * Record and track viral referral / invitation links
 */
export function createOrGetReferral(params: {
  communityId: string;
  referrerUserId: string;
  targetType: 'community' | 'request' | 'task' | 'passport';
  targetId?: string;
}): ReferralRecord {
  const db = getDatabase();
  if (!db.referrals) db.referrals = [];

  const existing = db.referrals.find(
    (r) =>
      r.communityId === params.communityId &&
      r.referrerUserId === params.referrerUserId &&
      r.targetType === params.targetType &&
      r.targetId === params.targetId
  );

  if (existing) return existing;

  const referralCode = `ref_${params.targetType.slice(0, 3)}_${Math.random().toString(36).substring(2, 9)}`;
  const record: ReferralRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    referralCode,
    communityId: params.communityId,
    referrerUserId: params.referrerUserId,
    targetType: params.targetType,
    targetId: params.targetId,
    clicksCount: 0,
    conversionsCount: 0,
    createdAt: new Date().toISOString()
  };

  db.referrals.push(record);
  saveDatabase(db);
  return record;
}

/**
 * Record a referral click or conversion
 */
export function trackReferralEvent(
  referralCode: string,
  eventType: 'click' | 'conversion',
  referredUserId?: string
): { success: boolean; referral?: ReferralRecord } {
  const db = getDatabase();
  if (!db.referrals) db.referrals = [];

  const referral = db.referrals.find((r) => r.referralCode === referralCode);
  if (!referral) return { success: false };

  if (eventType === 'click') {
    referral.clicksCount += 1;
    referral.lastClickedAt = new Date().toISOString();
  } else if (eventType === 'conversion') {
    referral.conversionsCount += 1;
    if (referredUserId) referral.referredUserId = referredUserId;
  }

  saveDatabase(db);
  return { success: true, referral };
}
