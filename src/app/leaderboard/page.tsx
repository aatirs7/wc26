import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, bracketScores, poolMembers, pools, users } from '@/lib/schema';
import { ensureUser } from '@/lib/clerk-user';

export const dynamic = 'force-dynamic';

interface Row {
  rank: number | null;
  bracketId: string | null;
  bracketName: string;
  ownerClerkId: string;
  ownerName: string;
  points: number;
  tiebreak: number;
  submitted: boolean;
  lockedAtMs: number;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pool?: string }>;
}) {
  const userId = await ensureUser();
  if (!userId) redirect('/');

  const memberships = await db
    .select({ poolId: poolMembers.poolId, poolName: pools.name, joinCode: pools.joinCode })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(eq(poolMembers.clerkId, userId));

  if (memberships.length === 0) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted">Join a pool from the Bracket tab first.</p>
      </div>
    );
  }

  const { pool: requested } = await searchParams;
  const active =
    memberships.find((m) => m.poolId === requested) ??
    memberships.find((m) => m.poolId === process.env.NEXT_PUBLIC_DEFAULT_POOL_ID) ??
    memberships[0];

  const members = await db
    .select({ clerkId: poolMembers.clerkId, displayName: users.displayName })
    .from(poolMembers)
    .innerJoin(users, eq(users.clerkId, poolMembers.clerkId))
    .where(eq(poolMembers.poolId, active.poolId));

  const poolBrackets = await db
    .select()
    .from(brackets)
    .where(eq(brackets.poolId, active.poolId));

  const scoreRows = poolBrackets.length
    ? await db
        .select()
        .from(bracketScores)
        .where(inArray(bracketScores.bracketId, poolBrackets.map((b) => b.id)))
    : [];

  // Tiebreaks: champion + final points, then earliest submit time.
  const tiebreakByBracket = new Map<string, number>();
  for (const s of scoreRows) {
    if (s.roundKey === 'champion' || s.roundKey === 'final') {
      tiebreakByBracket.set(s.bracketId, (tiebreakByBracket.get(s.bracketId) ?? 0) + s.points);
    }
  }

  const bracketByOwner = new Map(poolBrackets.map((b) => [b.ownerClerkId, b]));
  const rows: Row[] = members.map((m) => {
    const b = bracketByOwner.get(m.clerkId);
    return {
      rank: null,
      bracketId: b?.id ?? null,
      bracketName: b?.name ?? 'No bracket',
      ownerClerkId: m.clerkId,
      ownerName: m.displayName,
      points: b?.totalPoints ?? 0,
      tiebreak: b ? (tiebreakByBracket.get(b.id) ?? 0) : 0,
      submitted: b?.submitted ?? false,
      lockedAtMs: b?.lockedAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
    };
  });

  rows.sort((a, b) => {
    if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
    if (b.points !== a.points) return b.points - a.points;
    if (b.tiebreak !== a.tiebreak) return b.tiebreak - a.tiebreak;
    return a.lockedAtMs - b.lockedAtMs;
  });
  let rank = 0;
  for (const r of rows) {
    if (r.submitted) r.rank = ++rank;
  }

  return (
    <div className="space-y-4 py-4">
      <header className="flex items-end justify-between">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <span className="text-xs text-muted">
          Invite code: <span className="font-mono font-bold text-foreground">{active.joinCode}</span>
        </span>
      </header>

      {memberships.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {memberships.map((m) => (
            <Link
              key={m.poolId}
              href={`/leaderboard?pool=${m.poolId}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                m.poolId === active.poolId
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-edge bg-surface text-muted'
              }`}
            >
              {m.poolName}
            </Link>
          ))}
        </div>
      ) : null}

      <ol className="space-y-2">
        {rows.map((row) => {
          const inner = (
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-edge bg-surface px-3 py-2">
              <span className="w-6 text-center text-sm font-bold text-muted">
                {row.rank ?? '–'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{row.bracketName}</div>
                <div className="truncate text-xs text-muted">
                  {row.ownerName}
                  {!row.submitted ? ' · did not lock' : ''}
                </div>
              </div>
              <span className="text-base font-bold text-accent">{row.points}</span>
            </div>
          );
          return (
            <li key={row.ownerClerkId}>
              {row.bracketId ? <Link href={`/bracket/${row.bracketId}`}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
