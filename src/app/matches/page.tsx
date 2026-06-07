import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { groupStandings, matches, teams } from '@/lib/schema';
import { GROUP_LETTERS } from '@/lib/constants';
import MatchRow from '@/components/matches/MatchRow';
import GroupStandingsTable from '@/components/matches/GroupStandingsTable';
import LivePoller from '@/components/matches/LivePoller';

export const dynamic = 'force-dynamic';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showGroups = view === 'groups';

  const allTeams = await db.select().from(teams);
  const teamsByCode = new Map(allTeams.map((t) => [t.code, t]));

  const allMatches = await db.select().from(matches).orderBy(asc(matches.kickoffUtc), asc(matches.id));
  const anyLive = allMatches.some((m) => m.status === 'live' || m.status === 'ht');
  // Server component rendered per request (force-dynamic), so reading the
  // clock here is fine.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const anySoon = allMatches.some(
    (m) =>
      m.status === 'scheduled' &&
      m.kickoffUtc.getTime() > now - 3 * 3600 * 1000 &&
      m.kickoffUtc.getTime() < now + 3600 * 1000,
  );

  const standings = showGroups ? await db.select().from(groupStandings) : [];

  // Group fixtures by calendar day (UTC) for scannable sections.
  const byDay = new Map<string, typeof allMatches>();
  for (const m of allMatches) {
    const day = m.kickoffUtc.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(m);
  }

  // Jump to today (or the next day with matches) by listing past days last.
  const today = new Date().toISOString().slice(0, 10);
  const days = [...byDay.keys()].sort();
  const upcoming = days.filter((d) => d >= today);
  const past = days.filter((d) => d < today).reverse();

  return (
    <div className="space-y-4 py-4">
      <LivePoller active={anyLive || anySoon} />

      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Matches</h1>
        <div className="flex rounded-full border border-edge bg-surface p-0.5 text-xs font-medium">
          <Link
            href="/matches"
            className={`rounded-full px-3 py-1.5 ${!showGroups ? 'bg-accent text-black' : 'text-muted'}`}
          >
            Fixtures
          </Link>
          <Link
            href="/matches?view=groups"
            className={`rounded-full px-3 py-1.5 ${showGroups ? 'bg-accent text-black' : 'text-muted'}`}
          >
            Groups
          </Link>
        </div>
      </header>

      {showGroups ? (
        <div className="space-y-3">
          {GROUP_LETTERS.map((letter) => (
            <GroupStandingsTable
              key={letter}
              letter={letter}
              rows={standings.filter((s) => s.groupLetter === letter)}
              teamsByCode={teamsByCode}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {[...upcoming, ...past].map((day) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                {new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <div className="space-y-2">
                {byDay.get(day)!.map((m) => (
                  <MatchRow key={m.id} match={m} teamsByCode={teamsByCode} />
                ))}
              </div>
            </section>
          ))}
          {allMatches.length === 0 ? (
            <p className="rounded-xl border border-edge bg-surface p-4 text-sm text-muted">
              No fixtures yet. Run the seed script to load the schedule.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
