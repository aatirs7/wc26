import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brackets, poolMembers, pools, teams } from '@/lib/schema';
import { ensureUser } from '@/lib/clerk-user';
import { isLocked } from '@/lib/lock';
import BracketBuilder from '@/components/bracket/BracketBuilder';
import BracketSummary from '@/components/brackets/BracketSummary';
import StartBracket from '@/components/bracket/StartBracket';
import PoolActions from '@/components/pools/PoolActions';

export const dynamic = 'force-dynamic';

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<{ pool?: string }>;
}) {
  const userId = await ensureUser();
  if (!userId) redirect('/');

  const memberships = await db
    .select({ poolId: poolMembers.poolId, poolName: pools.name })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(eq(poolMembers.clerkId, userId));

  if (memberships.length === 0) {
    return (
      <div className="py-6">
        <h1 className="mb-4 text-xl font-bold">Join a pool to play</h1>
        <PoolActions />
      </div>
    );
  }

  const { pool: requested } = await searchParams;
  const activePoolId =
    memberships.find((m) => m.poolId === requested)?.poolId ??
    memberships.find((m) => m.poolId === process.env.NEXT_PUBLIC_DEFAULT_POOL_ID)?.poolId ??
    memberships[0].poolId;

  const [bracket] = await db
    .select()
    .from(brackets)
    .where(and(eq(brackets.ownerClerkId, userId), eq(brackets.poolId, activePoolId)))
    .limit(1);

  const allTeams = await db
    .select()
    .from(teams)
    .orderBy(asc(teams.groupLetter), asc(teams.name));

  const locked = isLocked();

  return (
    <div className="py-4">
      {memberships.length > 1 ? (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {memberships.map((m) => (
            <Link
              key={m.poolId}
              href={`/bracket?pool=${m.poolId}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                m.poolId === activePoolId
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-edge bg-surface text-muted'
              }`}
            >
              {m.poolName}
            </Link>
          ))}
        </div>
      ) : null}

      {!bracket ? (
        locked ? (
          <div className="mt-8 rounded-2xl border border-edge bg-surface/50 p-6 text-center">
            <h1 className="text-lg font-bold">Brackets are locked</h1>
            <p className="mt-2 text-sm text-muted">
              The tournament has started, so new brackets cannot be entered.
              You can still follow the pool on the leaderboard.
            </p>
          </div>
        ) : (
          <StartBracket poolId={activePoolId} />
        )
      ) : locked ? (
        <div className="space-y-4">
          <header>
            <h1 className="text-xl font-bold">{bracket.name}</h1>
            <p className="text-sm text-muted">
              Locked in. {bracket.submitted ? 'Good luck!' : 'This bracket was not submitted before kickoff.'}
            </p>
          </header>
          <BracketSummary predictions={bracket.predictions} teams={allTeams} />
        </div>
      ) : (
        <BracketBuilder
          bracket={{
            id: bracket.id,
            name: bracket.name,
            predictions: bracket.predictions,
            submitted: bracket.submitted,
          }}
          teams={allTeams}
        />
      )}
    </div>
  );
}
