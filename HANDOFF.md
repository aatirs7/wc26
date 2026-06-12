# WC26 Bracket Pool — Handoff & Fork Guide

A World Cup 2026 bracket-pool web app. Players rank every group, pick the
knockout rounds and a champion, and get scored automatically from live
results pulled off football-data.org. This doc explains how the thing works
and exactly what to change to ship a **generalized** version: anyone types a
name and starts (no preloaded roster), generic pool-wide stats (no
"Adults vs Kids" / family households), and no Siddiqui branding.

The backend, scoring, scores provider, and Vercel/cron setup carry over
unchanged. The work is mostly deletion plus one small UI swap.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.7 (App Router), React 19, TypeScript 5 |
| DB | Neon Postgres (serverless) via Drizzle ORM, `@neondatabase/serverless` HTTP client |
| Styling | Tailwind CSS 4, CSS variables in `src/app/globals.css` |
| Fonts | Bebas Neue (display), Hanken Grotesk (body) |
| Validation | Zod 4 |
| Icons | lucide-react |
| Tests | Vitest (time parsing, predictions, scoring) |
| Hosting | Vercel, with a cron entry in `vercel.json` hitting `/api/cron` every 2 min |
| Scores | football-data.org v4 (`WC` competition), free personal token, 10 req/min |

`tsconfig` uses the `@/*` alias for `src/*`. Drizzle config is in
`drizzle.config.ts`; schema lives in `src/lib/schema.ts`; migrations in
`drizzle/`.

---

## 2. How it works end to end

1. **Seed** the tournament data once: `scripts/seed.ts` pulls the
   openfootball 2026 fixture spec, loads 48 teams, 104 matches, zeroed group
   standings, and creates a default pool. Prints the pool id.
2. A player **signs in by name** (cookie auth, no passwords). The server
   finds-or-creates the user and joins them to the default pool.
3. The player **builds a bracket**: rank all 12 groups (1st–4th), pick the
   8 best third-place qualifiers, then the knockout tree R16 → QF → SF →
   Final → Champion. Predictions are stored as JSONB, validated server-side
   on every write.
4. Owner can edit until `TOURNAMENT_KICKOFF_UTC`; **Submit** locks it in to
   count on the leaderboard. Brackets are read-only viewable by pool members
   at any time.
5. **Vercel cron** hits `/api/cron` every 2 min. The sync job pulls fixtures
   + standings from football-data.org, updates matches, derives who advanced
   (top 2 per group + best 8 thirds), then re-scores every bracket from
   scratch (idempotent).
6. **Leaderboard / Stats / Matches** pages read straight from Neon.

---

## 3. Directory map (the files that matter)

### Pages — `src/app/`
| File | Purpose |
|---|---|
| `page.tsx` | Landing: title, tagline, sign-in, lock countdown. **Branding + NamePicker here.** |
| `bracket/page.tsx` | Bracket builder / locked view; pool switcher |
| `bracket/[id]/page.tsx` | Read-only bracket view for pool members |
| `leaderboard/page.tsx` | Rankings; ties break by champion+final pts, then submit time |
| `stats/page.tsx` | **"Adults vs Kids" + family stats. This page gets rewritten.** |
| `scoring/page.tsx` | Scoring rules explainer |
| `matches/page.tsx` | Live group standings + schedule |
| `me/page.tsx` | Switch player, bracket controls, install guide |
| `layout.tsx` | Root layout, theme toggle, fonts, metadata |
| `icon.tsx` / `apple-icon.tsx` | Generated favicon/app icon |

### API — `src/app/api/`
| Route | Purpose |
|---|---|
| `auth/route.ts` | POST sign in by name, DELETE sign out. Cookies `wc26_uid`, `wc26_lastname` |
| `bracket/route.ts` | POST create/submit, PATCH edit predictions/name, DELETE reset |
| `pool/route.ts` | POST create or join a pool by 6-char code |
| `cron/route.ts` | GET, Vercel cron. Rate-gated sync, guarded by `CRON_SECRET` |
| `sync/route.ts` | POST manual/forced sync, `?dry=1` to inspect, guarded by `CRON_SECRET` |

### Core logic — `src/lib/`
| File | Purpose |
|---|---|
| `auth.ts` | `currentUserId`, `signInByName` (find-or-create), `listPlayers` |
| `schema.ts` | Drizzle tables (see §4) |
| `db.ts` | Lazy-init Neon HTTP client |
| `predictions.ts` | Zod validation + `pruneDownstream` + `isComplete` |
| `scoring.ts` | `buildFacts`, `scoreBracket`, `attainablePoints`, `rescoreAll` (idempotent) |
| `constants.ts` | `SCORING` weights, group letters, round keys |
| `scores-provider.ts` | football-data.org adapter behind a provider interface |
| `sync.ts` | `runSync`: fetch → map → update → derive advancement → rescore |
| `standings.ts` | `deriveAdvancement`: top 2 per group + best 8 thirds |
| `team-map.ts` | 48 teams, codes, flag emojis, provider name aliases |
| `lock.ts` | `kickoffUtc`, `isLocked` from env |
| `access.ts` | `isPoolMember`, `bracketAccess` |
| `cohorts.ts` | **Family-only: ADULT_NAMES + FAMILIES. Delete this.** |
| `format-time.ts` | Eastern-time display helpers. **Set your timezone here.** |
| `time.ts` | Parse openfootball date+time → UTC |
| `knockout-bracket.ts` | Knockout structure inference |
| `bracket-reducer.ts` | Client-side bracket edit state |
| `fifa-rank.ts` | Pre-tournament team rankings for display |
| `types/bracket.ts`, `types/team.ts` | `Predictions`, `GroupPick`, `KnockoutPicks`, `emptyPredictions` |

### Components — `src/components/`
Grouped by feature: `auth/` (**NamePicker**, SwitchPlayer), `bracket/`
(BracketBuilder, GroupPicker, ThirdPlacePicker, FullBracket, save/submit
bars, progress), `brackets/` (read-only summary), `matches/` (rows, status
pill, standings table, LivePoller), `stats/` (MemberList), `pools/`
(PoolActions), `nav/` (BottomTabBar), `me/`, `theme/`.

### Scripts — `scripts/`
| File | Purpose |
|---|---|
| `seed.ts` | Teams, matches, standings, default pool. **Keep.** |
| `seed-users.ts` | Preloads the 28-name family roster. **Delete / don't run.** |

---

## 4. Database schema (`src/lib/schema.ts`)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id` uuid pk, `displayName` unique, `createdAt` | No passwords |
| `pools` | `id`, `name`, `ownerId`, `joinCode` unique | Default pool auto-joined |
| `poolMembers` | pk(`poolId`,`userId`) | Membership |
| `teams` | `code` pk, `name`, `groupLetter`, `flag` | 48 teams |
| `matches` | `id` pk, `stage`, `groupLetter`, home/away codes + placeholders, scores, `status`, `winnerCode`, `kickoffUtc`, `providerFixtureId` | 104 fixtures |
| `groupStandings` | pk(`groupLetter`,`teamCode`), `points`, `gd`, `gf`, `rank`, `advanced`, `isBestThird` | Updated by sync |
| `brackets` | `id`, `ownerId`, `poolId`, `name`, `predictions` jsonb, `totalPoints`, `lockedAt`, `submitted` | unique(`ownerId`,`poolId`) — one bracket per user per pool |
| `bracketScores` | pk(`bracketId`,`roundKey`), `points` | Per-round breakdown |
| `syncMeta` | `key` pk, `value`, `updatedAt` | `lastFullSync`, `lastStandingsSync` |

Schema does **not** need to change for the generalized version.

---

## 5. Scoring (`src/lib/constants.ts` + `scoring.ts`)

```ts
export const SCORING = {
  groupTop2: 3,   // each correct top-2 group finisher
  thirdPlace: 2,  // each correct best-third qualifier (paid once all groups decided)
  reachR16: 5, reachQF: 8, reachSF: 12, reachFinal: 18, champion: 30,
};
```

`rescoreAll()` wipes `bracketScores` and recomputes from match results +
standings every sync, so it is safe to run repeatedly. `attainablePoints()`
is the max a perfect bracket could hold *so far* — the denominator for the
accuracy %. Tune weights freely; everything downstream recomputes.

---

## 6. Predictions & validation (`src/lib/predictions.ts`)

`Predictions` JSONB: `groups` (A–L, each 1st–4th), `thirdPlace` (up to 8
codes), `knockout` (`r16`/`qf`/`sf`/`final` arrays + `champion`). Validated
with Zod on every write: distinct teams per group, knockout picks must come
from the prior round's pool, champion must be in the final. `pruneDownstream`
removes now-invalid downstream picks when an upstream pick changes (never
re-picks — leaves gaps for the UI to surface). `isComplete` gates Submit.

---

## 7. Scores provider & sync

`src/lib/scores-provider.ts` is an adapter behind a small interface
(`fetchFixtures`, `fetchStandings`). `footballDataProvider` calls
`https://api.football-data.org/v4/competitions/WC/...` with header
`X-Auth-Token: <FOOTBALL_DATA_TOKEN>`, normalizes stage/status/winner to the
local vocabulary. Swapping providers = implement the same interface; nothing
else changes.

`runSync` (`sync.ts`): fetch fixtures → map to local rows (by provider id,
else team codes, else stage+kickoff proximity) → update → gate standings
fetch (only when live/imminent or 30+ min stale, to respect 10 req/min) →
`deriveAdvancement` → `rescoreAll`. `/api/cron` skips work when nothing is
live and the last sync is recent; `/api/sync?dry=1` inspects without writing.

> **Vercel Hobby note:** Hobby-plan crons run at most daily. For live
> 2-minute updates during the tournament, either be on a paid plan or point
> an external pinger (cron-job.org etc.) at `GET /api/cron` with the
> `Authorization: Bearer <CRON_SECRET>` header.

---

## 8. Environment variables

Copy `.env.example` → `.env.local`:

| Var | What |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `FOOTBALL_DATA_TOKEN` | football-data.org personal token (free) |
| `CRON_SECRET` | random hex; bearer for `/api/cron` and `/api/sync` |
| `TOURNAMENT_KICKOFF_UTC` | first-match ISO time, e.g. `2026-06-11T19:00:00Z` (lock deadline) |
| `NEXT_PUBLIC_DEFAULT_POOL_ID` | uuid printed by `npm run seed`; auto-join pool |

First-run order: `db:migrate` → `seed` (copy the printed pool id into
`NEXT_PUBLIC_DEFAULT_POOL_ID`) → start. **Do not run `seed-users`** in the
generalized version.

---

## 9. What to change for the generalized version

Four edits. The hard parts (auth, scoring, sync) already support this — note
that `signInByName` is **already find-or-create**, so the backend needs no
change for free name entry.

### A. Free name entry (no preloaded roster)

The only real change. Today the landing page lists seeded players and renders
`NamePicker` (a button per name). Swap that for a text input.

1. **`src/app/page.tsx`**
   - Drop the `listPlayers()` call and the `players` prop (line ~15).
   - Render a name-entry form instead of `<NamePicker players=.../>`. Keep
     reading `wc26_lastname` to prefill the input ("Welcome back, X").
2. **`src/components/auth/NamePicker.tsx`** → replace with a controlled
   `<input>` + submit button that POSTs `{ name }` to `/api/auth` (the
   existing endpoint already creates the user). Remove the empty-roster
   "Ask Aatir" message entirely.
3. **`scripts/seed-users.ts`** → delete. Don't seed any users; they're born
   on first sign-in.
4. Optional: add light validation on the input (trim, max length, maybe
   block duplicate display names case-insensitively with a friendly "that
   name's taken" — note `displayName` is unique in the schema, and
   `signInByName` will sign you in *as* an existing name, which for a
   strangers' pool you may want to warn about rather than silently merge).

> Consideration: with open name entry and no passwords, anyone can act as any
> name (same trade-off the family version accepts). For a dad-and-friends
> pool that's usually fine. If you want to prevent impersonation, that's the
> one place you'd add a lightweight secret (e.g. a per-pool join code is
> already supported via `pool/route.ts`, or add a simple PIN per user).

### B. Generic stats (drop Adults vs Kids + Families)

1. **`src/lib/cohorts.ts`** → delete.
2. **`src/app/stats/page.tsx`** → rewrite to pool-wide, name-agnostic stats.
   Everything it needs is already computed in that file (`rows`, `attainable`,
   `accuracyOf`, `buildFacts`). Drop the cohort/family logic and the
   `cohortOf`/`familyOf`/`FAMILIES` imports. Suggested generic cards:
   - **Top of the table** — top N by points (the existing `topOverall`,
     minus the adults/kids tag).
   - **Pool averages** — avg points, avg accuracy, how many have locked in.
   - **Most popular champion pick** — group `brackets.predictions.knockout
     .champion` and count. Fun and totally generic.
   - **Biggest mover / best round** — optional, from `bracketScores`.
3. **`src/components/stats/MemberList.tsx`** stays usable as-is.

### C. Debrand (remove "Siddiqui")

Search-and-replace these exact spots:
| File | Line(s) | Now |
|---|---|---|
| `src/app/page.tsx` | ~35 | "The Siddiqui Family League" |
| `src/app/page.tsx` | ~39 | "May the best Siddiqui win." |
| `src/app/page.tsx` | ~73 | "Made by Aatir Siddiqui for the Siddiqui family · 2026" |
| `src/components/auth/NamePicker.tsx` | ~37 | "Ask Aatir to add you to the league" (goes away with the input swap) |
| `src/lib/format-time.ts` | top comment | "The family is US-based..." |
| `src/lib/cohorts.ts` | comment | family stats (file deleted) |

Also update `<title>`/metadata in `src/app/layout.tsx`, and the title block
in `page.tsx` if you want a different pool name. Pick a neutral name like
"World Cup 2026 Bracket Pool" or let it be the pool name from the DB.

### D. Timezone (one line)

`src/lib/format-time.ts` is hardcoded to `America/New_York`. Change the TZ
constant + label to wherever your dad and his friends are. The sync/scoring
logic is all UTC; this is display only.

---

## 10. First deploy checklist (generalized)

1. Fork the repo; do the four edits in §9.
2. Neon: create a DB, grab `DATABASE_URL`.
3. football-data.org: register, get `FOOTBALL_DATA_TOKEN`.
4. Generate a `CRON_SECRET` (any random hex).
5. Set `TOURNAMENT_KICKOFF_UTC` to the real first-match time.
6. `npm i` → `npm run db:migrate` → `npm run seed` → copy the printed pool id
   into `NEXT_PUBLIC_DEFAULT_POOL_ID`. **Skip `seed-users`.**
7. `npm run dev`, sign in by typing a name, build a bracket, sanity-check
   leaderboard/stats/matches.
8. Push to Vercel; add all five env vars in the project settings. Confirm the
   `vercel.json` cron (or external pinger) is hitting `/api/cron`.
9. Test the live path: `POST /api/sync?dry=1` with the bearer secret to
   confirm the provider token works before the tournament.

---

## 11. Project rules to preserve (from AGENTS.md)

- **No em dashes** anywhere in code, copy, or comments.
- Scores provider is **server-side only** (cron/sync); the app reads Neon.
- Auth is intentionally a **password-free name cookie** at family scale — do
  not reintroduce an auth provider unless asked.
- Scoring weights in `constants.ts`; the engine **recomputes from scratch and
  must stay idempotent**.
- Brackets: read-only viewable by pool members at any time; editable by owner
  until `TOURNAMENT_KICKOFF_UTC`; Submit required to count.
- Predictions JSONB validated server-side on every write; knockout picker
  starts at R16 (32 qualifiers from group + third-place picks).
- This is a newer Next.js with breaking changes — check
  `node_modules/next/dist/docs/` before writing framework code.
</content>
</invoke>
