import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const res = NextResponse.json({
      success: true,
      user: authResult.user,
      sessionToken: session.token
    });

    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000)
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
