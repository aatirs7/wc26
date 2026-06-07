import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { poolMembers, pools } from '@/lib/schema';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal('join'), code: z.string().trim().min(4).max(12) }),
]);

// Unambiguous alphabet: no 0/O/1/I/L.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeJoinCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const body = parsed.data;

  if (body.action === 'create') {
    // Retry a few times in case of a join-code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const joinCode = makeJoinCode();
      try {
        const [pool] = await db
          .insert(pools)
          .values({ name: body.name, ownerClerkId: userId, joinCode })
          .returning();
        await db
          .insert(poolMembers)
          .values({ poolId: pool.id, clerkId: userId })
          .onConflictDoNothing();
        return NextResponse.json({ pool });
      } catch {
        // join_code unique violation; try a new code
      }
    }
    return NextResponse.json({ error: 'could not create pool' }, { status: 500 });
  }

  const code = body.code.toUpperCase();
  const [pool] = await db.select().from(pools).where(eq(pools.joinCode, code)).limit(1);
  if (!pool) return NextResponse.json({ error: 'no pool with that code' }, { status: 404 });

  await db
    .insert(poolMembers)
    .values({ poolId: pool.id, clerkId: userId })
    .onConflictDoNothing();
  return NextResponse.json({ pool });
}
