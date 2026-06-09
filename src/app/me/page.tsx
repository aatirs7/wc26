import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, poolMembers, pools, users } from '@/lib/schema';
import { currentUserId } from '@/lib/auth';
import { isLocked } from '@/lib/lock';
import RenameBracket from '@/components/me/RenameBracket';
import BracketControls from '@/components/me/BracketControls';
import InstallGuide from '@/components/me/InstallGuide';
import RenameSelf from '@/components/me/RenameSelf';
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
    <div className="space-y-7 py-4">
      <header className="flex flex-col items-center gap-2 pt-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent font-display text-3xl text-[var(--accent-ink)]">
          {(me?.displayName ?? 'Y').slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="font-display text-3xl leading-none">{me?.displayName ?? 'You'}</h1>
          <p className="text-sm text-muted">
            {isLocked() ? 'Tournament running' : 'Editable until kickoff'}
          </p>
        </div>
        <RenameSelf currentName={me?.displayName ?? ''} />
        <SwitchPlayer />
      </header>

      <section className="space-y-3">
        <h2 className="text-center font-display text-xl text-muted">My bracket</h2>
        {myBrackets.map(({ pool, bracket }) => (
          <div key={pool.poolId} className="card space-y-3 p-3.5">
            {bracket ? (
              <>
                <RenameBracket bracketId={bracket.id} currentName={bracket.name} />
                {!bracket.submitted && !isLocked() ? (
                  <p className="text-xs font-semibold text-gold">Not submitted yet</p>
                ) : null}
                {!isLocked() ? <BracketControls bracketId={bracket.id} /> : null}
              </>
            ) : (
              <p className="text-xs text-muted">No bracket yet</p>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-center font-display text-xl text-muted">Add to home screen</h2>
        <InstallGuide />
      </section>
    </div>
  );
}
