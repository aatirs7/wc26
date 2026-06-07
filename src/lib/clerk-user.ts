import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { poolMembers, users } from './schema';

// Upserts the users row on first authenticated request and auto-joins
// the default pool. Returns the clerk id, or null if signed out.
export async function ensureUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (existing.length === 0) {
    const u = await currentUser();
    const displayName =
      u?.firstName ||
      u?.username ||
      u?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
      'Anonymous';
    await db.insert(users).values({ clerkId: userId, displayName }).onConflictDoNothing();
  }

  const defaultPoolId = process.env.NEXT_PUBLIC_DEFAULT_POOL_ID;
  if (defaultPoolId) {
    await db
      .insert(poolMembers)
      .values({ poolId: defaultPoolId, clerkId: userId })
      .onConflictDoNothing();
  }

  return userId;
}
