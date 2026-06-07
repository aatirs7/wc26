import { NextResponse } from 'next/server';
import { inLiveWindow, lastFullSyncMs, runSync } from '@/lib/sync';

export const maxDuration = 60;

const IDLE_FLOOR_MS = 30 * 60 * 1000; // off-window cadence: 30 minutes

// Vercel Cron entry, scheduled every 5 minutes. Self-gates to protect
// the ~100 req/day provider budget: full sync every tick only while a
// match is live or imminent, otherwise at most every 30 minutes.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const live = await inLiveWindow();
    if (!live) {
      const last = await lastFullSyncMs();
      if (Date.now() - last < IDLE_FLOOR_MS) {
        return NextResponse.json({ skipped: true, reason: 'idle window' });
      }
    }
    const report = await runSync();
    return NextResponse.json({ skipped: false, live, ...report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'cron sync failed' },
      { status: 500 },
    );
  }
}
