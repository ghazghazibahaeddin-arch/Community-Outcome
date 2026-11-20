import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, setSessionCookie } from '@/lib/services/auth';
import { ensureDatabaseHydrated, persistDatabaseNow } from '@/lib/db/store';
import { getRuntimeEnv } from '@/lib/env';
import { checkRateLimit, getClientIp } from '@/lib/services/rateLimit';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ key: `auth_login:${clientIp}`, limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    await ensureDatabaseHydrated(env);
    const body = (await req.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const authResult = authenticateUser({ email, password });
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for') || undefined;
    const session = createSession(authResult.user.id, userAgent, ip);
    await persistDatabaseNow(env);

    const res = NextResponse.json({
      success: true,
      user: authResult.user,
      sessionToken: session.token
    });

    setSessionCookie(res, session.token, { req });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
