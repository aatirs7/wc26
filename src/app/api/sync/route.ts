import { NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? '';
  return header === `Bearer ${secret}` || header === secret;
}

// Manual / force sync entry. Always runs a full provider pull.
// ?dry=1 fetches and reports without writing anything; use it to confirm
// the league/season mapping before trusting live data.
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  try {
    const report = await runSync({ dry });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'sync failed' },
      { status: 500 },
    );
  }
}
