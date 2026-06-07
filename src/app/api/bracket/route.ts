import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { brackets } from '@/lib/schema';
import { isPoolMember } from '@/lib/access';
import { isLocked } from '@/lib/lock';
import { isComplete, pruneDownstream, validatePredictions } from '@/lib/predictions';
import { emptyPredictions } from '@/types/bracket';

const postSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    poolId: z.string().uuid(),
    name: z.string().trim().min(1).max(60).default('My bracket'),
  }),
  z.object({ action: z.literal('submit'), id: z.string().uuid() }),
]);

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60).optional(),
  predictions: z.unknown().optional(),
});

async function loadOwned(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(brackets)
    .where(and(eq(brackets.id, id), eq(brackets.ownerClerkId, userId)))
    .limit(1);
  return row ?? null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const body = parsed.data;

  if (body.action === 'create') {
    if (isLocked()) {
      // Late joiners can view and follow the leaderboard but not enter.
      return NextResponse.json({ error: 'did not lock' }, { status: 403 });
    }
    if (!(await isPoolMember(userId, body.poolId))) {
      return NextResponse.json({ error: 'not a pool member' }, { status: 403 });
    }
    const [existing] = await db
      .select()
      .from(brackets)
      .where(and(eq(brackets.ownerClerkId, userId), eq(brackets.poolId, body.poolId)))
      .limit(1);
    if (existing) return NextResponse.json({ bracket: existing });

    const [bracket] = await db
      .insert(brackets)
      .values({
        ownerClerkId: userId,
        poolId: body.poolId,
        name: body.name,
        predictions: emptyPredictions(),
      })
      .returning();
    return NextResponse.json({ bracket });
  }

  // submit
  if (isLocked()) return NextResponse.json({ error: 'locked' }, { status: 403 });
  const bracket = await loadOwned(body.id, userId);
  if (!bracket) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!isComplete(bracket.predictions)) {
    return NextResponse.json({ error: 'bracket is incomplete' }, { status: 400 });
  }
  const [updated] = await db
    .update(brackets)
    .set({ submitted: true, lockedAt: new Date(), updatedAt: new Date() })
    .where(eq(brackets.id, bracket.id))
    .returning();
  return NextResponse.json({ bracket: updated });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const { id, name, predictions } = parsed.data;

  const bracket = await loadOwned(id, userId);
  if (!bracket) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const set: Record<string, unknown> = { updatedAt: new Date() };

  // Renaming is cosmetic and allowed any time; picks freeze at lock.
  if (name) set.name = name;

  if (predictions !== undefined) {
    if (isLocked()) return NextResponse.json({ error: 'locked' }, { status: 403 });
    let validated;
    try {
      validated = validatePredictions(predictions);
    } catch {
      return NextResponse.json({ error: 'invalid predictions' }, { status: 400 });
    }
    // Defense in depth: never persist a structurally stale chain.
    set.predictions = pruneDownstream(validated);
    // Changing picks after submitting requires a fresh submit; the
    // tiebreaker rewards the final submit time.
    if (bracket.submitted) {
      set.submitted = false;
      set.lockedAt = null;
    }
  }

  const [updated] = await db
    .update(brackets)
    .set(set)
    .where(eq(brackets.id, bracket.id))
    .returning();
  return NextResponse.json({ bracket: updated });
}
