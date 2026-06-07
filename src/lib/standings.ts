// Advancement flags from group standings: rank 1 and 2 of each group
// advance, plus the 8 best third-placed teams ranked across all groups
// by points, then goal difference, then goals for.

export interface StandingInput {
  groupLetter: string;
  teamCode: string;
  points: number;
  gd: number;
  gf: number;
  rank: number | null;
}

export interface AdvancementFlags {
  advanced: Set<string>;
  bestThirds: Set<string>;
}

export function deriveAdvancement(rows: StandingInput[]): AdvancementFlags {
  const advanced = new Set<string>();
  for (const row of rows) {
    if (row.rank === 1 || row.rank === 2) advanced.add(row.teamCode);
  }

  const thirds = rows
    .filter((r) => r.rank === 3)
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

  const bestThirds = new Set<string>();
  for (const row of thirds.slice(0, 8)) {
    bestThirds.add(row.teamCode);
    advanced.add(row.teamCode);
  }

  return { advanced, bestThirds };
}
