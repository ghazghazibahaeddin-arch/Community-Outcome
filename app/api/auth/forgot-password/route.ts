import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseHydrated, persistDatabaseNow } from '@/lib/db/store';
import { requestPasswordReset } from '@/lib/services/auth';
import { getRuntimeEnv } from '@/lib/env';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const body = (await req.json()) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    await ensureDatabaseHydrated(env);
    const appUrl = env.APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const result = requestPasswordReset(email, appUrl, env);
    await persistDatabaseNow(env);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
