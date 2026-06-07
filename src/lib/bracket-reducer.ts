// Pure reducer behind the bracket builder. Every action that can shrink
// an upstream pool runs pruneDownstream so later rounds never hold
// invalidated picks.

import type { Predictions } from '@/types/bracket';
import {
  ROUND_SIZES,
  THIRD_PLACE_PICKS,
  type GroupLetter,
  type KnockoutRoundKey,
  KNOCKOUT_ROUNDS,
} from './constants';
import { pruneDownstream, qualifiersOf } from './predictions';

export type BracketAction =
  | { type: 'load'; predictions: Predictions }
  | { type: 'cycleGroupPick'; letter: GroupLetter; code: string }
  | { type: 'toggleThird'; code: string }
  | { type: 'toggleRoundPick'; round: KnockoutRoundKey; code: string }
  | { type: 'toggleChampion'; code: string };

export function poolForRound(p: Predictions, round: KnockoutRoundKey): Set<string> {
  const idx = KNOCKOUT_ROUNDS.indexOf(round);
  if (idx === 0) return qualifiersOf(p);
  return new Set(p.knockout[KNOCKOUT_ROUNDS[idx - 1]]);
}

export function bracketReducer(state: Predictions, action: BracketAction): Predictions {
  switch (action.type) {
    case 'load':
      return pruneDownstream(action.predictions);

    case 'cycleGroupPick': {
      const { letter, code } = action;
      const g = { ...(state.groups[letter] ?? {}) };
      if (g.first === code) {
        // 1st -> 2nd, displacing any current 2nd
        g.first = undefined;
        g.second = code;
      } else if (g.second === code) {
        // 2nd -> none
        g.second = undefined;
      } else if (!g.first) {
        g.first = code;
      } else if (!g.second) {
        g.second = code;
      } else {
        // Both slots taken; tap a picked team first to free one.
        return state;
      }
      return pruneDownstream({
        ...state,
        groups: { ...state.groups, [letter]: g },
      });
    }

    case 'toggleThird': {
      const { code } = action;
      if (state.thirdPlace.includes(code)) {
        return pruneDownstream({
          ...state,
          thirdPlace: state.thirdPlace.filter((c) => c !== code),
        });
      }
      if (state.thirdPlace.length >= THIRD_PLACE_PICKS) return state;
      const top2 = new Set(
        Object.values(state.groups).flatMap((g) => [g?.first, g?.second]).filter(Boolean),
      );
      if (top2.has(code)) return state;
      return { ...state, thirdPlace: [...state.thirdPlace, code] };
    }

    case 'toggleRoundPick': {
      const { round, code } = action;
      const picks = state.knockout[round];
      if (picks.includes(code)) {
        return pruneDownstream({
          ...state,
          knockout: { ...state.knockout, [round]: picks.filter((c) => c !== code) },
        });
      }
      if (picks.length >= ROUND_SIZES[round]) return state;
      if (!poolForRound(state, round).has(code)) return state;
      return {
        ...state,
        knockout: { ...state.knockout, [round]: [...picks, code] },
      };
    }

    case 'toggleChampion': {
      const { code } = action;
      if (state.knockout.champion === code) {
        return { ...state, knockout: { ...state.knockout, champion: undefined } };
      }
      if (!state.knockout.final.includes(code)) return state;
      return { ...state, knockout: { ...state.knockout, champion: code } };
    }
  }
}
