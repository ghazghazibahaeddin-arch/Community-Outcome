import { NextRequest, NextResponse } from 'next/server';
import { verifyWhopWebhook, processVerifiedPaymentEvent } from '@/lib/services/paymentService';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

/**
 * POST /api/webhooks/whop
 * Handles verified webhook events from Whop:
 * - membership.went_valid / payment.succeeded / subscription.created -> Upgrade to Community Pro
 * - membership.went_invalid / subscription.canceled -> Graceful downgrade to Free
 * - payment.failed -> past_due
 * Strictly idempotent, rejects forged payloads, never trusts client frontend assertions.
 */
export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const rawBody = await req.text();
    const verification = verifyWhopWebhook(rawBody, req.headers, env);

    if (!verification.valid) {
      console.warn('[Whop Webhook] Signature verification failed:', verification.error);
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid Whop webhook signature' },
        { status: 401 }
      );
    }

    const processResult = processVerifiedPaymentEvent(verification);
    if (!processResult.success) {
      return NextResponse.json({ success: false, error: processResult.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: processResult.message,
      duplicate: processResult.duplicate ?? false
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Whop Webhook] Fatal error processing webhook:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    provider: 'whop',
    endpoint: '/api/webhooks/whop',
    instructions: 'Configure this endpoint in your Whop Developer Dashboard under Webhooks.'
  });
}
