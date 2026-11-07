import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    const appUrl = process.env.APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const result = requestPasswordReset(email, appUrl);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
