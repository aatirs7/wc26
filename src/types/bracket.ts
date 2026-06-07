import type { GroupLetter } from '@/lib/constants';

export interface GroupPick {
  first?: string;
  second?: string;
}

export interface KnockoutPicks {
  r16: string[];
  qf: string[];
  sf: string[];
  final: string[];
  champion?: string;
}

export interface Predictions {
  groups: Partial<Record<GroupLetter, GroupPick>>;
  thirdPlace: string[];
  knockout: KnockoutPicks;
}

export function emptyPredictions(): Predictions {
  return {
    groups: {},
    thirdPlace: [],
    knockout: { r16: [], qf: [], sf: [], final: [] },
  };
}
