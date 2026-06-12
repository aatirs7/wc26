import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, bracketScores, groupStandings, matches, poolMembers, teams, users } from '@/lib/schema';
import { currentUserId } from '@/lib/auth';
import { cohortOf, familyOf, FAMILIES } from '@/lib/cohorts';
import { attainablePoints, buildFacts } from '@/lib/scoring';
import { GROUP_LETTERS, type RoundKey } from '@/lib/constants';
import type { Predictions } from '@/types/bracket';
import { type Member } from '@/components/stats/MemberList';
import StatsTabs from '@/components/stats/StatsTabs';
import HeadToHeadStats, { type CohortView } from '@/components/stats/HeadToHeadStats';
import GroupStats from '@/components/stats/GroupStats';

export const dynamic = 'force-dynamic';

const ROUND_LABELS: Record<RoundKey, string> = {
  groups: 'Group finishes',
  thirdPlace: 'Best thirds',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
  champion: 'Champion',
};

function summarize(
  label: string,
  rows: { name: string; points: number; submitted: boolean }[],
  attainable: number,
): CohortView['stats'] {
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
        ? Math.min(100, Math.round((totalPoints / (attainable * rows.length)) * 100))
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
    .select({ name: users.displayName, userId: poolMembers.userId })
    .from(poolMembers)
    .innerJoin(users, eq(users.id, poolMembers.userId))
    .where(eq(poolMembers.poolId, poolId));

  const poolBrackets = await db.select().from(brackets).where(eq(brackets.poolId, poolId));
  const byOwner = new Map(poolBrackets.map((b) => [b.ownerId, b]));
  const ownerName = new Map(members.map((m) => [m.userId, m.name]));

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
  // Clamp at 100: accuracy is banked / attainable. During a scoring-rule
  // rollout, persisted points (banked by the latest sync) can briefly outrun
  // the freshly computed denominator, but accuracy can never truly exceed
  // 100%, so we never display more.
  const accuracyOf = (points: number) =>
    attainable > 0 ? Math.min(100, Math.round((points / attainable) * 100)) : null;

  const myName = members.find((m) => m.userId === userId)?.name ?? null;
  const myCohort = myName ? cohortOf(myName) : null;
  const myFamily = myName ? familyOf(myName) : null;

  const rows = members.map((m) => {
    const b = byOwner.get(m.userId);
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

  // ---- Head to head: cohorts and families ----
  const adultRows = rows.filter((r) => r.cohort === 'adults');
  const kidRows = rows.filter((r) => r.cohort === 'kids');
  const adults = summarize('Adults', adultRows, attainable);
  const kids = summarize('Kids', kidRows, attainable);

  const cohorts: CohortView[] = [
    { key: 'adults', accent: 'text-gold', isMe: myCohort === 'adults', stats: adults, members: adultRows.map(toMember) },
    { key: 'kids', accent: 'text-accent', isMe: myCohort === 'kids', stats: kids, members: kidRows.map(toMember) },
  ];

  let banner = 'Dead level so far';
  if (adults.avgPoints > kids.avgPoints) banner = 'Adults are ahead';
  else if (kids.avgPoints > adults.avgPoints) banner = 'Kids are ahead';

  const families = FAMILIES.map((f) => {
    const fam = rows.filter((r) => r.family === f.name);
    const totalPoints = fam.reduce((s, r) => s + r.points, 0);
    const accuracy =
      attainable > 0 && fam.length
        ? Math.min(100, Math.round((totalPoints / (attainable * fam.length)) * 100))
        : null;
    return {
      name: f.name,
      count: fam.length,
      totalPoints,
      accuracy,
      isMe: f.name === myFamily,
      members: fam.map(toMember),
    };
  }).sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1) || b.totalPoints - a.totalPoints);

  const h2hTop = rows
    .slice()
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      cohort: r.cohort,
      points: r.points,
      accuracy: accuracyOf(r.points),
      isMe: r.name === myName,
    }));
  const anyPoints = rows.some((r) => r.points > 0);

  // ---- Group stats: what the group is picking ----
  const teamRows = await db.select({ code: teams.code, name: teams.name, flag: teams.flag }).from(teams);
  const teamByCode = new Map(teamRows.map((t) => [t.code, t]));
  const label = (code: string) => ({
    name: teamByCode.get(code)?.name ?? code,
    flag: teamByCode.get(code)?.flag ?? '',
  });

  const scoreRows = poolBrackets.length
    ? await db
        .select()
        .from(bracketScores)
        .where(inArray(bracketScores.bracketId, poolBrackets.map((b) => b.id)))
    : [];

  const predOf = (ownerId: string) => byOwner.get(ownerId)?.predictions as Predictions | undefined;

  const players = rows.length;
  const submittedCount = rows.filter((r) => r.submitted).length;
  const totalPoints = rows.reduce((s, r) => s + r.points, 0);
  const avgPoints = players ? Math.round((totalPoints / players) * 10) / 10 : 0;
  const poolAccuracy =
    attainable > 0 && players
      ? Math.min(100, Math.round((totalPoints / (attainable * players)) * 100))
      : null;
  const allMembers = rows.map(toMember);

  // Champion picks across the group.
  const champCount = new Map<string, number>();
  const champOwner = new Map<string, string[]>();
  for (const b of poolBrackets) {
    const c = (b.predictions as Predictions).knockout?.champion;
    if (!c) continue;
    champCount.set(c, (champCount.get(c) ?? 0) + 1);
    const arr = champOwner.get(c) ?? [];
    arr.push(ownerName.get(b.ownerId) ?? '?');
    champOwner.set(c, arr);
  }
  const myChampion = predOf(userId)?.knockout?.champion ?? null;
  const championPicks = [...champCount.entries()]
    .map(([code, count]) => ({ code, count, ...label(code), mine: code === myChampion }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxChampion = championPicks[0]?.count ?? 0;

  // Teams the group backs to reach the Final.
  const finalCount = new Map<string, number>();
  for (const b of poolBrackets) {
    for (const code of (b.predictions as Predictions).knockout?.final ?? []) {
      finalCount.set(code, (finalCount.get(code) ?? 0) + 1);
    }
  }
  const finalistPicks = [...finalCount.entries()]
    .map(([code, count]) => ({ code, count, ...label(code) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxFinalist = finalistPicks[0]?.count ?? 0;

  // Consensus group winner: most-picked 1st place in each group.
  const groupWinners = GROUP_LETTERS.map((letter) => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const b of poolBrackets) {
      const first = (b.predictions as Predictions).groups?.[letter]?.first;
      if (first) {
        counts.set(first, (counts.get(first) ?? 0) + 1);
        total += 1;
      }
    }
    if (total === 0) return null;
    const [topCode, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { letter, ...label(topCode), pct: Math.round((n / total) * 100) };
  }).filter((g): g is NonNullable<typeof g> => g !== null);

  // Lone-wolf champion picks (backed by exactly one player).
  const loneWolves = [...champCount.entries()]
    .filter(([, count]) => count === 1)
    .map(([code]) => ({ owner: champOwner.get(code)?.[0] ?? '?', ...label(code) }));

  const groupTop = rows
    .slice()
    .sort((a, b) => b.points - a.points)
    .slice(0, 8)
    .map((r) => ({ name: r.name, points: r.points, accuracy: accuracyOf(r.points) }));

  const roundPoints = new Map<RoundKey, number>();
  for (const s of scoreRows) {
    roundPoints.set(s.roundKey as RoundKey, (roundPoints.get(s.roundKey as RoundKey) ?? 0) + s.points);
  }
  const roundBreakdown = [...roundPoints.entries()]
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, pts]) => ({ label: ROUND_LABELS[key], pts }));

  return (
    <div className="py-4 lg:mx-auto lg:max-w-4xl">
      <StatsTabs
        headToHead={
          <HeadToHeadStats
            banner={banner}
            cohorts={cohorts}
            families={families}
            top={h2hTop}
            anyPoints={anyPoints}
            myName={myName}
          />
        }
        group={
          <GroupStats
            poolEmpty={poolBrackets.length === 0}
            avgPoints={avgPoints}
            poolAccuracy={poolAccuracy}
            submitted={submittedCount}
            players={players}
            allMembers={allMembers}
            myName={myName}
            championPicks={championPicks}
            maxChampion={maxChampion}
            finalistPicks={finalistPicks}
            maxFinalist={maxFinalist}
            groupWinners={groupWinners}
            loneWolves={loneWolves}
            top={groupTop}
            anyPoints={anyPoints}
            roundBreakdown={roundBreakdown}
          />
        }
      />
    </div>
  );
}
