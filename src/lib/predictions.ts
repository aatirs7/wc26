import { z } from 'zod';
import {
  GROUP_LETTERS,
  KNOCKOUT_ROUNDS,
  ROUND_SIZES,
  THIRD_PLACE_PICKS,
  type GroupLetter,
} from './constants';
import type { Predictions } from '@/types/bracket';

const teamCode = z.string().regex(/^[A-Z]{3}$/);

const groupPick = z
  .object({
    first: teamCode.optional(),
    second: teamCode.optional(),
  })
  .refine((g) => !g.first || !g.second || g.first !== g.second, {
    message: 'first and second must differ',
  });

// Structural validation for in-progress saves. Partial picks are allowed;
// completeness is only required at submit (see isComplete).
export const predictionsSchema = z
  .object({
    groups: z.partialRecord(z.enum(GROUP_LETTERS), groupPick),
    thirdPlace: z.array(teamCode).max(THIRD_PLACE_PICKS),
    knockout: z.object({
      r16: z.array(teamCode).max(ROUND_SIZES.r16),
      qf: z.array(teamCode).max(ROUND_SIZES.qf),
      sf: z.array(teamCode).max(ROUND_SIZES.sf),
      final: z.array(teamCode).max(ROUND_SIZES.final),
      champion: teamCode.optional(),
    }),
  })
  .superRefine((p, ctx) => {
    const top2 = new Set<string>();
    for (const letter of GROUP_LETTERS) {
      const g = p.groups[letter];
      if (g?.first) top2.add(g.first);
      if (g?.second) top2.add(g.second);
    }
    if (new Set(p.thirdPlace).size !== p.thirdPlace.length) {
      ctx.addIssue({ code: 'custom', message: 'thirdPlace has duplicates', path: ['thirdPlace'] });
    }
    for (const code of p.thirdPlace) {
      if (top2.has(code)) {
        ctx.addIssue({
          code: 'custom',
          message: `thirdPlace pick ${code} is already a top-2 pick`,
          path: ['thirdPlace'],
        });
      }
    }
    // Each knockout round must select only from the prior round's pool.
    const qualifiers = new Set([...top2, ...p.thirdPlace]);
    let pool = qualifiers;
    for (const round of KNOCKOUT_ROUNDS) {
      const picks = p.knockout[round];
      if (new Set(picks).size !== picks.length) {
        ctx.addIssue({ code: 'custom', message: `${round} has duplicates`, path: ['knockout', round] });
      }
      for (const code of picks) {
        if (!pool.has(code)) {
          ctx.addIssue({
            code: 'custom',
            message: `${round} pick ${code} is not in the prior round`,
            path: ['knockout', round],
          });
        }
      }
      pool = new Set(picks);
    }
    if (p.knockout.champion && !pool.has(p.knockout.champion)) {
      ctx.addIssue({
        code: 'custom',
        message: 'champion must be one of the final picks',
        path: ['knockout', 'champion'],
      });
    }
  });

export function validatePredictions(input: unknown): Predictions {
  return predictionsSchema.parse(input) as Predictions;
}

// The 32 teams this bracket sends into the knockout.
export function qualifiersOf(p: Predictions): Set<string> {
  const out = new Set<string>();
  for (const letter of GROUP_LETTERS) {
    const g = p.groups[letter];
    if (g?.first) out.add(g.first);
    if (g?.second) out.add(g.second);
  }
  for (const code of p.thirdPlace) out.add(code);
  return out;
}

// Removes picks invalidated by an upstream edit. Never re-picks for the
// user; under-filled rounds surface in the UI until refilled.
export function pruneDownstream(p: Predictions): Predictions {
  const top2 = new Set<string>();
  for (const letter of GROUP_LETTERS) {
    const g = p.groups[letter];
    if (g?.first) top2.add(g.first);
    if (g?.second) top2.add(g.second);
  }
  const thirdPlace = p.thirdPlace.filter((c) => !top2.has(c));
  let pool = new Set([...top2, ...thirdPlace]);

  const knockout = { ...p.knockout };
  for (const round of KNOCKOUT_ROUNDS) {
    knockout[round] = p.knockout[round].filter((c) => pool.has(c));
    pool = new Set(knockout[round]);
  }
  if (knockout.champion && !pool.has(knockout.champion)) {
    knockout.champion = undefined;
  }
  return { groups: p.groups, thirdPlace, knockout };
}

export function isComplete(p: Predictions): boolean {
  for (const letter of GROUP_LETTERS) {
    const g = p.groups[letter];
    if (!g?.first || !g?.second) return false;
  }
  if (p.thirdPlace.length !== THIRD_PLACE_PICKS) return false;
  for (const round of KNOCKOUT_ROUNDS) {
    if (p.knockout[round].length !== ROUND_SIZES[round]) return false;
  }
  return !!p.knockout.champion;
}

export type GroupPickMap = Partial<Record<GroupLetter, { first?: string; second?: string }>>;
