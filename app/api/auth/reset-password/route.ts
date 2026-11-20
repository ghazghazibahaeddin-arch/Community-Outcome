import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseHydrated, persistDatabaseNow } from '@/lib/db/store';
import { getRuntimeEnv } from '@/lib/env';
import { resetPassword } from '@/lib/services/auth';
import { checkRateLimit, getClientIp } from '@/lib/services/rateLimit';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ key: `auth_reset:${clientIp}`, limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many reset attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const body = (await req.json()) as { token?: string; newPassword?: string };
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    await ensureDatabaseHydrated(env);
    const result = resetPassword(token, newPassword, env);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    await persistDatabaseNow(env);

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset. Please sign in with your new password.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
