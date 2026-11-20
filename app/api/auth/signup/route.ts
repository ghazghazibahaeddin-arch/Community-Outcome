import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createSession, setSessionCookie } from '@/lib/services/auth';
import { ensureDatabaseHydrated, persistDatabaseNow } from '@/lib/db/store';
import { getRuntimeEnv } from '@/lib/env';
import { checkRateLimit, getClientIp } from '@/lib/services/rateLimit';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ key: `auth_signup:${clientIp}`, limit: 15, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    await ensureDatabaseHydrated(env);
    const body = (await req.json()) as { email?: string; password?: string; name?: string; bio?: string };
    const { email, password, name, bio } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const regResult = registerUser({ email, password, name, bio });
    if (!regResult.success || !regResult.user) {
      return NextResponse.json(
        { success: false, error: regResult.error || 'Registration failed' },
        { status: 400 }
      );
    }

    // Auto-create session on successful registration
    const userAgent = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for') || undefined;
    const session = createSession(regResult.user.id, userAgent, ip);
    await persistDatabaseNow(env);

    const res = NextResponse.json(
      {
        success: true,
        user: regResult.user,
        sessionToken: session.token
      },
      { status: 201 }
    );

    setSessionCookie(res, session.token, { req });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
