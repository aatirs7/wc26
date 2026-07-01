// Temporary, reversible "disqualification" overlay (a prank). Any player whose
// display name is listed here sees a full-screen blocking notice on every page.
//
// TO REVERSE: empty this array (set it to []) and redeploy. That instantly
// lifts the block for everyone. Names are matched case-insensitively against
// the player's display name.
export const DISQUALIFIED_NAMES: string[] = ['aafi', 'aatir'];

export function isDisqualified(displayName: string | null | undefined): boolean {
  if (!displayName) return false;
  return DISQUALIFIED_NAMES.includes(displayName.trim().toLowerCase());
}
