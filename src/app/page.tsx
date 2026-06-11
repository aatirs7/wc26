import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Trophy, Lock, Timer } from 'lucide-react';
import { currentUserId, listPlayers, LAST_NAME_COOKIE } from '@/lib/auth';
import { isLocked, kickoffUtc } from '@/lib/lock';
import { DISPLAY_TZ_LABEL, matchDayLabel, matchTime } from '@/lib/format-time';
import NamePicker from '@/components/auth/NamePicker';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const userId = await currentUserId();
  // Signed-in players land on their dashboard; the hero is for guests.
  if (userId) redirect('/home');
  const locked = isLocked();
  const kickoff = kickoffUtc();
  const players = userId ? [] : await listPlayers();
  const lastName = userId ? null : (await cookies()).get(LAST_NAME_COOKIE)?.value ?? null;

  return (
    <div className="flex min-h-[88vh] flex-col items-center justify-center gap-8 py-12 text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:text-left">
      <div className="reveal space-y-4 lg:space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/30 lg:mx-0 lg:h-24 lg:w-24">
          <Trophy className="h-10 w-10 text-accent lg:h-12 lg:w-12" strokeWidth={2} />
        </div>
        <div>
          <p className="font-display text-lg tracking-[0.45em] text-accent">FIFA</p>
          <h1 className="font-display text-7xl leading-[0.82] tracking-tight lg:text-8xl">
            World Cup
            <span className="block shine text-8xl lg:text-9xl">2026</span>
          </h1>
          <p className="mt-1 font-display text-2xl tracking-[0.3em] text-muted">Bracket Pool</p>
        </div>

        <div className="mx-auto max-w-xs space-y-1 lg:mx-0 lg:max-w-md">
          <p className="font-display text-2xl tracking-wide text-foreground lg:text-3xl">
            The Siddiqui Family League
          </p>
          <p className="text-sm leading-relaxed text-muted lg:text-base">
            Rank every group, call the knockouts, and see who has the best ball knowledge...
            May the best Siddiqui win.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-8 lg:items-stretch lg:gap-5">
        <div
          className={`reveal inline-flex items-center gap-2 self-center rounded-full border px-4 py-2 text-sm font-semibold lg:self-start ${
            locked ? 'border-live/30 bg-live/10 text-live' : 'border-gold/30 bg-gold/10 text-gold'
          }`}
          style={{ animationDelay: '80ms' }}
        >
          {locked ? <Lock className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
          {locked
            ? 'Brackets locked — the tournament is on'
            : `Locks ${matchDayLabel(kickoff)}, ${matchTime(kickoff)} ${DISPLAY_TZ_LABEL}`}
        </div>

        <div
          className="reveal w-full max-w-xs lg:max-w-sm lg:rounded-3xl lg:border lg:border-edge lg:bg-white/[0.03] lg:p-8 lg:shadow-xl lg:shadow-black/20"
          style={{ animationDelay: '160ms' }}
        >
          {!userId ? (
            <NamePicker players={players} lastName={lastName} />
          ) : (
            <Link
              href="/bracket"
              className="flex min-h-13 w-full items-center justify-center rounded-2xl bg-accent text-lg font-bold text-[var(--accent-ink)] shadow-lg shadow-accent/20 active:scale-95"
            >
              {locked ? 'View your bracket' : 'Build your bracket'}
            </Link>
          )}
        </div>

        <p className="reveal text-xs text-muted-2" style={{ animationDelay: '240ms' }}>
          Made by Aatir Siddiqui for the Siddiqui family ·{' '}
          <span className="text-muted">2026</span>
        </p>
      </div>
    </div>
  );
}
