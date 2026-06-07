// All 48 qualified teams, keyed by the exact name used in
// openfootball/worldcup.json 2026. FIFA 3-letter codes, flag emojis.
// The seed script throws on any name not in this map.

export interface TeamInfo {
  code: string;
  flag: string;
}

export const TEAM_MAP: Record<string, TeamInfo> = {
  // Group A
  'Mexico': { code: 'MEX', flag: '\u{1F1F2}\u{1F1FD}' },
  'South Africa': { code: 'RSA', flag: '\u{1F1FF}\u{1F1E6}' },
  'South Korea': { code: 'KOR', flag: '\u{1F1F0}\u{1F1F7}' },
  'Czech Republic': { code: 'CZE', flag: '\u{1F1E8}\u{1F1FF}' },
  // Group B
  'Canada': { code: 'CAN', flag: '\u{1F1E8}\u{1F1E6}' },
  'Switzerland': { code: 'SUI', flag: '\u{1F1E8}\u{1F1ED}' },
  'Qatar': { code: 'QAT', flag: '\u{1F1F6}\u{1F1E6}' },
  'Bosnia & Herzegovina': { code: 'BIH', flag: '\u{1F1E7}\u{1F1E6}' },
  // Group C
  'Brazil': { code: 'BRA', flag: '\u{1F1E7}\u{1F1F7}' },
  'Morocco': { code: 'MAR', flag: '\u{1F1F2}\u{1F1E6}' },
  'Scotland': { code: 'SCO', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}' },
  'Haiti': { code: 'HAI', flag: '\u{1F1ED}\u{1F1F9}' },
  // Group D
  'USA': { code: 'USA', flag: '\u{1F1FA}\u{1F1F8}' },
  'Australia': { code: 'AUS', flag: '\u{1F1E6}\u{1F1FA}' },
  'Paraguay': { code: 'PAR', flag: '\u{1F1F5}\u{1F1FE}' },
  'Turkey': { code: 'TUR', flag: '\u{1F1F9}\u{1F1F7}' },
  // Group E
  'Germany': { code: 'GER', flag: '\u{1F1E9}\u{1F1EA}' },
  'Ecuador': { code: 'ECU', flag: '\u{1F1EA}\u{1F1E8}' },
  'Ivory Coast': { code: 'CIV', flag: '\u{1F1E8}\u{1F1EE}' },
  'Curaçao': { code: 'CUW', flag: '\u{1F1E8}\u{1F1FC}' },
  // Group F
  'Netherlands': { code: 'NED', flag: '\u{1F1F3}\u{1F1F1}' },
  'Japan': { code: 'JPN', flag: '\u{1F1EF}\u{1F1F5}' },
  'Sweden': { code: 'SWE', flag: '\u{1F1F8}\u{1F1EA}' },
  'Tunisia': { code: 'TUN', flag: '\u{1F1F9}\u{1F1F3}' },
  // Group G
  'Belgium': { code: 'BEL', flag: '\u{1F1E7}\u{1F1EA}' },
  'Iran': { code: 'IRN', flag: '\u{1F1EE}\u{1F1F7}' },
  'Egypt': { code: 'EGY', flag: '\u{1F1EA}\u{1F1EC}' },
  'New Zealand': { code: 'NZL', flag: '\u{1F1F3}\u{1F1FF}' },
  // Group H
  'Spain': { code: 'ESP', flag: '\u{1F1EA}\u{1F1F8}' },
  'Uruguay': { code: 'URU', flag: '\u{1F1FA}\u{1F1FE}' },
  'Saudi Arabia': { code: 'KSA', flag: '\u{1F1F8}\u{1F1E6}' },
  'Cape Verde': { code: 'CPV', flag: '\u{1F1E8}\u{1F1FB}' },
  // Group I
  'France': { code: 'FRA', flag: '\u{1F1EB}\u{1F1F7}' },
  'Senegal': { code: 'SEN', flag: '\u{1F1F8}\u{1F1F3}' },
  'Norway': { code: 'NOR', flag: '\u{1F1F3}\u{1F1F4}' },
  'Iraq': { code: 'IRQ', flag: '\u{1F1EE}\u{1F1F6}' },
  // Group J
  'Argentina': { code: 'ARG', flag: '\u{1F1E6}\u{1F1F7}' },
  'Austria': { code: 'AUT', flag: '\u{1F1E6}\u{1F1F9}' },
  'Algeria': { code: 'ALG', flag: '\u{1F1E9}\u{1F1FF}' },
  'Jordan': { code: 'JOR', flag: '\u{1F1EF}\u{1F1F4}' },
  // Group K
  'Portugal': { code: 'POR', flag: '\u{1F1F5}\u{1F1F9}' },
  'Colombia': { code: 'COL', flag: '\u{1F1E8}\u{1F1F4}' },
  'Uzbekistan': { code: 'UZB', flag: '\u{1F1FA}\u{1F1FF}' },
  'DR Congo': { code: 'COD', flag: '\u{1F1E8}\u{1F1E9}' },
  // Group L
  'England': { code: 'ENG', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
  'Croatia': { code: 'CRO', flag: '\u{1F1ED}\u{1F1F7}' },
  'Ghana': { code: 'GHA', flag: '\u{1F1EC}\u{1F1ED}' },
  'Panama': { code: 'PAN', flag: '\u{1F1F5}\u{1F1E6}' },
};

const entries = Object.keys(TEAM_MAP);
if (entries.length !== 48) {
  throw new Error(`TEAM_MAP must have exactly 48 teams, found ${entries.length}`);
}
const codes = new Set(Object.values(TEAM_MAP).map((t) => t.code));
if (codes.size !== 48) {
  throw new Error('TEAM_MAP codes must be unique');
}

// Alternate spellings used by results providers (API-Football and
// friends), normalized to lowercase without diacritics.
const ALIASES: Record<string, string> = {
  'korea republic': 'KOR',
  'united states': 'USA',
  'united states of america': 'USA',
  "cote d'ivoire": 'CIV',
  'turkiye': 'TUR',
  'czechia': 'CZE',
  'bosnia and herzegovina': 'BIH',
  'bosnia-herzegovina': 'BIH',
  'cape verde islands': 'CPV',
  'cabo verde': 'CPV',
  'congo dr': 'COD',
  'ir iran': 'IRN',
  'saudi-arabia': 'KSA',
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const NORMALIZED_MAP = new Map<string, string>([
  ...Object.entries(TEAM_MAP).map(
    ([name, info]) => [normalize(name), info.code] as [string, string],
  ),
  ...Object.entries(ALIASES),
]);

// Resolves any provider team name to our FIFA code, or null if unknown.
export function resolveTeamCode(providerName: string): string | null {
  return NORMALIZED_MAP.get(normalize(providerName)) ?? null;
}

export const TEAM_CODES = codes;

// Crosswalk for provider teams: trust a tla that byte-matches one of our
// canonical codes, otherwise fall back to name matching. Returns null if
// neither resolves, so mismatches surface in sync notes instead of
// silently missing scoring keys.
export function resolveProviderTeam(tla: string | null, name: string): string | null {
  if (tla && codes.has(tla)) return tla;
  return resolveTeamCode(name) ?? (tla ? resolveTeamCode(tla) : null);
}
