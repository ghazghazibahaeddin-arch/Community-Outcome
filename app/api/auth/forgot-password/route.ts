import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseHydrated, persistDatabaseNow } from '@/lib/db/store';
import { requestPasswordReset } from '@/lib/services/auth';
import { getRuntimeEnv } from '@/lib/env';
import { checkRateLimit, getClientIp } from '@/lib/services/rateLimit';
import { getVerifiedAppUrl } from '@/lib/services/securityConfig';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ key: `auth_forgot:${clientIp}`, limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many password reset requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const body = (await req.json()) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    await ensureDatabaseHydrated(env);
    const appUrl = getVerifiedAppUrl(env);
    const result = requestPasswordReset(email, appUrl, env);
    await persistDatabaseNow(env);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
