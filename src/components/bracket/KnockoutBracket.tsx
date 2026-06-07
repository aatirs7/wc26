'use client';

import type { Team } from '@/types/team';
import type { FillKey, ResolvedMatchup } from '@/lib/knockout-bracket';
import { Trophy, ChevronRight } from 'lucide-react';

interface Props {
  matchups: ResolvedMatchup[];
  teamsByCode: Map<string, Team>;
  fills: FillKey;
  onPick?: (fills: FillKey, winner: string, loser: string | null) => void;
}

function TeamSide({
  code,
  label,
  isWinner,
  decided,
  teamsByCode,
  onTap,
  isChampion,
}: {
  code: string | null;
  label: string;
  isWinner: boolean;
  decided: boolean;
  teamsByCode: Map<string, Team>;
  onTap?: () => void;
  isChampion?: boolean;
}) {
  const team = code ? teamsByCode.get(code) : undefined;
  const dim = decided && !isWinner;
  return (
    <button
      type="button"
      disabled={!onTap || !code}
      onClick={onTap}
      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
        isWinner ? 'bg-accent/[0.1]' : 'hover:bg-white/[0.03]'
      } ${dim ? 'opacity-45' : ''} disabled:cursor-default`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/30 text-base">
        {team?.flag ?? '·'}
      </span>
      <span className="min-w-0 flex-1">
        {team ? (
          <span className="block truncate text-sm font-semibold leading-tight">{team.name}</span>
        ) : (
          <span className="block truncate text-sm font-medium leading-tight text-muted-2">
            {label}
          </span>
        )}
      </span>
      {isChampion && isWinner ? (
        <Trophy className="h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} />
      ) : isWinner ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[var(--accent-ink)]">
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : (
        <span className="h-5 w-5 shrink-0 rounded-full border border-edge" />
      )}
    </button>
  );
}

export default function KnockoutBracket({ matchups, teamsByCode, fills, onPick }: Props) {
  return (
    <div className="space-y-2.5">
      {matchups.map((m) => {
        const decided = m.winner != null;
        return (
          <div key={m.id} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-edge/60 px-3 py-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-2">
                Match {m.id}
              </span>
              {fills === 'champion' ? (
                <span className="text-[0.6rem] font-bold uppercase tracking-wider text-gold">
                  Champion
                </span>
              ) : null}
            </div>
            <TeamSide
              code={m.aCode}
              label={m.aLabel}
              isWinner={m.winner != null && m.winner === m.aCode}
              decided={decided}
              teamsByCode={teamsByCode}
              isChampion={fills === 'champion'}
              onTap={
                onPick && m.aCode
                  ? () => onPick(fills, m.aCode!, m.bCode)
                  : undefined
              }
            />
            <div className="mx-3 border-t border-edge/40" />
            <TeamSide
              code={m.bCode}
              label={m.bLabel}
              isWinner={m.winner != null && m.winner === m.bCode}
              decided={decided}
              teamsByCode={teamsByCode}
              isChampion={fills === 'champion'}
              onTap={
                onPick && m.bCode
                  ? () => onPick(fills, m.bCode!, m.aCode)
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
