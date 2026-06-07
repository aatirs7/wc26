import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, groupStandings, matches, poolMembers, users } from '@/lib/schema';
import { currentUserId } from '@/lib/auth';
import { cohortOf, familyOf, FAMILIES, type Cohort } from '@/lib/cohorts';
import { attainablePoints, buildFacts } from '@/lib/scoring';
import MemberList, { type Member } from '@/components/stats/MemberList';

export const dynamic = 'force-dynamic';

interface CohortStats {
  label: string;
  players: number;
  submitted: number;
  totalPoints: number;
  avgPoints: number;
  accuracy: number | null;
  leaderName: string | null;
  leaderPoints: number;
}

function summarize(
  label: string,
  rows: { name: string; points: number; submitted: boolean }[],
  attainable: number,
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
    accuracy:
      attainable > 0 && rows.length
        ? Math.round((totalPoints / (attainable * rows.length)) * 100)
        : null,
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

  // Accuracy denominator: max points a perfect bracket could hold so far.
  const matchRows = await db
    .select({
      stage: matches.stage,
      status: matches.status,
      groupLetter: matches.groupLetter,
      winnerCode: matches.winnerCode,
    })
    .from(matches);
  const standingRows = await db
    .select({
      groupLetter: groupStandings.groupLetter,
      teamCode: groupStandings.teamCode,
      rank: groupStandings.rank,
      isBestThird: groupStandings.isBestThird,
    })
    .from(groupStandings);
  const facts = buildFacts(matchRows, standingRows);
  const attainable = attainablePoints(matchRows, facts);
  const accuracyOf = (points: number) =>
    attainable > 0 ? Math.round((points / attainable) * 100) : null;

  const myName = members.find((m) => m.clerkId === userId)?.name ?? null;
  const myCohort = myName ? cohortOf(myName) : null;
  const myFamily = myName ? familyOf(myName) : null;

  const rows = members.map((m) => {
    const b = byOwner.get(m.clerkId);
    return {
      name: m.name,
      cohort: cohortOf(m.name),
      family: familyOf(m.name),
      points: b?.totalPoints ?? 0,
      submitted: b?.submitted ?? false,
    };
  });

  const toMember = (r: { name: string; points: number }): Member => ({
    name: r.name,
    points: r.points,
    accuracy: accuracyOf(r.points),
  });

  const adults = summarize('Adults', rows.filter((r) => r.cohort === 'adults'), attainable);
  const kids = summarize('Kids', rows.filter((r) => r.cohort === 'kids'), attainable);

  const cohorts: { c: Cohort; s: CohortStats; accent: string; members: Member[] }[] = [
    { c: 'adults', s: adults, accent: 'text-gold', members: rows.filter((r) => r.cohort === 'adults').map(toMember) },
    { c: 'kids', s: kids, accent: 'text-accent', members: rows.filter((r) => r.cohort === 'kids').map(toMember) },
  ];

  // Who is ahead, by average points per player (fairer than total since
  // the cohorts are different sizes).
  let banner = 'Dead level so far';
  if (adults.avgPoints > kids.avgPoints) banner = 'Adults are ahead';
  else if (kids.avgPoints > adults.avgPoints) banner = 'Kids are ahead';

  // Families: ranked by accuracy (fair across different household sizes).
  const families = FAMILIES.map((f) => {
    const fam = rows.filter((r) => r.family === f.name);
    const totalPoints = fam.reduce((s, r) => s + r.points, 0);
    const accuracy =
      attainable > 0 && fam.length
        ? Math.round((totalPoints / (attainable * fam.length)) * 100)
        : null;
    return { name: f.name, count: fam.length, totalPoints, accuracy, members: fam.map(toMember) };
  }).sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1) || b.totalPoints - a.totalPoints);

  const topOverall = rows.slice().sort((a, b) => b.points - a.points).slice(0, 5);
  const anyPoints = rows.some((r) => r.points > 0);

  return (
    <div className="space-y-5 py-4">
      <header className="pt-2 text-center">
        <h1 className="font-display text-4xl leading-none">Adults vs Kids</h1>
        <p className="mt-1 text-sm text-muted">
          Family bragging rights ·{' '}
          <Link href="/scoring" className="font-semibold text-accent underline">
            How it&apos;s scored
          </Link>
        </p>
      </header>

      <div className="card p-4 text-center">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
          Standing
        </div>
        <div className="shine mt-1 font-display text-3xl">{banner}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cohorts.map(({ c, s, accent, members: cohortMembers }) => (
          <div key={c} className={`card space-y-3 p-4 ${c === myCohort ? 'border-accent' : ''}`}>
            <h2 className={`flex items-center gap-1.5 font-display text-2xl leading-none ${accent}`}>
              {s.label}
              {c === myCohort ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                  You
                </span>
              ) : null}
            </h2>
            <div className="flex items-end gap-4">
              <div>
                <div className="font-display text-4xl leading-none">{s.avgPoints}</div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                  avg pts
                </div>
              </div>
              <div>
                <div className="font-display text-4xl leading-none">
                  {s.accuracy === null ? '—' : `${s.accuracy}%`}
                </div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                  accuracy
                </div>
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
            <MemberList members={cohortMembers} highlight={myName ?? undefined} />
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-center font-display text-2xl">Family vs Family</h2>
        <p className="mb-3 text-center text-xs text-muted">
          Ranked by accuracy, so household size doesn&apos;t matter.
        </p>
        <ol className="space-y-2">
          {families.map((f, i) => (
            <li key={f.name} className={`card p-3 ${f.name === myFamily ? 'border-accent' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-display text-lg text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-display text-lg leading-tight">{f.name}</span>
                    {f.name === myFamily ? (
                      <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                        You
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted">{f.count} players · {f.totalPoints} pts</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl leading-none text-accent">
                    {f.accuracy === null ? '—' : `${f.accuracy}%`}
                  </div>
                  <div className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">
                    accuracy
                  </div>
                </div>
              </div>
              <div className="mt-2 border-t border-edge/50 pt-1">
                <MemberList members={f.members} highlight={myName ?? undefined} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 font-display text-xl text-muted">Top of the family</h3>
        {anyPoints ? (
          <ol className="space-y-2">
            {topOverall.map((r, i) => (
              <li
                key={r.name}
                className={`card flex items-center gap-3 px-3 py-2.5 ${
                  r.name === myName ? 'border-accent bg-accent/[0.06]' : ''
                }`}
              >
                <span className="w-5 text-center font-display text-lg text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-bold">
                  {r.name}
                  {r.name === myName ? (
                    <span className="ml-1.5 text-[0.6rem] font-bold uppercase text-accent">You</span>
                  ) : null}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                    r.cohort === 'adults' ? 'bg-gold/15 text-gold' : 'bg-accent/15 text-accent'
                  }`}
                >
                  {r.cohort}
                </span>
                {accuracyOf(r.points) !== null ? (
                  <span className="text-xs font-semibold text-muted">{accuracyOf(r.points)}%</span>
                ) : null}
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
