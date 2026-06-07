import { describe, expect, it } from 'vitest';
import { assignThirds, resolveBracket, R32 } from '@/lib/knockout-bracket';
import { bracketReducer } from '@/lib/bracket-reducer';
import { emptyPredictions, type Predictions } from '@/types/bracket';
import { GROUP_LETTERS } from '@/lib/constants';

const T = (letter: string, n: number) => `${letter}${'ABCD'[n]}X`;

// Groups fully ranked, 8 best thirds chosen, knockout empty.
function seeded(): Predictions {
  const p = emptyPredictions();
  for (const letter of GROUP_LETTERS) {
    p.groups[letter] = {
      first: T(letter, 0),
      second: T(letter, 1),
      third: T(letter, 2),
      fourth: T(letter, 3),
    };
  }
  p.thirdPlace = GROUP_LETTERS.slice(0, 8).map((l) => T(l, 2));
  return p;
}

describe('assignThirds', () => {
  it('places all 8 picked thirds into eligible slots', () => {
    const assigned = assignThirds(seeded());
    expect(assigned.size).toBe(8);
    const thirdSlots = R32.filter((m) => m.b.kind === 'third');
    for (const [matchupId, code] of assigned) {
      const slot = thirdSlots.find((m) => m.id === matchupId)!;
      const groups = (slot.b as { groups: string[] }).groups;
      const group = code[0]; // synthetic code starts with its group letter
      expect(groups).toContain(group);
    }
  });
});

describe('resolveBracket', () => {
  it('seeds all 16 R32 ties with two real teams', () => {
    const r = resolveBracket(seeded());
    expect(r.r32).toHaveLength(16);
    for (const m of r.r32) {
      expect(m.aCode).toBeTruthy();
      expect(m.bCode).toBeTruthy();
      expect(m.winner).toBeNull();
    }
  });

  it('every qualifier appears exactly once across R32', () => {
    const r = resolveBracket(seeded());
    const codes = r.r32.flatMap((m) => [m.aCode, m.bCode]).filter(Boolean);
    expect(codes).toHaveLength(32);
    expect(new Set(codes).size).toBe(32);
  });

  it('reflects a chosen winner', () => {
    const p = seeded();
    const first = resolveBracket(p).r32[0];
    p.knockout.r16 = [first.aCode!];
    const resolved = resolveBracket(p).r32[0];
    expect(resolved.winner).toBe(first.aCode);
  });
});

describe('pickWinner reducer', () => {
  it('advances a winner and swaps out the beaten team', () => {
    const p = seeded();
    const tie = resolveBracket(p).r32[0];
    const a = tie.aCode!;
    const b = tie.bCode!;

    const afterA = bracketReducer(p, { type: 'pickWinner', fills: 'r16', winner: a, loser: b });
    expect(afterA.knockout.r16).toContain(a);
    expect(afterA.knockout.r16).not.toContain(b);

    const afterB = bracketReducer(afterA, { type: 'pickWinner', fills: 'r16', winner: b, loser: a });
    expect(afterB.knockout.r16).toContain(b);
    expect(afterB.knockout.r16).not.toContain(a);

    const cleared = bracketReducer(afterB, { type: 'pickWinner', fills: 'r16', winner: b, loser: a });
    expect(cleared.knockout.r16).not.toContain(b);
  });

  it('sets champion only from the final pair', () => {
    const p = seeded();
    const afterA = bracketReducer(p, { type: 'pickWinner', fills: 'champion', winner: 'AAX', loser: null });
    expect(afterA.knockout.champion).toBe('AAX');
    const toggledOff = bracketReducer(afterA, { type: 'pickWinner', fills: 'champion', winner: 'AAX', loser: null });
    expect(toggledOff.knockout.champion).toBeUndefined();
  });
});
