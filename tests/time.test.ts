import { describe, expect, it } from 'vitest';
import { parseKickoffUtc } from '@/lib/time';

describe('parseKickoffUtc', () => {
  it('parses the opening match (13:00 UTC-6 = 19:00Z)', () => {
    const d = parseKickoffUtc('2026-06-11', '13:00 UTC-6');
    expect(d.toISOString()).toBe('2026-06-11T19:00:00.000Z');
  });

  it('parses the final (15:00 UTC-4 = 19:00Z)', () => {
    const d = parseKickoffUtc('2026-07-19', '15:00 UTC-4');
    expect(d.toISOString()).toBe('2026-07-19T19:00:00.000Z');
  });

  it('parses half-hour times and west-coast offsets', () => {
    const d = parseKickoffUtc('2026-06-29', '16:30 UTC-4');
    expect(d.toISOString()).toBe('2026-06-29T20:30:00.000Z');
    const d2 = parseKickoffUtc('2026-06-28', '12:00 UTC-7');
    expect(d2.toISOString()).toBe('2026-06-28T19:00:00.000Z');
  });

  it('rolls over midnight when offset pushes past 24h', () => {
    const d = parseKickoffUtc('2026-06-15', '22:00 UTC-6');
    expect(d.toISOString()).toBe('2026-06-16T04:00:00.000Z');
  });

  it('rejects garbage', () => {
    expect(() => parseKickoffUtc('2026-06-11', '13:00 EST')).toThrow();
    expect(() => parseKickoffUtc('June 11', '13:00 UTC-6')).toThrow();
  });
});
