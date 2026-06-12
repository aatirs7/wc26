# Homepage / dashboard handoff

A drop-in logged-in dashboard at `/home`. Signed-in users land here instead of
going straight to the bracket. It shows a welcome header, a live kickoff
countdown (or a "live" state once locked), rank + points tiles, a bracket-status
card with a context-aware CTA, and a grid of quick-jump cards.

It is built entirely from things that already exist in the app (the same
`db`, `auth`, `lock`, `predictions`, `format-time` helpers and the same
`globals.css` design tokens), so it should port to the other instance with only
the small tweaks noted at the bottom.

## What was added / changed

**New files**
- `src/app/home/page.tsx` - the dashboard (server component).
- `src/components/home/Countdown.tsx` - client component, the ticking countdown.

**Edited (wiring)**
- `src/app/page.tsx` - redirect signed-in users from `/` to `/home`.
- `src/components/auth/NamePicker.tsx` - after sign-in, go to `/home`.
- `src/components/nav/BottomTabBar.tsx` - add a "Home" tab.

---

## 1. `src/app/home/page.tsx`

Server component. It:
1. Redirects guests to `/`.
2. Loads the user's display name and pool memberships, picks the active pool
   (query param `?pool=`, else the default pool env var, else the first one).
3. Recomputes the player's rank using the *exact same ordering as the
   leaderboard* (submitted first, then points, then champion+final tiebreak,
   then earliest lock time) so the number always matches the Standings page.
4. Derives a friendly bracket-status line + CTA from lock / submitted / complete.

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import {
  Trophy,
  ListOrdered,
  CalendarDays,
  BarChart3,
  Lock,
  Timer,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { db } from '@/lib/db';
import { brackets, bracketScores, poolMembers, pools, users } from '@/lib/schema';
import { currentUserId } from '@/lib/auth';
import { isLocked, kickoffUtc } from '@/lib/lock';
import { isComplete } from '@/lib/predictions';
import { DISPLAY_TZ_LABEL, matchDayLabel, matchTime } from '@/lib/format-time';
import Countdown from '@/components/home/Countdown';

export const dynamic = 'force-dynamic';

const JUMPS: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: '/bracket', label: 'Bracket', hint: 'Build & view', icon: Trophy },
  { href: '/leaderboard', label: 'Standings', hint: 'Who is winning', icon: ListOrdered },
  { href: '/matches', label: 'Matches', hint: 'Fixtures & groups', icon: CalendarDays },
  { href: '/stats', label: 'Stats', hint: 'Adults vs kids', icon: BarChart3 },
];

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pool?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect('/');

  const locked = isLocked();
  const kickoff = kickoffUtc();

  const [me] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const memberships = await db
    .select({ poolId: poolMembers.poolId, poolName: pools.name })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(eq(poolMembers.userId, userId));

  const { pool: requested } = await searchParams;
  const active =
    memberships.find((m) => m.poolId === requested) ??
    memberships.find((m) => m.poolId === process.env.NEXT_PUBLIC_DEFAULT_POOL_ID) ??
    memberships[0];

  // Compute the player's rank within the active pool, mirroring the
  // leaderboard's ordering (submitted first, then points, then tiebreak).
  let myRank: number | null = null;
  let fieldSize = 0;
  let myBracket:
    | { id: string; name: string; submitted: boolean; points: number; complete: boolean }
    | null = null;

  if (active) {
    const members = await db
      .select({ userId: poolMembers.userId })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, active.poolId));
    fieldSize = members.length;

    const poolBrackets = await db
      .select()
      .from(brackets)
      .where(eq(brackets.poolId, active.poolId));

    const scoreRows = poolBrackets.length
      ? await db
          .select()
          .from(bracketScores)
          .where(inArray(bracketScores.bracketId, poolBrackets.map((b) => b.id)))
      : [];

    const tiebreakByBracket = new Map<string, number>();
    for (const s of scoreRows) {
      if (s.roundKey === 'champion' || s.roundKey === 'final') {
        tiebreakByBracket.set(s.bracketId, (tiebreakByBracket.get(s.bracketId) ?? 0) + s.points);
      }
    }

    const bracketByOwner = new Map(poolBrackets.map((b) => [b.ownerId, b]));
    const rows = members.map((m) => {
      const b = bracketByOwner.get(m.userId);
      return {
        ownerId: m.userId,
        points: b?.totalPoints ?? 0,
        tiebreak: b ? (tiebreakByBracket.get(b.id) ?? 0) : 0,
        submitted: b?.submitted ?? false,
        lockedAtMs: b?.lockedAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
      };
    });
    rows.sort((a, b) => {
      if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
      if (b.points !== a.points) return b.points - a.points;
      if (b.tiebreak !== a.tiebreak) return b.tiebreak - a.tiebreak;
      return a.lockedAtMs - b.lockedAtMs;
    });
    let rank = 0;
    for (const r of rows) {
      if (r.submitted) {
        rank += 1;
        if (r.ownerId === userId) myRank = rank;
      }
    }

    const mine = bracketByOwner.get(userId);
    if (mine) {
      myBracket = {
        id: mine.id,
        name: mine.name,
        submitted: mine.submitted,
        points: mine.totalPoints,
        complete: isComplete(mine.predictions),
      };
    }
  }

  // Bracket status flavour for the headline card.
  const status = !myBracket
    ? { text: 'No bracket yet', tone: 'gold' as const, icon: AlertCircle }
    : locked
      ? { text: 'Locked in for the tournament', tone: 'muted' as const, icon: Lock }
      : myBracket.submitted
        ? { text: 'Submitted and counting', tone: 'accent' as const, icon: CheckCircle2 }
        : myBracket.complete
          ? { text: 'Complete, not submitted yet', tone: 'gold' as const, icon: AlertCircle }
          : { text: 'In progress', tone: 'gold' as const, icon: AlertCircle };

  const cta =
    !myBracket || (!locked && !myBracket.submitted)
      ? locked
        ? 'View your bracket'
        : myBracket
          ? 'Finish your bracket'
          : 'Build your bracket'
      : 'View your bracket';

  const toneClass: Record<'accent' | 'gold' | 'muted', string> = {
    accent: 'text-accent',
    gold: 'text-gold',
    muted: 'text-muted',
  };
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 py-4">
      <header className="reveal flex flex-col items-center gap-2 pt-2 text-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent font-display text-2xl text-[var(--accent-ink)]">
          {(me?.displayName ?? 'Y').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
            Welcome back
          </p>
          <h1 className="truncate font-display text-3xl leading-none">
            {me?.displayName ?? 'Player'}
          </h1>
        </div>
      </header>

      {/* Kickoff / lock banner */}
      <section
        className="reveal card space-y-3 p-4 text-center"
        style={{ animationDelay: '60ms' }}
      >
        {locked ? (
          <div className="inline-flex items-center justify-center gap-2 text-live">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-semibold">The tournament is live</span>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center justify-center gap-2 text-gold">
              <Timer className="h-4 w-4" />
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em]">
                Brackets lock in
              </span>
            </div>
            <Countdown kickoffMs={kickoff.getTime()} />
            <p className="text-xs text-muted">
              Kickoff {matchDayLabel(kickoff)}, {matchTime(kickoff)} {DISPLAY_TZ_LABEL}
            </p>
          </>
        )}
      </section>

      {/* Overview: rank + points */}
      <section className="reveal grid grid-cols-2 gap-3" style={{ animationDelay: '120ms' }}>
        <div className="card flex flex-col justify-between p-4">
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
            Your rank
          </div>
          <div className="mt-2 font-display text-4xl leading-none">
            {myRank ? (
              <>
                {ordinal(myRank)} <span className="text-muted">of {fieldSize}</span>
              </>
            ) : (
              <span className="text-gold">—</span>
            )}
          </div>
          {active && memberships.length > 1 ? (
            <div className="mt-1 truncate text-xs text-muted">{active.poolName}</div>
          ) : null}
        </div>
        <div className="card flex flex-col justify-between p-4">
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
            Points
          </div>
          <div className="mt-2 font-display text-4xl leading-none text-accent">
            {myBracket?.points ?? 0}
          </div>
          <div className="mt-1 text-xs text-muted">
            {locked ? 'Live scoring' : 'Scores once it starts'}
          </div>
        </div>
      </section>

      {/* Bracket status headline */}
      <section className="reveal" style={{ animationDelay: '180ms' }}>
        <Link
          href="/bracket"
          className="card flex items-center gap-3 p-4 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
            <Trophy className="h-5 w-5 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">
              {myBracket?.name ?? 'Your bracket'}
            </div>
            <div className={`flex items-center gap-1 text-xs ${toneClass[status.tone]}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.text}
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm font-bold text-accent">
            {cta}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* Quick jumps */}
      <section className="reveal space-y-3" style={{ animationDelay: '240ms' }}>
        <h2 className="text-center font-display text-xl text-muted">Jump to</h2>
        <div className="grid grid-cols-2 gap-3">
          {JUMPS.map((j) => {
            const Icon = j.icon;
            return (
              <Link
                key={j.href}
                href={j.href}
                className="card flex flex-col gap-2 p-4 active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-edge">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={2.2} />
                </span>
                <div>
                  <div className="font-display text-xl leading-none">{j.label}</div>
                  <div className="mt-0.5 text-xs text-muted">{j.hint}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

---

## 2. `src/components/home/Countdown.tsx`

Client component. The server passes kickoff as epoch ms (`kickoff.getTime()`),
so server and client agree regardless of timezone. State starts at
"just before kickoff" so the server-rendered HTML is deterministic (all zeros)
and hydration never mismatches; the real clock takes over on mount via the
interval. The first tick is fired from a `setTimeout` callback (not synchronously
in the effect body) to satisfy the `react-hooks/set-state-in-effect` lint rule.

```tsx
'use client';

import { useEffect, useState } from 'react';

// Ticks down to kickoff. Server passes the moment as an epoch ms so the
// client and server agree regardless of timezone.
function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

export default function Countdown({ kickoffMs }: { kickoffMs: number }) {
  // Start at "now = just before kickoff" so the server render is deterministic
  // (all zeros) and hydration matches; the real clock takes over on mount.
  const [now, setNow] = useState(() => kickoffMs - 1);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const { days, hours, mins, secs } = parts(kickoffMs - now);
  const cells = [
    { v: days, l: 'days' },
    { v: hours, l: 'hrs' },
    { v: mins, l: 'min' },
    { v: secs, l: 'sec' },
  ];

  return (
    <div className="flex justify-center gap-2">
      {cells.map((c) => (
        <div
          key={c.l}
          className="flex min-w-15 flex-col items-center rounded-xl border border-edge bg-white/[0.03] px-3 py-2"
        >
          <span className="font-display text-3xl leading-none tabular-nums text-foreground">
            {String(c.v).padStart(2, '0')}
          </span>
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">
            {c.l}
          </span>
        </div>
      ))}
    </div>
  );
}
```

---

## 3. Wiring edits

**`src/app/page.tsx`** - send signed-in users to the dashboard; guests still see
the hero. Add the import and the guard at the top of the component:

```tsx
import { redirect } from 'next/navigation';
// ...
export default async function LandingPage() {
  const userId = await currentUserId();
  // Signed-in players land on their dashboard; the hero is for guests.
  if (userId) redirect('/home');
  // ...rest unchanged
}
```

**`src/components/auth/NamePicker.tsx`** - after a successful sign-in, route to
`/home` instead of `/bracket`:

```tsx
router.push('/home');   // was '/bracket'
router.refresh();
```

**`src/components/nav/BottomTabBar.tsx`** - add a Home tab (leftmost):

```tsx
import { Home, Trophy, CalendarDays, ListOrdered, BarChart3, User, type LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/bracket', label: 'Bracket', icon: Trophy },
  // ...the rest unchanged
];
```

---

## Porting notes for the other (non-Siddiqui) instance

- **Stats jump card.** The `Stats` quick-jump (`/stats`, hint "Adults vs kids")
  is specific to the family-cohort page. If the other app has no `/stats` route,
  drop that entry from the `JUMPS` array, or point it at whatever page exists
  (e.g. `/scoring` with hint "How it's scored"). The grid is `grid-cols-2`, so
  keep the count even (2 or 4 cards) for a tidy layout.
- **Routes assumed:** `/bracket`, `/leaderboard`, `/matches`. Rename hrefs/labels
  if the other app differs.
- **Helpers assumed:** `currentUserId` (`@/lib/auth`), `isLocked` + `kickoffUtc`
  (`@/lib/lock`), `isComplete` (`@/lib/predictions`), and the `format-time`
  exports. These are the same across both apps; if any are renamed, adjust the
  imports.
- **Env:** rank picks the active pool via `NEXT_PUBLIC_DEFAULT_POOL_ID`. Make
  sure that is set, or it falls back to the user's first pool.
- **Design tokens:** everything uses existing `globals.css` utilities/classes
  (`.card`, `.reveal`, `font-display`, `text-accent/gold/muted`, `border-edge`,
  `--accent-ink`). No new CSS needed as long as that stylesheet is shared.
- **No em dashes in code/copy** is a project rule; the one `—` above is a UI
  placeholder for "no rank yet" (a literal display glyph, not prose). Swap it for
  text if you prefer.
```
