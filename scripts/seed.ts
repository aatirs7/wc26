// Seeds Neon from openfootball/worldcup.json. Idempotent: safe to re-run.
// Usage: npm run seed

import { config } from 'dotenv';
config({ path: '.env.local' });

import { TEAM_MAP } from '../src/lib/team-map';

const SOURCE_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

interface SourceMatch {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
}

const KO_STAGE_BY_ROUND: Record<string, string> = {
  'Round of 32': 'r32',
  'Round of 16': 'r16',
  'Quarter-final': 'qf',
  'Semi-final': 'sf',
  'Match for third place': 'third',
  'Final': 'final',
};

// Third-place playoff and Final carry no num in the source; assign stable ids.
const FALLBACK_IDS: Record<string, number> = { third: 103, final: 104 };

function codeFor(name: string): string {
  const info = TEAM_MAP[name];
  if (!info) throw new Error(`Unknown team name in source data: ${name}`);
  return info.code;
}

async function main() {
  // Import after dotenv so DATABASE_URL is set when db.ts evaluates.
  const { db } = await import('../src/lib/db');
  const { teams, matches, groupStandings, pools } = await import('../src/lib/schema');
  const { parseKickoffUtc } = await import('../src/lib/time');
  const { sql } = await import('drizzle-orm');

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = (await res.json()) as { name: string; matches: SourceMatch[] };

  if (data.matches.length !== 104) {
    throw new Error(`Expected 104 matches, got ${data.matches.length}`);
  }

  // Teams from the 72 group matches.
  const teamRows = new Map<string, { code: string; name: string; groupLetter: string; flag: string }>();
  for (const m of data.matches) {
    if (!m.group) continue;
    const letter = m.group.replace('Group ', '');
    for (const name of [m.team1, m.team2]) {
      const info = TEAM_MAP[name];
      if (!info) throw new Error(`Unknown team name in source data: ${name}`);
      teamRows.set(info.code, { code: info.code, name, groupLetter: letter, flag: info.flag });
    }
  }
  if (teamRows.size !== 48) {
    throw new Error(`Expected 48 teams, derived ${teamRows.size}`);
  }

  // Matches: group matches get ids 1-72 in file order, knockout uses num.
  let groupId = 0;
  const matchRows = data.matches.map((m) => {
    const kickoffUtc = parseKickoffUtc(m.date, m.time);
    if (m.group) {
      groupId += 1;
      return {
        id: groupId,
        stage: 'group',
        groupLetter: m.group.replace('Group ', ''),
        homeCode: codeFor(m.team1),
        awayCode: codeFor(m.team2),
        homePlaceholder: null,
        awayPlaceholder: null,
        kickoffUtc,
        roundLabel: m.round,
      };
    }
    const stage = KO_STAGE_BY_ROUND[m.round];
    if (!stage) throw new Error(`Unknown round label: ${m.round}`);
    const id = m.num ?? FALLBACK_IDS[stage];
    if (!id) throw new Error(`No id for knockout match in round ${m.round}`);
    return {
      id,
      stage,
      groupLetter: null,
      homeCode: null,
      awayCode: null,
      homePlaceholder: m.team1,
      awayPlaceholder: m.team2,
      kickoffUtc,
      roundLabel: m.round,
    };
  });
  if (groupId !== 72) throw new Error(`Expected 72 group matches, got ${groupId}`);

  for (const t of teamRows.values()) {
    await db
      .insert(teams)
      .values(t)
      .onConflictDoUpdate({
        target: teams.code,
        set: { name: t.name, groupLetter: t.groupLetter, flag: t.flag },
      });
  }
  console.log(`Upserted ${teamRows.size} teams`);

  for (const m of matchRows) {
    await db
      .insert(matches)
      .values(m)
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          stage: m.stage,
          groupLetter: m.groupLetter,
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          homePlaceholder: m.homePlaceholder,
          awayPlaceholder: m.awayPlaceholder,
          kickoffUtc: m.kickoffUtc,
          roundLabel: m.roundLabel,
        },
      });
  }
  console.log(`Upserted ${matchRows.length} matches`);

  // Zeroed standings so the standings UI is never empty pre-tournament.
  for (const t of teamRows.values()) {
    await db
      .insert(groupStandings)
      .values({ groupLetter: t.groupLetter, teamCode: t.code })
      .onConflictDoNothing();
  }
  console.log('Seeded zeroed group standings');

  // Bootstrap the default pool that new users auto-join.
  // Put the printed id into NEXT_PUBLIC_DEFAULT_POOL_ID.
  const existingPools = await db.select({ id: pools.id, name: pools.name }).from(pools);
  if (existingPools.length === 0) {
    const [created] = await db
      .insert(pools)
      .values({ name: 'World Cup 2026', joinCode: 'WC2026' })
      .returning({ id: pools.id });
    console.log(`Created default pool. NEXT_PUBLIC_DEFAULT_POOL_ID=${created.id}`);
  } else {
    console.log('Pools already exist:', existingPools.map((p) => `${p.name}=${p.id}`).join(', '));
  }

  const counts = await db.execute(sql`
    select
      (select count(*) from teams) as teams,
      (select count(*) from matches) as matches,
      (select count(*) from group_standings) as standings
  `);
  console.log('DB counts:', counts.rows[0]);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
