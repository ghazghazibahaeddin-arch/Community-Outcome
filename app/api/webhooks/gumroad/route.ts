import { NextRequest, NextResponse } from 'next/server';
import { verifyGumroadWebhook, processVerifiedPaymentEvent } from '@/lib/services/paymentService';
import { getRuntimeEnv, CloudflareEnv } from '@/lib/env';

/**
 * POST /api/webhooks/gumroad
 * Handles verified webhook events from Gumroad as modular backup
 */
export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const formData = await req.formData();
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    const verification = verifyGumroadWebhook(data, env);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid Gumroad webhook verification' },
        { status: 401 }
      );
    }

    const processResult = processVerifiedPaymentEvent(verification);
    if (!processResult.success) {
      return NextResponse.json({ success: false, error: processResult.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: processResult.message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
