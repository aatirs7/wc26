// Pre-loads the Siddiqui family roster so everyone can tap their name to
// play. Idempotent: re-running adds only missing people. Usage:
//   npx tsx scripts/seed-users.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { eq } from 'drizzle-orm';

const NAMES = [
  'Aashir', 'Aatir', 'Abeer', 'Ammaar', 'Aakif', 'Aarij', 'Alyaan', 'Urisha',
  'Aali', 'Alena', 'Aleza', 'Aafi', 'Rayyan', 'Mustafa', 'Manahil', 'Rameen',
  'Muniza', 'Adeel', 'Afif', 'Arees', 'Adnan', 'Aazim', 'Wajiha', 'Madiha',
  'Farheen', 'Nida', 'Ayra',
];

async function main() {
  const { db } = await import('../src/lib/db');
  const { users, poolMembers, brackets } = await import('../src/lib/schema');
  const { emptyPredictions } = await import('../src/types/bracket');

  const poolId = process.env.NEXT_PUBLIC_DEFAULT_POOL_ID;
  if (!poolId) throw new Error('NEXT_PUBLIC_DEFAULT_POOL_ID is not set');

  let added = 0;
  for (const name of NAMES) {
    await db.insert(users).values({ displayName: name }).onConflictDoNothing();
    const [u] = await db.select().from(users).where(eq(users.displayName, name)).limit(1);
    if (!u) throw new Error(`failed to upsert user ${name}`);

    await db.insert(poolMembers).values({ poolId, userId: u.id }).onConflictDoNothing();
    await db
      .insert(brackets)
      .values({
        ownerId: u.id,
        poolId,
        name: `${name}'s bracket`,
        predictions: emptyPredictions(),
      })
      .onConflictDoNothing();
    added += 1;
  }

  const total = await db.select().from(users);
  console.log(`Ensured ${added} roster names. Total users now: ${total.length}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
