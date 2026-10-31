import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/store';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const emails = db.devEmails || [];
    return NextResponse.json({
      success: true,
      hasExternalSmtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      emails: emails.slice(0, 10)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
