// Adults vs kids split for the family stats page. Matched by display
// name (case-insensitive). Anyone not listed here counts as a kid.

export const ADULT_NAMES = [
  'Adeel', 'Wajiha', 'Adnan', 'Madiha', 'Afif', 'Farheen', 'Arees', 'Nida',
  'Aazim', 'Daadi', 'Aarij', 'Urisha',
];

const ADULT_SET = new Set(ADULT_NAMES.map((n) => n.toLowerCase()));

export type Cohort = 'adults' | 'kids';

export function cohortOf(displayName: string): Cohort {
  return ADULT_SET.has(displayName.toLowerCase()) ? 'adults' : 'kids';
}

// The five family households. Named by the parents.
export const FAMILIES: { name: string; members: string[] }[] = [
  { name: 'Adeel & Wajiha', members: ['Aatir', 'Aashir', 'Abeer', 'Ammaar', 'Wajiha', 'Adeel'] },
  { name: 'Afif & Farheen', members: ['Alyaan', 'Aakif', 'Aarij', 'Afif', 'Farheen', 'Urisha', 'Ayra', 'Aayra'] },
  { name: 'Arees & Nida', members: ['Aafi', 'Aali', 'Alena', 'Aleza', 'Arees', 'Nida'] },
  { name: 'Adnan & Madiha', members: ['Rayyan', 'Mustafa', 'Manahil', 'Rameen', 'Muniza', 'Adnan', 'Madiha'] },
  { name: 'Daadi & Aazim', members: ['Daadi', 'Aazim'] },
];

const FAMILY_BY_NAME = new Map<string, string>();
for (const f of FAMILIES) for (const m of f.members) FAMILY_BY_NAME.set(m.toLowerCase(), f.name);

export function familyOf(displayName: string): string | null {
  return FAMILY_BY_NAME.get(displayName.toLowerCase()) ?? null;
}
