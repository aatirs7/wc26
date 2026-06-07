// Approximate FIFA men's world ranking per qualified team, shown subtly
// on team chips for flavor. Snapshot, not live; tweak freely.

export const FIFA_RANK: Record<string, number> = {
  // Group A
  MEX: 17, RSA: 56, KOR: 23, CZE: 40,
  // Group B
  CAN: 30, SUI: 19, QAT: 36, BIH: 74,
  // Group C
  BRA: 5, MAR: 12, SCO: 39, HAI: 83,
  // Group D
  USA: 16, AUS: 24, PAR: 46, TUR: 26,
  // Group E
  GER: 10, ECU: 22, CIV: 41, CUW: 82,
  // Group F
  NED: 7, JPN: 18, SWE: 33, TUN: 49,
  // Group G
  BEL: 8, IRN: 20, EGY: 32, NZL: 86,
  // Group H
  ESP: 2, URU: 14, KSA: 60, CPV: 70,
  // Group I
  FRA: 3, SEN: 19, NOR: 25, IRQ: 58,
  // Group J
  ARG: 1, AUT: 22, ALG: 38, JOR: 64,
  // Group K
  POR: 6, COL: 13, UZB: 57, COD: 55,
  // Group L
  ENG: 4, CRO: 10, GHA: 73, PAN: 31,
};

export function fifaRank(code: string): number | undefined {
  return FIFA_RANK[code];
}
