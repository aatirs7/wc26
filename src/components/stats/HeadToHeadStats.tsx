import Link from 'next/link';
import MemberList, { type Member } from './MemberList';

export interface CohortView {
  key: string;
  accent: string;
  isMe: boolean;
  stats: {
    label: string;
    avgPoints: number;
    accuracy: number | null;
    players: number;
    submitted: number;
    totalPoints: number;
    leaderName: string | null;
    leaderPoints: number;
  };
  members: Member[];
}

export interface FamilyView {
  name: string;
  count: number;
  totalPoints: number;
  accuracy: number | null;
  isMe: boolean;
  members: Member[];
}

export interface TopRow {
  name: string;
  cohort: string;
  points: number;
  accuracy: number | null;
  isMe: boolean;
}

export default function HeadToHeadStats({
  banner,
  cohorts,
  families,
  top,
  anyPoints,
  myName,
}: {
  banner: string;
  cohorts: CohortView[];
  families: FamilyView[];
  top: TopRow[];
  anyPoints: boolean;
  myName: string | null;
}) {
  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="font-display text-4xl leading-none">Adults vs Kids</h1>
        <p className="mt-1 text-sm text-muted">Family bragging rights</p>
        <p className="mt-0.5 text-xs text-muted">
          <Link href="/scoring" className="font-semibold text-accent underline">
            How it&apos;s scored
          </Link>
        </p>
      </header>

      <div className="card p-4 text-center">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">Standing</div>
        <div className="shine mt-1 font-display text-3xl">{banner}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cohorts.map((c) => (
          <div key={c.key} className={`card space-y-3 p-4 ${c.isMe ? 'border-accent' : ''}`}>
            <h2
              className={`flex items-center justify-center gap-1.5 font-display text-2xl leading-none ${c.accent}`}
            >
              {c.stats.label}
              {c.isMe ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                  You
                </span>
              ) : null}
            </h2>
            <div className="flex items-end gap-4">
              <div>
                <div className="font-display text-4xl leading-none">{c.stats.avgPoints}</div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                  avg pts
                </div>
              </div>
              <div>
                <div className="font-display text-4xl leading-none">
                  {c.stats.accuracy === null ? '—' : `${c.stats.accuracy}%`}
                </div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                  accuracy
                </div>
              </div>
            </div>
            <dl className="space-y-1 text-xs text-muted">
              <div className="flex justify-between">
                <dt>Players</dt>
                <dd className="font-semibold text-foreground">{c.stats.players}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Locked in</dt>
                <dd className="font-semibold text-foreground">
                  {c.stats.submitted}/{c.stats.players}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Total pts</dt>
                <dd className="font-semibold text-foreground">{c.stats.totalPoints}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Leader</dt>
                <dd className="truncate pl-2 font-semibold text-foreground">
                  {c.stats.leaderName ? `${c.stats.leaderName} (${c.stats.leaderPoints})` : '—'}
                </dd>
              </div>
            </dl>
            <MemberList members={c.members} highlight={myName ?? undefined} />
          </div>
        ))}
      </div>

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
      <section>
        <h2 className="mb-2 text-center font-display text-2xl">Family vs Family</h2>
        <p className="mb-3 text-center text-xs text-muted">
          Ranked by accuracy, so household size doesn&apos;t matter.
        </p>
        <ol className="space-y-2">
          {families.map((f, i) => (
            <li key={f.name} className={`card p-3 ${f.isMe ? 'border-accent' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-display text-lg text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-display text-lg leading-tight">{f.name}</span>
                    {f.isMe ? (
                      <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                        You
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted">
                    {f.count} players · {f.totalPoints} pts
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl leading-none text-accent">
                    {f.accuracy === null ? '—' : `${f.accuracy}%`}
                  </div>
                  <div className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">
                    accuracy
                  </div>
                </div>
              </div>
              <div className="mt-2 border-t border-edge/50 pt-1">
                <MemberList members={f.members} highlight={myName ?? undefined} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 text-center font-display text-xl text-muted">Top of the family</h3>
        {anyPoints ? (
          <ol className="space-y-2">
            {top.map((r, i) => (
              <li
                key={r.name}
                className={`card flex items-center gap-3 px-3 py-2.5 ${
                  r.isMe ? 'border-accent bg-accent/[0.06]' : ''
                }`}
              >
                <span className="w-5 text-center font-display text-lg text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-bold">
                  {r.name}
                  {r.isMe ? (
                    <span className="ml-1.5 text-[0.6rem] font-bold uppercase text-accent">You</span>
                  ) : null}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                    r.cohort === 'adults' ? 'bg-gold/15 text-gold' : 'bg-accent/15 text-accent'
                  }`}
                >
                  {r.cohort}
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
      </div>
    </div>
  );
}
