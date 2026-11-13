import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createSession, setSessionCookie } from '@/lib/services/auth';
import { ensureDatabaseHydrated } from '@/lib/db/store';

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseHydrated();
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

    const res = NextResponse.json(
      {
        success: true,
        user: regResult.user,
        sessionToken: session.token
      },
      { status: 201 }
    );

    setSessionCookie(res, session.token);

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
