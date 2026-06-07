import { describe, expect, it } from 'vitest';
import {
  isComplete,
  pruneDownstream,
  validatePredictions,
} from '@/lib/predictions';
import { emptyPredictions, type Predictions } from '@/types/bracket';
import { GROUP_LETTERS } from '@/lib/constants';

// Builds a fully valid complete bracket from synthetic codes.
// Each group X gets teams X1F/X2S as top 2, X3T as a third-place pick
// for the first 8 groups. Codes must be 3 uppercase letters.
const T = (letter: string, n: number) => `${letter}${'ABC'[n]}X`;

function completeBracket(): Predictions {
  const p = emptyPredictions();
  for (const letter of GROUP_LETTERS) {
    p.groups[letter] = { first: T(letter, 0), second: T(letter, 1) };
  }
  p.thirdPlace = GROUP_LETTERS.slice(0, 8).map((l) => T(l, 2));
  const qualifiers = [
    ...GROUP_LETTERS.flatMap((l) => [T(l, 0), T(l, 1)]),
    ...p.thirdPlace,
  ];
  p.knockout.r16 = qualifiers.slice(0, 16);
  p.knockout.qf = p.knockout.r16.slice(0, 8);
  p.knockout.sf = p.knockout.qf.slice(0, 4);
  p.knockout.final = p.knockout.sf.slice(0, 2);
  p.knockout.champion = p.knockout.final[0];
  return p;
}

describe('validatePredictions', () => {
  it('accepts an empty in-progress bracket', () => {
    expect(() => validatePredictions(emptyPredictions())).not.toThrow();
  });

  it('accepts a complete valid bracket', () => {
    const p = completeBracket();
    expect(() => validatePredictions(p)).not.toThrow();
    expect(isComplete(p)).toBe(true);
  });

  it('rejects first == second in a group', () => {
    const p = emptyPredictions();
    p.groups.A = { first: 'MEX', second: 'MEX' };
    expect(() => validatePredictions(p)).toThrow();
  });

  it('rejects a third-place pick that is already top 2', () => {
    const p = emptyPredictions();
    p.groups.A = { first: 'MEX', second: 'KOR' };
    p.thirdPlace = ['MEX'];
    expect(() => validatePredictions(p)).toThrow();
  });

  it('rejects knockout picks outside the prior round pool', () => {
    const p = emptyPredictions();
    p.groups.A = { first: 'MEX', second: 'KOR' };
    p.knockout.r16 = ['BRA'];
    expect(() => validatePredictions(p)).toThrow();
  });

  it('rejects a champion not present in the final picks', () => {
    const p = completeBracket();
    p.knockout.champion = p.knockout.sf[3];
    expect(() => validatePredictions(p)).toThrow();
  });
});

describe('pruneDownstream', () => {
  it('removes a demoted team from every later round', () => {
    const p = completeBracket();
    const victim = p.groups.A!.first!;
    expect(p.knockout.r16).toContain(victim);
    p.groups.A = { first: p.groups.A!.second, second: undefined };

    const pruned = pruneDownstream(p);
    expect(pruned.knockout.r16).not.toContain(victim);
    expect(pruned.knockout.qf).not.toContain(victim);
    expect(pruned.knockout.sf).not.toContain(victim);
    expect(pruned.knockout.final).not.toContain(victim);
    expect(pruned.knockout.champion).not.toBe(victim);
    expect(isComplete(pruned)).toBe(false);
  });

  it('drops third-place picks promoted into top 2', () => {
    const p = completeBracket();
    const third = p.thirdPlace[0];
    p.groups.A = { first: third, second: p.groups.A!.second };
    const pruned = pruneDownstream(p);
    expect(pruned.thirdPlace).not.toContain(third);
  });

  it('keeps a valid bracket untouched', () => {
    const p = completeBracket();
    const pruned = pruneDownstream(p);
    expect(pruned).toEqual(p);
  });
});
