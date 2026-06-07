import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { brackets, poolMembers } from './schema';
import { isLocked } from './lock';

export async function isPoolMember(clerkId: string, poolId: string): Promise<boolean> {
  const row = await db
    .select({ clerkId: poolMembers.clerkId })
    .from(poolMembers)
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.clerkId, clerkId)))
    .limit(1);
  return row.length > 0;
}

export interface BracketAccess {
  canView: boolean;
  canEdit: boolean;
}

// Brackets are viewable read-only by fellow pool members at any time,
// including before lock (owner decision 2026-06-06, overrides the
// original pre-lock privacy rule). Non-members get nothing.
export async function bracketAccess(
  viewerClerkId: string | null,
  bracket: { ownerClerkId: string; poolId: string },
): Promise<BracketAccess> {
  if (!viewerClerkId) return { canView: false, canEdit: false };
  if (viewerClerkId === bracket.ownerClerkId) {
    return { canView: true, canEdit: !isLocked() };
  }
  const member = await isPoolMember(viewerClerkId, bracket.poolId);
  return { canView: member, canEdit: false };
}

export async function loadBracket(id: string) {
  const rows = await db.select().from(brackets).where(eq(brackets.id, id)).limit(1);
  return rows[0] ?? null;
}
