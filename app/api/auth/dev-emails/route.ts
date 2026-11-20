import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';
import { getRuntimeEnv } from '@/lib/env';

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  if (env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Development email inspector is disabled in production.' },
      { status: 403 }
    );
  }
  try {
    const db = getDatabase();
    const emails = db.devEmails || [];
    return NextResponse.json({
      success: true,
      hasExternalSmtp: Boolean(env.SMTP_HOST && env.SMTP_USER),
      emails: emails.slice(0, 10)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
