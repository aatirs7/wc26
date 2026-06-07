// Results provider abstraction. API-Football today; swap the
// implementation (Sportmonks, SportsDataIO) without touching sync logic.
// Server-side only: the free tier is ~100 requests/day, so nothing here
// may ever run from the client.

export interface ProviderFixture {
  providerId: number;
  round: string | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // normalized: scheduled|live|ht|ft|et|pens
  kickoffUtc: Date;
  winnerName: string | null;
}

export interface ProviderStanding {
  groupName: string; // e.g. "Group A"
  teamName: string;
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

const BASE = 'https://v3.football.api-sports.io';
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;

// API-Football short status codes -> our normalized statuses.
const STATUS_MAP: Record<string, string> = {
  TBD: 'scheduled',
  NS: 'scheduled',
  PST: 'scheduled',
  CANC: 'scheduled',
  ABD: 'scheduled',
  '1H': 'live',
  '2H': 'live',
  ET: 'live',
  BT: 'live',
  P: 'live',
  SUSP: 'live',
  INT: 'live',
  LIVE: 'live',
  HT: 'ht',
  FT: 'ft',
  AET: 'et',
  PEN: 'pens',
};

async function apiGet(path: string): Promise<unknown[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY is not set');
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': key },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API-Football ${path} failed: ${res.status}`);
  const data = (await res.json()) as { errors?: unknown; response?: unknown[] };
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football ${path} errors: ${JSON.stringify(data.errors)}`);
  }
  return data.response ?? [];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const apiFootballProvider: ScoresProvider = {
  async fetchFixtures() {
    const response = await apiGet(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
    return response.map((raw: any): ProviderFixture => {
      const winner =
        raw.teams?.home?.winner === true
          ? raw.teams.home.name
          : raw.teams?.away?.winner === true
            ? raw.teams.away.name
            : null;
      return {
        providerId: raw.fixture.id,
        round: raw.league?.round ?? null,
        homeName: raw.teams.home.name,
        awayName: raw.teams.away.name,
        homeScore: raw.goals?.home ?? null,
        awayScore: raw.goals?.away ?? null,
        status: STATUS_MAP[raw.fixture?.status?.short as string] ?? 'scheduled',
        kickoffUtc: new Date(raw.fixture.date),
        winnerName: winner,
      };
    });
  },

  async fetchStandings() {
    const response = await apiGet(`/standings?league=${LEAGUE}&season=${SEASON}`);
    const out: ProviderStanding[] = [];
    for (const raw of response as any[]) {
      // World Cup standings come back as one array per group.
      const groups: any[][] = raw.league?.standings ?? [];
      for (const group of groups) {
        for (const row of group) {
          out.push({
            groupName: row.group ?? '',
            teamName: row.team?.name ?? '',
            played: row.all?.played ?? 0,
            points: row.points ?? 0,
            gd: row.goalsDiff ?? 0,
            gf: row.all?.goals?.for ?? 0,
            rank: row.rank ?? 0,
          });
        }
      }
    }
    return out;
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
