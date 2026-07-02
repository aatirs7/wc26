// Temporary, reversible "disqualification" overlay (a prank). A listed player
// sees a full-screen blocking countdown; the block lifts automatically at
// DISQUALIFIED_UNTIL, at which point they are let straight back in.
//
// TO REVERSE EARLY: empty this array (set it to []) or move DISQUALIFIED_UNTIL
// into the past, then redeploy. Names match case-insensitively.
export const DISQUALIFIED_NAMES: string[] = ['aafi'];

// The block auto-lifts at this moment (a 2-hour timer, set 2026-07-02). This
// same moment is when the pool-wide red-card reminder starts showing.
export const DISQUALIFIED_UNTIL = new Date('2026-07-02T17:50:00Z');

export function isDisqualified(
  displayName: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!displayName) return false;
  if (now.getTime() >= DISQUALIFIED_UNTIL.getTime()) return false;
  return DISQUALIFIED_NAMES.includes(displayName.trim().toLowerCase());
}
