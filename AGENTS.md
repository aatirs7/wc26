<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules (WC26 Bracket Pool)

- No em dashes anywhere in code, copy, or comments.
- The scores provider (football-data.org, swappable behind
  src/lib/scores-provider.ts) is server-side only (cron/sync); the app
  reads Neon.
- Auth is a name-picker cookie (src/lib/auth.ts), intentionally
  password-free for family scale. Do not reintroduce an auth provider
  without being asked.
- Scoring weights live in src/lib/constants.ts; the engine in
  src/lib/scoring.ts recomputes from scratch and must stay idempotent.
- Brackets: viewable read-only by pool members at ANY time (owner
  decision overriding the original spec); editable by owner until
  TOURNAMENT_KICKOFF_UTC; submit required to count on the leaderboard.
- Predictions jsonb is validated server-side via src/lib/predictions.ts
  on every write; the knockout picker starts at R16 (32 qualifiers come
  from group + third-place picks).
