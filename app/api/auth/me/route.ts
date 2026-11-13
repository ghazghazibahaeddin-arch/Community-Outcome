import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/services/auth';
import { ensureDatabaseHydrated, getDatabase } from '@/lib/db/store';
import { getRuntimeEnv } from '@/lib/env';

export async function GET(req: NextRequest, _context?: any) {
  const env = getRuntimeEnv(_context?.env || _context);
  try {
    await ensureDatabaseHydrated(env);
    const user = await getAuthenticatedUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: true, authenticated: false, user: null });
    }

    const db = getDatabase();
    const memberships = (db.memberships || []).filter((m) => m.userId === user.id);
    const ownedCommunities = (db.communities || []).filter((c) => c.ownerId === user.id);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
      memberships,
      ownedCommunities
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
