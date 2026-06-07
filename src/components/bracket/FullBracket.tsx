'use client';

import type { Team } from '@/types/team';
import type { Predictions } from '@/types/bracket';
import {
  feedersOf,
  resolveById,
  ROOT_ID,
  type FillKey,
  type ResolvedMatchup,
} from '@/lib/knockout-bracket';
import { Trophy, ChevronRight } from 'lucide-react';

interface Props {
  predictions: Predictions;
  teamsByCode: Map<string, Team>;
  onPick?: (fills: FillKey, winner: string, loser: string | null) => void;
}

function Slot({
  code,
  label,
  isWinner,
  decided,
  teamsByCode,
  onTap,
}: {
  code: string | null;
  label: string;
  isWinner: boolean;
  decided: boolean;
  teamsByCode: Map<string, Team>;
  onTap?: () => void;
}) {
  const team = code ? teamsByCode.get(code) : undefined;
  const dim = decided && !isWinner;
  return (
    <button
      type="button"
      disabled={!onTap || !code}
      onClick={onTap}
      className={`flex h-10 w-full items-center gap-2 px-2.5 text-left transition-colors ${
        isWinner ? 'bg-accent/[0.12]' : ''
      } ${dim ? 'opacity-40' : ''} disabled:cursor-default`}
    >
      <span className="text-base leading-none">{team?.flag ?? ''}</span>
      <span className="min-w-0 flex-1">
        {team ? (
          <span className={`block truncate text-[0.8rem] font-bold leading-tight ${isWinner ? 'text-accent' : ''}`}>
            {team.name}
          </span>
        ) : (
          <span className="block truncate text-[0.7rem] font-medium leading-tight text-muted-2">
            {label}
          </span>
        )}
      </span>
      {isWinner ? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={3} />
      ) : null}
    </button>
  );
}

function Tie({
  m,
  teamsByCode,
  onPick,
}: {
  m: ResolvedMatchup;
  teamsByCode: Map<string, Team>;
  onPick?: Props['onPick'];
}) {
  const decided = m.winner != null;
  return (
    <div className="w-44 shrink-0 overflow-hidden rounded-lg border border-edge bg-surface">
      <Slot
        code={m.aCode}
        label={m.aLabel}
        isWinner={decided && m.winner === m.aCode}
        decided={decided}
        teamsByCode={teamsByCode}
        onTap={onPick && m.aCode ? () => onPick(m.fills, m.aCode!, m.bCode) : undefined}
      />
      <div className="mx-2 border-t border-edge/50" />
      <Slot
        code={m.bCode}
        label={m.bLabel}
        isWinner={decided && m.winner === m.bCode}
        decided={decided}
        teamsByCode={teamsByCode}
        onTap={onPick && m.bCode ? () => onPick(m.fills, m.bCode!, m.aCode) : undefined}
      />
    </div>
  );
}

function Connector() {
  return (
    <div className="relative w-5 shrink-0 self-stretch">
      <span className="absolute left-1/2 top-1/4 bottom-1/4 w-px bg-edge-strong" />
      <span className="absolute left-0 top-1/4 h-px w-1/2 bg-edge-strong" />
      <span className="absolute left-0 top-3/4 h-px w-1/2 bg-edge-strong" />
      <span className="absolute left-1/2 right-0 top-1/2 h-px bg-edge-strong" />
    </div>
  );
}

export default function FullBracket({ predictions, teamsByCode, onPick }: Props) {
  const resolved = resolveById(predictions);

  // Renders a tie with its feeder subtrees to the left, connected.
  function Node({ id }: { id: number }) {
    const m = resolved.get(id);
    if (!m) return null;
    const feeders = feedersOf(id);
    if (!feeders) {
      return <Tie m={m} teamsByCode={teamsByCode} onPick={onPick} />;
    }
    return (
      <div className="flex items-center">
        <div className="flex flex-col justify-center gap-3">
          <Node id={feeders[0]} />
          <Node id={feeders[1]} />
        </div>
        <Connector />
        <Tie m={m} teamsByCode={teamsByCode} onPick={onPick} />
      </div>
    );
  }

  const champCode = resolved.get(ROOT_ID)?.winner ?? null;
  const champ = champCode ? teamsByCode.get(champCode) : undefined;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div data-fullbracket className="flex items-center" style={{ width: 'max-content' }}>
        <Node id={ROOT_ID} />
        <Connector />
        <div
          className={`flex w-40 shrink-0 flex-col items-center gap-1 rounded-lg border p-3 text-center ${
            champ ? 'border-gold/50 bg-gold/[0.08] ring-1' : 'border-edge bg-surface'
          }`}
        >
          <Trophy className={`h-6 w-6 ${champ ? 'text-gold' : 'text-muted-2'}`} strokeWidth={2} />
          {champ ? (
            <>
              <span className="text-2xl leading-none">{champ.flag}</span>
              <span className="text-sm font-bold leading-tight">{champ.name}</span>
              <span className="text-[0.55rem] font-bold uppercase tracking-wider text-gold">
                Champion
              </span>
            </>
          ) : (
            <span className="text-[0.65rem] font-medium leading-tight text-muted-2">Champion</span>
          )}
        </div>
      </div>
    </div>
  );
}
