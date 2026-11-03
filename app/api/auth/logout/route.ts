import { NextRequest, NextResponse } from 'next/server';
import { destroySession, clearSessionCookie, SESSION_COOKIE_NAME } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = cookieToken || headerToken;

    if (token) {
      destroySession(token);
    }

    const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
    clearSessionCookie(res);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
