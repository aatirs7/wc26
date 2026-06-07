import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, poolMembers, users } from '@/lib/schema';
import { currentUserId } from '@/lib/auth';
import { cohortOf, type Cohort } from '@/lib/cohorts';

export const dynamic = 'force-dynamic';

interface CohortStats {
  label: string;
  players: number;
  submitted: number;
  totalPoints: number;
  avgPoints: number;
  leaderName: string | null;
  leaderPoints: number;
}

function summarize(
  label: string,
  rows: { name: string; points: number; submitted: boolean }[],
): CohortStats {
  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const submitted = rows.filter((r) => r.submitted).length;
  const leader = rows.slice().sort((a, b) => b.points - a.points)[0];
  return {
    label,
    players: rows.length,
    submitted,
    totalPoints,
    avgPoints: rows.length ? Math.round((totalPoints / rows.length) * 10) / 10 : 0,
    leaderName: leader?.name ?? null,
    leaderPoints: leader?.points ?? 0,
  };
}

export default async function StatsPage() {
  const userId = await currentUserId();
  if (!userId) redirect('/');

  const poolId = process.env.NEXT_PUBLIC_DEFAULT_POOL_ID;
  if (!poolId) {
    return (
      <div className="py-4">
        <h1 className="font-display text-4xl">Stats</h1>
        <p className="mt-2 text-sm text-muted">No pool configured.</p>
      </div>
    );
  }

  const members = await db
    .select({ name: users.displayName, clerkId: poolMembers.userId })
    .from(poolMembers)
    .innerJoin(users, eq(users.id, poolMembers.userId))
    .where(eq(poolMembers.poolId, poolId));

  const poolBrackets = await db.select().from(brackets).where(eq(brackets.poolId, poolId));
  const byOwner = new Map(poolBrackets.map((b) => [b.ownerId, b]));

  const rows = members.map((m) => {
    const b = byOwner.get(m.clerkId);
    return {
      name: m.name,
      cohort: cohortOf(m.name),
      points: b?.totalPoints ?? 0,
      submitted: b?.submitted ?? false,
    };
  });

  const adults = summarize('Adults', rows.filter((r) => r.cohort === 'adults'));
  const kids = summarize('Kids', rows.filter((r) => r.cohort === 'kids'));

  const cohorts: { c: Cohort; s: CohortStats; accent: string }[] = [
    { c: 'adults', s: adults, accent: 'text-gold' },
    { c: 'kids', s: kids, accent: 'text-accent' },
  ];

  // Who is ahead, by average points per player (fairer than total since
  // the cohorts are different sizes).
  let banner = 'Dead level so far';
  if (adults.avgPoints > kids.avgPoints) banner = 'Adults are ahead';
  else if (kids.avgPoints > adults.avgPoints) banner = 'Kids are ahead';

  const topOverall = rows.slice().sort((a, b) => b.points - a.points).slice(0, 5);
  const anyPoints = rows.some((r) => r.points > 0);

  return (
    <div className="space-y-5 py-4">
      <header className="pt-2">
        <h1 className="font-display text-4xl leading-none">Adults vs Kids</h1>
        <p className="mt-1 text-sm text-muted">Family bragging rights.</p>
      </header>

      <div className="card p-4 text-center">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
          Standing
        </div>
        <div className="shine mt-1 font-display text-3xl">{banner}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cohorts.map(({ c, s, accent }) => (
          <div key={c} className="card space-y-3 p-4">
            <h2 className={`font-display text-2xl leading-none ${accent}`}>{s.label}</h2>
            <div>
              <div className="font-display text-4xl leading-none">{s.avgPoints}</div>
              <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                avg points
              </div>
            </div>
            <dl className="space-y-1 text-xs text-muted">
              <div className="flex justify-between">
                <dt>Players</dt>
                <dd className="font-semibold text-foreground">{s.players}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Locked in</dt>
                <dd className="font-semibold text-foreground">
                  {s.submitted}/{s.players}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Total pts</dt>
                <dd className="font-semibold text-foreground">{s.totalPoints}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Leader</dt>
                <dd className="truncate pl-2 font-semibold text-foreground">
                  {s.leaderName ? `${s.leaderName} (${s.leaderPoints})` : '—'}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-2 font-display text-xl text-muted">Top of the family</h3>
        {anyPoints ? (
          <ol className="space-y-2">
            {topOverall.map((r, i) => (
              <li key={r.name} className="card flex items-center gap-3 px-3 py-2.5">
                <span className="w-5 text-center font-display text-lg text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-bold">{r.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                    r.cohort === 'adults' ? 'bg-gold/15 text-gold' : 'bg-accent/15 text-accent'
                  }`}
                >
                  {r.cohort}
                </span>
                <span className="font-display text-xl text-accent">{r.points}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="card p-4 text-sm text-muted">
            No points yet. Once the tournament kicks off, accuracy and points
            land here round by round.
          </p>
        )}
      </section>
    </div>
  );
}
