// Pulls provider results into Neon and rescores all brackets.
// Idempotent end to end: upserts only, and scoring replaces rows.

import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { groupStandings, matches, syncMeta } from './schema';
import { apiFootballProvider, type ProviderFixture } from './scores-provider';
import { resolveTeamCode } from './team-map';
import { deriveAdvancement } from './standings';
import { rescoreAll } from './scoring';

export interface SyncReport {
  dry: boolean;
  fixturesFetched: number;
  standingsFetched: number;
  matchesUpdated: number;
  standingsUpdated: number;
  notes: string[];
}

// Provider round labels -> our match stage. Order matters: check the
// specific labels before the bare "final" catch-all.
function stageFromRound(round: string | null): string | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes('group')) return 'group';
  if (r.includes('32')) return 'r32';
  if (r.includes('16')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';
  if (r.includes('3rd') || r.includes('third')) return 'third';
  if (r.includes('final')) return 'final';
  return null;
}

type MatchRow = typeof matches.$inferSelect;

// Finds our row for a provider fixture: by stored provider id first,
// then by team codes, then by stage + closest kickoff.
function findOurMatch(f: ProviderFixture, ours: MatchRow[], notes: string[]): MatchRow | null {
  const byProvider = ours.find((m) => m.providerFixtureId === f.providerId);
  if (byProvider) return byProvider;

  const home = resolveTeamCode(f.homeName);
  const away = resolveTeamCode(f.awayName);
  if (home && away) {
    const byCodes = ours.find(
      (m) =>
        (m.homeCode === home && m.awayCode === away) ||
        (m.homeCode === away && m.awayCode === home),
    );
    if (byCodes) return byCodes;
  } else {
    for (const [name, code] of [[f.homeName, home], [f.awayName, away]] as const) {
      if (!code) notes.push(`Unresolved team name from provider: ${name}`);
    }
  }

  const stage = stageFromRound(f.round);
  if (!stage) {
    notes.push(`Unmapped provider round: ${f.round} (fixture ${f.providerId})`);
    return null;
  }
  const candidates = ours
    .filter((m) => m.stage === stage && m.providerFixtureId === null)
    .map((m) => ({ m, diff: Math.abs(m.kickoffUtc.getTime() - f.kickoffUtc.getTime()) }))
    .filter((c) => c.diff < 36 * 3600 * 1000)
    .sort((a, b) => a.diff - b.diff);
  return candidates[0]?.m ?? null;
}

export async function runSync(opts: { dry?: boolean } = {}): Promise<SyncReport> {
  const dry = opts.dry ?? false;
  const notes: string[] = [];
  const provider = apiFootballProvider;

  const [fixtures, standings] = await Promise.all([
    provider.fetchFixtures(),
    provider.fetchStandings().catch((e) => {
      // Standings can lag fixtures early in the tournament.
      notes.push(`standings fetch failed: ${e instanceof Error ? e.message : e}`);
      return [];
    }),
  ]);

  let matchesUpdated = 0;
  let standingsUpdated = 0;

  if (dry) {
    notes.push(
      `dry run sample fixture: ${JSON.stringify(fixtures[0] ?? null)}`,
      `dry run sample standing: ${JSON.stringify(standings[0] ?? null)}`,
    );
    return {
      dry,
      fixturesFetched: fixtures.length,
      standingsFetched: standings.length,
      matchesUpdated: 0,
      standingsUpdated: 0,
      notes,
    };
  }

  const ours = await db.select().from(matches);
  for (const f of fixtures) {
    const target = findOurMatch(f, ours, notes);
    if (!target) {
      notes.push(`No local match for provider fixture ${f.providerId} (${f.homeName} vs ${f.awayName})`);
      continue;
    }
    const homeCode = target.homeCode ?? resolveTeamCode(f.homeName);
    const awayCode = target.awayCode ?? resolveTeamCode(f.awayName);
    const winnerCode = f.winnerName ? resolveTeamCode(f.winnerName) : null;

    await db
      .update(matches)
      .set({
        providerFixtureId: f.providerId,
        homeCode,
        awayCode,
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        status: f.status,
        winnerCode,
        // Trust the provider's kickoff time once known; openfootball
        // times are provisional.
        kickoffUtc: f.kickoffUtc,
      })
      .where(eq(matches.id, target.id));
    matchesUpdated += 1;
  }

  for (const s of standings) {
    const teamCode = resolveTeamCode(s.teamName);
    const groupLetter = s.groupName.replace(/^Group\s+/i, '').trim().toUpperCase();
    if (!teamCode || groupLetter.length !== 1) {
      notes.push(`Unresolved standing row: ${s.groupName} / ${s.teamName}`);
      continue;
    }
    await db
      .insert(groupStandings)
      .values({
        groupLetter,
        teamCode,
        played: s.played,
        points: s.points,
        gd: s.gd,
        gf: s.gf,
        rank: s.rank,
      })
      .onConflictDoUpdate({
        target: [groupStandings.groupLetter, groupStandings.teamCode],
        set: { played: s.played, points: s.points, gd: s.gd, gf: s.gf, rank: s.rank },
      });
    standingsUpdated += 1;
  }

  // Advancement flags from the freshest standings.
  const allStandings = await db.select().from(groupStandings);
  const { advanced, bestThirds } = deriveAdvancement(allStandings);
  for (const row of allStandings) {
    const adv = advanced.has(row.teamCode);
    const third = bestThirds.has(row.teamCode);
    if (row.advanced !== adv || row.isBestThird !== third) {
      await db
        .update(groupStandings)
        .set({ advanced: adv, isBestThird: third })
        .where(
          and(
            eq(groupStandings.groupLetter, row.groupLetter),
            eq(groupStandings.teamCode, row.teamCode),
          ),
        );
    }
  }

  await rescoreAll();

  await db
    .insert(syncMeta)
    .values({ key: 'lastFullSync', value: String(Date.now()), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: syncMeta.key,
      set: { value: String(Date.now()), updatedAt: new Date() },
    });

  return {
    dry,
    fixturesFetched: fixtures.length,
    standingsFetched: standings.length,
    matchesUpdated,
    standingsUpdated,
    notes,
  };
}

// True when something is happening or about to: any live match, or a
// scheduled match that kicks off within the next hour (a wide back
// window catches matches we have not yet marked live).
export async function inLiveWindow(): Promise<boolean> {
  const now = Date.now();
  const rows = await db
    .select({ status: matches.status, kickoffUtc: matches.kickoffUtc })
    .from(matches)
    .where(sql`${matches.status} in ('live', 'ht') or (${matches.status} = 'scheduled' and ${matches.kickoffUtc} between ${new Date(now - 3 * 3600 * 1000)} and ${new Date(now + 3600 * 1000)})`);
  return rows.length > 0;
}

export async function lastFullSyncMs(): Promise<number> {
  const [row] = await db.select().from(syncMeta).where(eq(syncMeta.key, 'lastFullSync')).limit(1);
  return row ? Number(row.value) : 0;
}
