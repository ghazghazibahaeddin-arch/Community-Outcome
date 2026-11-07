import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, setSessionCookie } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
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

    const res = NextResponse.json({
      success: true,
      user: authResult.user,
      sessionToken: session.token
    });

    setSessionCookie(res, session.token);

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
