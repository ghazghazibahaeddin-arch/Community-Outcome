// Community OS — Modular Payment Providers Integration
// Supports Whop as primary (official API & webhooks) + Gumroad modular fallback
// Direct Stripe integration is explicitly excluded as instructed.
import crypto from 'crypto';
import { PaymentProvider, PlanTier, SubscriptionStatus } from '@/lib/types';
import { applySubscriptionUpdate, downgradeToFree, WHOP_PRO_CHECKOUT_URL } from './subscriptionService';
import { getDatabase, saveDatabase } from '@/lib/db/store';
import { getRuntimeEnv, CloudflareEnv } from '../env';

export interface WebhookVerificationResult {
  valid: boolean;
  provider: PaymentProvider;
  eventType?: string;
  eventId?: string;
  communityId?: string;
  tier?: PlanTier;
  status?: SubscriptionStatus;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  error?: string;
  rawPayload?: any;
}

/**
 * Verify Whop Webhook Signature according to Whop's official specification:
 * Headers:
 * - 'webhook-signature' or 'x-whop-signature': HMAC-SHA256 signature
 * - 'webhook-id': unique event ID for deduplication
 * - 'webhook-timestamp': timestamp to prevent replay attacks (< 5 minutes)
 */
export function verifyWhopWebhook(
  rawBody: string,
  headers: Headers | Record<string, string | null>,
  explicitEnv?: CloudflareEnv
): WebhookVerificationResult {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as any).get === 'function') {
      return (headers as Headers).get(name);
    }
    const rec = headers as Record<string, string | null>;
    return rec[name.toLowerCase()] || rec[name] || null;
  };

  const env = getRuntimeEnv(explicitEnv);
  const signature = getHeader('webhook-signature') || getHeader('x-whop-signature');
  const eventId = getHeader('webhook-id') || getHeader('x-whop-event-id');
  const timestamp = getHeader('webhook-timestamp') || getHeader('x-whop-timestamp');
  const secret = env.WHOP_WEBHOOK_SECRET;

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { valid: false, provider: 'whop', error: 'Invalid JSON payload' };
  }

  // Check if live secret verification is enforced
  if (secret) {
    if (!signature) {
      return { valid: false, provider: 'whop', error: 'Missing webhook-signature header' };
    }

    // Verify timestamp within 5 minutes to prevent replay attacks
    if (timestamp) {
      const eventTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - eventTime) > 300) {
        return { valid: false, provider: 'whop', error: 'Webhook timestamp expired (>5 min)' };
      }
    }

    // Compute expected HMAC SHA-256
    const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
    const expectedSignature = crypto
      .createHmac('sha256', secret.trim())
      .update(signedPayload)
      .digest('hex');

    const cleanSig = signature.replace(/^sha256=/, '').trim();

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(cleanSig, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      if (!isValid) {
        return { valid: false, provider: 'whop', error: 'Invalid HMAC signature' };
      }
    } catch {
      return { valid: false, provider: 'whop', error: 'Cryptographic signature mismatch' };
    }
  }

  // Parse Whop event data
  const action = payload.action || payload.type || payload.event || 'membership.went_valid';
  const customMetadata = payload.data?.custom_metadata || payload.custom_fields || payload.metadata || {};
  const communityId =
    customMetadata.community_id ||
    customMetadata.communityId ||
    payload.data?.user?.custom_fields?.community_id ||
    payload.communityId ||
    'comm_devforge';

  const providerSubscriptionId = payload.data?.id || payload.id;
  const providerCustomerId = payload.data?.user_id || payload.user_id;

  let tier: PlanTier = 'pro';
  let status: SubscriptionStatus = 'active';

  // Map Whop event actions to status
  switch (action) {
    case 'membership.went_valid':
    case 'payment.succeeded':
    case 'subscription.created':
    case 'subscription.renewed':
      status = 'active';
      tier = 'pro';
      break;

    case 'membership.went_invalid':
    case 'subscription.canceled':
    case 'subscription.terminated':
      status = 'canceled';
      tier = 'free';
      break;

    case 'payment.failed':
      status = 'past_due';
      tier = 'pro';
      break;

    default:
      status = 'active';
      tier = 'pro';
  }

  return {
    valid: true,
    provider: 'whop',
    eventType: action,
    eventId: eventId || payload.id || `whop_evt_${Date.now()}`,
    communityId,
    tier,
    status,
    providerSubscriptionId,
    providerCustomerId,
    rawPayload: payload
  };
}

/**
 * Verify Gumroad Webhook as modular backup if Whop payouts are unavailable
 */
export function verifyGumroadWebhook(formData: Record<string, any>, explicitEnv?: CloudflareEnv): WebhookVerificationResult {
  const env = getRuntimeEnv(explicitEnv);
  const sellerId = env.GUMROAD_SELLER_ID;
  if (sellerId && formData.seller_id && formData.seller_id !== sellerId) {
    return { valid: false, provider: 'gumroad', error: 'Seller ID mismatch' };
  }

  const customFields = formData.url_params || {};
  const communityId = customFields.community_id || formData.custom_community_id || 'comm_devforge';
  const isRefunded = formData.refunded === 'true' || formData.refunded === true;
  const isDisputed = formData.disputed === 'true' || formData.disputed === true;

  let status: SubscriptionStatus = 'active';
  let tier: PlanTier = 'pro';

  if (isRefunded || isDisputed || formData.cancelled === 'true') {
    status = 'canceled';
    tier = 'free';
  }

  return {
    valid: true,
    provider: 'gumroad',
    eventType: formData.event || (isRefunded ? 'sale.refunded' : 'sale.completed'),
    eventId: formData.sale_id || `gum_${Date.now()}`,
    communityId,
    tier,
    status,
    providerSubscriptionId: formData.subscription_id || formData.sale_id,
    providerCustomerId: formData.purchaser_id || formData.email,
    rawPayload: formData
  };
}

/**
 * Process a verified payment event with strict idempotency
 */
export function processVerifiedPaymentEvent(
  verification: WebhookVerificationResult
): { success: boolean; message: string; duplicate?: boolean } {
  if (!verification.valid || !verification.communityId) {
    return { success: false, message: verification.error || 'Invalid webhook event verification' };
  }

  const db = getDatabase();
  if (!db.webhookEvents) db.webhookEvents = [];

  // Idempotency check: Reject duplicate event IDs
  const existingEvent = db.webhookEvents.find(
    (e) => e.eventId === verification.eventId && e.provider === verification.provider
  );
  if (existingEvent && existingEvent.processed) {
    return {
      success: true,
      duplicate: true,
      message: `Event ${verification.eventId} already processed idempotently.`
    };
  }

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

  // Apply state update
  if (verification.tier === 'free' || verification.status === 'canceled') {
    downgradeToFree(verification.communityId, `Webhook event: ${verification.eventType}`);
  } else {
    applySubscriptionUpdate({
      communityId: verification.communityId,
      provider: verification.provider,
      tier: verification.tier || 'pro',
      status: verification.status || 'active',
      providerSubscriptionId: verification.providerSubscriptionId,
      providerCustomerId: verification.providerCustomerId,
      eventId: verification.eventId,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: nextMonth.toISOString()
    });
  }

  // Record processed event
  db.webhookEvents.push({
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    provider: verification.provider,
    eventId: verification.eventId || `evt_${Date.now()}`,
    eventType: verification.eventType || 'unknown',
    communityId: verification.communityId,
    payload: verification.rawPayload,
    processed: true,
    processedAt: now.toISOString(),
    receivedAt: now.toISOString()
  });

  saveDatabase(db);
  return { success: true, message: `Successfully processed ${verification.eventType} for ${verification.communityId}` };
}
