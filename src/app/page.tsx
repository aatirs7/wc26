import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { ensureUser } from '@/lib/clerk-user';
import { isLocked, kickoffUtc } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const userId = await ensureUser();
  const locked = isLocked();
  const kickoff = kickoffUtc();

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center gap-8 py-12 text-center">
      <div className="space-y-3">
        <div className="text-6xl">🏆</div>
        <h1 className="text-3xl font-bold tracking-tight">WC26 Bracket Pool</h1>
        <p className="text-muted">
          Pick your group winners, call the knockout rounds, and battle your
          friends all the way to MetLife on July 19.
        </p>
      </div>

      {!locked ? (
        <p className="rounded-full bg-surface-raised px-4 py-2 text-sm text-gold">
          Brackets lock at kickoff: {kickoff.toUTCString()}
        </p>
      ) : (
        <p className="rounded-full bg-surface-raised px-4 py-2 text-sm text-danger">
          Brackets are locked. The tournament is on.
        </p>
      )}

      {!userId ? (
        <SignInButton mode="modal">
          <button className="min-h-12 w-full max-w-xs rounded-xl bg-accent px-6 text-lg font-semibold text-black">
            Sign in to play
          </button>
        </SignInButton>
      ) : (
        <Link
          href="/bracket"
          className="flex min-h-12 w-full max-w-xs items-center justify-center rounded-xl bg-accent px-6 text-lg font-semibold text-black"
        >
          {locked ? 'View your bracket' : 'Build your bracket'}
        </Link>
      )}
    </div>
  );
}
