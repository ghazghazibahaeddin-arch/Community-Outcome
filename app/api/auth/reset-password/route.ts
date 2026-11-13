import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseHydrated } from '@/lib/db/store';
import { getRuntimeEnv } from '@/lib/env';
import { resetPassword } from '@/lib/services/auth';

export async function POST(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    const body = (await req.json()) as { token?: string; newPassword?: string };
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    await ensureDatabaseHydrated(env);
    const result = resetPassword(token, newPassword);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset. Please sign in with your new password.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
