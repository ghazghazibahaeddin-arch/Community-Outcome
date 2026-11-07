// Community OS — Plan Tier Constants and Entitlement Definitions (Universal / Client-Safe)
import { PlanTier, PlanEntitlements } from './types';

export const WHOP_PRO_CHECKOUT_URL =
  process.env.WHOP_PURCHASE_URL ||
  process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL ||
  'https://whop.com/baha-1a44/community-os-pro';

export const PRO_PLAN_PRICE_USD = 15;

/**
 * Static plan definitions matching the exact specification:
 * 1. FREE:
 *    - 1 community, 1 Discord server, 1 Telegram group
 *    - Up to 100 monthly active members
 *    - Member Space & Owner Workspace, NeedSignal, Match & Offer, Poll2Plan, QuestLoop, Contribution Ledger
 *    - Member Passport & basic TrustGraph, Action Hub & basic bot commands
 *    - Powered by Community OS attribution badge
 * 2. COMMUNITY PRO ($15/month per community):
 *    - Up to 1,000 monthly active members
 *    - Up to 5 Discord servers & 5 Telegram groups
 *    - Advanced automations, scheduled publishing & reminders
 *    - Advanced analytics & outcome reports
 *    - Advanced TrustGraph & Community Shield
 *    - Custom branding (badge removed)
 *    - API, webhooks, exports and audit logs
 *    - Advanced workflows & permissions
 * All members remain free. Only community owners pay.
 */
export const PLAN_DEFINITIONS: Record<PlanTier, PlanEntitlements> = {
  free: {
    tier: 'free',
    name: 'Free Starter',
    priceMonthlyUsd: 0,
    maxMonthlyActiveMembers: 100,
    maxDiscordServers: 1,
    maxTelegramGroups: 1,
    advancedAutomations: false,
    scheduledPublishing: false,
    advancedAnalytics: false,
    advancedTrustGraph: false,
    communityShieldAdvanced: false,
    customBranding: false,
    apiWebhooksAuditLogs: false,
    advancedWorkflowsPermissions: false,
    showPoweredByBadge: true
  },
  pro: {
    tier: 'pro',
    name: 'Community Pro',
    priceMonthlyUsd: PRO_PLAN_PRICE_USD,
    maxMonthlyActiveMembers: 1000,
    maxDiscordServers: 5,
    maxTelegramGroups: 5,
    advancedAutomations: true,
    scheduledPublishing: true,
    advancedAnalytics: true,
    advancedTrustGraph: true,
    communityShieldAdvanced: true,
    customBranding: true,
    apiWebhooksAuditLogs: true,
    advancedWorkflowsPermissions: true,
    showPoweredByBadge: false
  }
};
