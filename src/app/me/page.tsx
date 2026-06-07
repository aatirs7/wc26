import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, poolMembers, pools, users } from '@/lib/schema';
import { currentUserId } from '@/lib/auth';
import { isLocked } from '@/lib/lock';
import PoolActions from '@/components/pools/PoolActions';
import RenameBracket from '@/components/me/RenameBracket';
import SwitchPlayer from '@/components/auth/SwitchPlayer';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const userId = await currentUserId();
  if (!userId) redirect('/');

  const [me] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const myPools = await db
    .select({ poolId: pools.id, name: pools.name, joinCode: pools.joinCode })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(eq(poolMembers.userId, userId));

  const myBrackets = await Promise.all(
    myPools.map(async (p) => {
      const [b] = await db
        .select({ id: brackets.id, name: brackets.name, submitted: brackets.submitted })
        .from(brackets)
        .where(and(eq(brackets.ownerId, userId), eq(brackets.poolId, p.poolId)))
        .limit(1);
      return { pool: p, bracket: b ?? null };
    }),
  );

  return (
    <div className="space-y-6 py-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{me?.displayName ?? 'You'}</h1>
          <p className="text-sm text-muted">
            {isLocked() ? 'Tournament running' : 'Brackets editable until kickoff'}
          </p>
        </div>
        <SwitchPlayer />
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">My pools</h2>
        {myBrackets.map(({ pool, bracket }) => (
          <div key={pool.poolId} className="space-y-3 rounded-2xl border border-edge bg-surface/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{pool.name}</span>
              <span className="text-xs text-muted">
                Invite: <span className="font-mono font-bold text-foreground">{pool.joinCode}</span>
              </span>
            </div>
            {bracket ? (
              <>
                <RenameBracket bracketId={bracket.id} currentName={bracket.name} />
                {!bracket.submitted && !isLocked() ? (
                  <p className="text-xs text-gold">Not submitted yet</p>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted">No bracket in this pool yet</p>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Join or create a pool
        </h2>
        <PoolActions />
      </section>
    </div>
  );
}
