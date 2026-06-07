// Results provider abstraction. football-data.org today (free, no daily
// cap, 10 req/min); the contract stays generic so switching providers is
// a config flip, not a refactor. Server-side only: never call this from
// the client.

export interface ProviderFixture {
  providerId: number;
  stage: string | null; // our stage codes: group|r32|r16|qf|sf|third|final
  groupLetter: string | null;
  homeName: string;
  awayName: string;
  homeTla: string | null;
  awayTla: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // normalized: scheduled|live|ht|ft|et|pens
  kickoffUtc: Date;
  winnerName: string | null;
  winnerTla: string | null;
}

export interface ProviderStanding {
  groupName: string; // e.g. "GROUP_A"
  teamName: string;
  teamTla: string | null;
  played: number;
  points: number;
  gd: number;
  gf: number;
  rank: number;
}

export interface ScoresProvider {
  fetchFixtures(): Promise<ProviderFixture[]>;
  fetchStandings(): Promise<ProviderStanding[]>;
}

const BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

// Explicit stage map. The 2026 format adds LAST_32; never assume the
// pre-2026 stage list.
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};

function mapStatus(status: string, duration: string | null): string {
  switch (status) {
    case 'SCHEDULED':
    case 'TIMED':
    case 'SUSPENDED':
    case 'POSTPONED':
      return 'scheduled';
    case 'IN_PLAY':
      return 'live';
    case 'PAUSED':
      return 'ht';
    case 'FINISHED':
    case 'CANCELLED':
    case 'AWARDED':
      if (duration === 'PENALTY_SHOOTOUT') return 'pens';
      if (duration === 'EXTRA_TIME') return 'et';
      return 'ft';
    default:
      return 'scheduled';
  }
}

async function apiGet(path: string): Promise<Record<string, unknown>> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });
  if (res.status === 429) {
    throw new Error('football-data.org rate limited (429); retry in ~60s');
  }
  if (!res.ok) throw new Error(`football-data.org ${path} failed: ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Winner with knockout safety: trust penalties over score.winner when a
// shootout happened (winner can read DRAW while penalties decide it).
function winnerSide(raw: any): 'home' | 'away' | null {
  if (raw.status !== 'FINISHED') return null;
  const pens = raw.score?.penalties;
  if (raw.score?.duration === 'PENALTY_SHOOTOUT' || (pens && pens.home !== pens.away)) {
    if (pens && pens.home !== null && pens.away !== null) {
      return pens.home > pens.away ? 'home' : 'away';
    }
  }
  if (raw.score?.winner === 'HOME_TEAM') return 'home';
  if (raw.score?.winner === 'AWAY_TEAM') return 'away';
  return null;
}

export const footballDataProvider: ScoresProvider = {
  async fetchFixtures() {
    const data = await apiGet(`/competitions/${COMPETITION}/matches`);
    const matches = (data.matches as any[]) ?? [];
    return matches.map((raw): ProviderFixture => {
      const side = winnerSide(raw);
      const winner = side ? raw.teams?.[side] ?? raw[`${side}Team`] : null;
      return {
        providerId: raw.id,
        stage: STAGE_MAP[raw.stage as string] ?? null,
        groupLetter: raw.group ? String(raw.group).replace(/^GROUP_/, '') : null,
        homeName: raw.homeTeam?.name ?? '',
        awayName: raw.awayTeam?.name ?? '',
        homeTla: raw.homeTeam?.tla ?? null,
        awayTla: raw.awayTeam?.tla ?? null,
        homeScore: raw.score?.fullTime?.home ?? null,
        awayScore: raw.score?.fullTime?.away ?? null,
        status: mapStatus(raw.status, raw.score?.duration ?? null),
        kickoffUtc: new Date(raw.utcDate),
        winnerName: side ? (raw[`${side}Team`]?.name ?? winner?.name ?? null) : null,
        winnerTla: side ? (raw[`${side}Team`]?.tla ?? winner?.tla ?? null) : null,
      };
    });
  },

  async fetchStandings() {
    const data = await apiGet(`/competitions/${COMPETITION}/standings`);
    const blocks = (data.standings as any[]) ?? [];
    const out: ProviderStanding[] = [];
    for (const block of blocks) {
      // Tournament standings come back one block per group; ignore
      // non-total tables if the API ever includes them.
      if (block.type && block.type !== 'TOTAL') continue;
      for (const row of block.table ?? []) {
        out.push({
          groupName: block.group ?? '',
          teamName: row.team?.name ?? '',
          teamTla: row.team?.tla ?? null,
          played: row.playedGames ?? 0,
          points: row.points ?? 0,
          gd: row.goalDifference ?? 0,
          gf: row.goalsFor ?? 0,
          rank: row.position ?? 0,
        });
      }
    }
    return out;
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
