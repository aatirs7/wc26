// Adults vs kids split for the family stats page. Matched by display
// name (case-insensitive). Anyone not listed here counts as a kid.

export const ADULT_NAMES = [
  'Adeel', 'Wajiha', 'Adnan', 'Madiha', 'Afif', 'Farheen', 'Arees', 'Nida',
  'Aazim', 'Daadi',
];

const ADULT_SET = new Set(ADULT_NAMES.map((n) => n.toLowerCase()));

export type Cohort = 'adults' | 'kids';

export function cohortOf(displayName: string): Cohort {
  return ADULT_SET.has(displayName.toLowerCase()) ? 'adults' : 'kids';
}
