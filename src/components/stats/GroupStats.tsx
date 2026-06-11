import Link from 'next/link';
import MemberList, { type Member } from './MemberList';

export interface TeamCount {
  code: string;
  name: string;
  flag: string;
  count: number;
}

export interface ChampionPick extends TeamCount {
  mine: boolean;
}

export interface GroupWinner {
  letter: string;
  name: string;
  flag: string;
  pct: number;
}

export interface LoneWolf {
  owner: string;
  name: string;
  flag: string;
}

export interface RankRow {
  name: string;
  points: number;
  accuracy: number | null;
}

export interface RoundRow {
  label: string;
  pts: number;
}

export interface GroupStatsProps {
  poolEmpty: boolean;
  avgPoints: number;
  poolAccuracy: number | null;
  submitted: number;
  players: number;
  allMembers: Member[];
  myName: string | null;
  championPicks: ChampionPick[];
  maxChampion: number;
  finalistPicks: TeamCount[];
  maxFinalist: number;
  groupWinners: GroupWinner[];
  loneWolves: LoneWolf[];
  top: RankRow[];
  anyPoints: boolean;
  roundBreakdown: RoundRow[];
}

const sectionLabel = 'text-[0.7rem] font-bold uppercase tracking-[0.25em] text-muted-2';

export default function GroupStats(props: GroupStatsProps) {
  const {
    poolEmpty,
    avgPoints,
    poolAccuracy,
    submitted,
    players,
    allMembers,
    myName,
    championPicks,
    maxChampion,
    finalistPicks,
    maxFinalist,
    groupWinners,
    loneWolves,
    top,
    anyPoints,
    roundBreakdown,
  } = props;

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="font-display text-4xl leading-none">Group Stats</h1>
        <p className="mt-1 text-sm text-muted">
          What everyone is picking ·{' '}
          <Link href="/scoring" className="font-semibold text-accent underline">
            How it&apos;s scored
          </Link>
        </p>
      </header>

      {poolEmpty ? (
        <p className="card p-4 text-center text-sm text-muted">
          No brackets yet. Once people start picking, the group&apos;s favourites and standings show
          up here.
        </p>
      ) : null}

      <div className="card p-4">
        <div className={`text-center ${sectionLabel}`}>Group snapshot</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-display text-4xl leading-none">{avgPoints}</div>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">avg pts</div>
          </div>
          <div>
            <div className="font-display text-4xl leading-none">
              {poolAccuracy === null ? '—' : `${poolAccuracy}%`}
            </div>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">accuracy</div>
          </div>
          <div>
            <div className="font-display text-4xl leading-none">
              {submitted}/{players}
            </div>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">locked in</div>
          </div>
        </div>
        <div className="mt-3 border-t border-edge/50 pt-2">
          <MemberList members={allMembers} highlight={myName ?? undefined} />
        </div>
      </div>

      {championPicks.length > 0 || finalistPicks.length > 0 || groupWinners.length > 0 ? (
        <div className={`text-center ${sectionLabel}`}>What the group is picking</div>
      ) : null}

      {championPicks.length > 0 ? (
        <section>
          <h2 className="mb-2 text-center font-display text-2xl">Champion picks</h2>
          <ol className="space-y-2">
            {championPicks.map((c) => (
              <li key={c.code} className={`card p-3 ${c.mine ? 'border-accent' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{c.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-lg leading-tight">{c.name}</span>
                      {c.mine ? (
                        <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                          You
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${maxChampion ? (c.count / maxChampion) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl leading-none text-accent">{c.count}</div>
                    <div className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">
                      {c.count === 1 ? 'pick' : 'picks'}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {finalistPicks.length > 0 ? (
        <section>
          <h2 className="mb-2 text-center font-display text-2xl">Backed to reach the final</h2>
          <ul className="grid grid-cols-2 gap-2">
            {finalistPicks.map((f) => (
              <li key={f.code} className="card flex items-center gap-2 p-2.5">
                <span className="text-xl leading-none">{f.flag}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
                <span className="font-display text-lg leading-none text-accent">{f.count}</span>
              </li>
            ))}
          </ul>
          {maxFinalist > 0 ? (
            <p className="mt-2 text-center text-[0.7rem] text-muted-2">
              Times each team was picked to make the Final.
            </p>
          ) : null}
        </section>
      ) : null}

      {groupWinners.length > 0 ? (
        <section>
          <h2 className="mb-2 text-center font-display text-2xl">Consensus group winners</h2>
          <ul className="grid grid-cols-2 gap-2">
            {groupWinners.map((g) => (
              <li key={g.letter} className="card flex items-center gap-2 p-2.5">
                <span className="font-display text-base text-muted">{g.letter}</span>
                <span className="text-lg leading-none">{g.flag}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{g.name}</span>
                <span className="text-xs font-bold text-accent">{g.pct}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loneWolves.length > 0 ? (
        <section>
          <h2 className="mb-2 text-center font-display text-2xl">Lone wolves</h2>
          <p className="mb-2 text-center text-xs text-muted">Champions only one person is backing.</p>
          <ul className="space-y-2">
            {loneWolves.map((w, i) => (
              <li key={`${w.owner}-${i}`} className="card flex items-center gap-3 px-3 py-2.5">
                <span className="flex-1 truncate text-sm font-bold">{w.owner}</span>
                <span className="text-lg leading-none">{w.flag}</span>
                <span className="truncate text-sm text-muted">{w.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!poolEmpty ? <div className={`text-center ${sectionLabel}`}>Standings</div> : null}

      {!poolEmpty ? (
        <section>
          <h2 className="mb-2 text-center font-display text-2xl">Top of the table</h2>
          {anyPoints ? (
            <ol className="space-y-2">
              {top.map((r, i) => (
                <li
                  key={r.name}
                  className={`card flex items-center gap-3 px-3 py-2.5 ${
                    r.name === myName ? 'border-accent bg-accent/[0.06]' : ''
                  }`}
                >
                  <span className="w-5 text-center font-display text-lg text-muted">{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-bold">
                    {r.name}
                    {r.name === myName ? (
                      <span className="ml-1.5 text-[0.6rem] font-bold uppercase text-accent">You</span>
                    ) : null}
                  </span>
                  {r.accuracy !== null ? (
                    <span className="text-xs font-semibold text-muted">{r.accuracy}%</span>
                  ) : null}
                  <span className="font-display text-xl text-accent">{r.points}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="card p-4 text-sm text-muted">
              No points yet. Once the tournament kicks off, accuracy and points land here round by
              round.
            </p>
          )}
        </section>
      ) : null}

      {roundBreakdown.length > 0 ? (
        <section>
          <h2 className="mb-2 text-center font-display text-2xl">Points by round</h2>
          <ul className="space-y-2">
            {roundBreakdown.map((r) => (
              <li key={r.label} className="card flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold">{r.label}</span>
                <span className="font-display text-xl text-accent">{r.pts}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-center text-[0.7rem] text-muted-2">
            Total points the group has earned in each round.
          </p>
        </section>
      ) : null}
    </div>
  );
}
