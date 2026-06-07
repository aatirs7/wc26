# WC26 Bracket Pool

Mobile-first World Cup 2026 bracket pool. Friends pick group winners, the
8 best third-placed qualifiers, and the knockout run from the Round of 16
to the champion. Brackets lock at kickoff (June 11, 2026, 19:00 UTC) and
score automatically as real results sync in.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, name-picker auth (family
scale, no passwords), Neon Postgres via Drizzle ORM, football-data.org for
live results, Vercel hosting + cron.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` from Neon
   - `FOOTBALL_DATA_TOKEN` free personal token from football-data.org
   - `CRON_SECRET` any long random string
   - `TOURNAMENT_KICKOFF_UTC=2026-06-11T19:00:00Z`
2. `npm install`
3. `npm run db:migrate` to create the schema in Neon
4. `npm run seed` to load all 48 teams and 104 fixtures from
   openfootball. The seed also creates the default pool and prints its id:
   put that into `NEXT_PUBLIC_DEFAULT_POOL_ID`. New sign-ins auto-join it.
5. `npm run dev`

## Scoring

Advance-to-round model, weights in `src/lib/constants.ts`:

| Pick | Points |
| --- | --- |
| Group top-2 team | 3 each |
| Best third-place qualifier | 2 each |
| Team reaches Round of 16 | 5 each |
| Team reaches quarter-final | 8 each |
| Team reaches semi-final | 12 each |
| Team reaches the Final | 18 each |
| Champion | 30 |

Groups pay out when all 6 group matches finish; third-place picks pay out
once every group is decided. Ties break by champion+final points, then
earliest submit time.

## Auth

No accounts or passwords: the landing page lists everyone in the family;
tap your name (or type a new one) and a year-long cookie remembers you.
Anyone can pick anyone's name, which is accepted at this scale. Switch
players from the Me tab.

## Sync

Live results come from football-data.org (free tier: 10 requests/min, no
daily cap; scores can lag real time slightly). `/api/cron` runs every 2
minutes and self-gates: matches sync each tick only while a match is live
or imminent, standings refresh at most every 30 minutes or right after a
match finishes, and everything drops to a 30-minute floor between
sessions. Note: Vercel Hobby crons run at most daily; on Hobby, point a
free external pinger (e.g. cron-job.org) at
`GET /api/cron` with header `Authorization: Bearer <CRON_SECRET>`.

Manual sync: `POST /api/sync` with the same header. Add `?dry=1` to fetch
and inspect the provider payload without writing, useful for verifying
the league/season mapping on first contact with live data.

## Commands

- `npm run dev` / `npm run build`
- `npm test` runs vitest (time parsing, prediction validation, scoring)
- `npm run db:generate` / `npm run db:migrate` for schema changes
- `npm run seed` idempotent fixture/team seed

## House rules

- Results provider calls never run client-side; the app only reads Neon.
- The provider is swappable behind `src/lib/scores-provider.ts`; switching
  back to API-Football or another source is a config flip, not a refactor.
- Brackets are viewable read-only by fellow pool members at any time,
  including before lock. Owners can edit until kickoff.
- No em dashes in code, copy, or comments.
