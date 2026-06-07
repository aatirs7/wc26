'use client';

import { useEffect, useRef, useState } from 'react';
import type { Team } from '@/types/team';
import type { Predictions } from '@/types/bracket';
import {
  feedersOf,
  resolveById,
  ROOT_ID,
  type FillKey,
  type ResolvedMatchup,
} from '@/lib/knockout-bracket';
import { Trophy, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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

const MIN_SCALE = 0.3;
const MAX_SCALE = 1;
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export default function FullBracket({ predictions, teamsByCode, onPick }: Props) {
  const resolved = resolveById(predictions);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Measure the bracket's natural size (transform does not affect
  // scrollWidth/Height) so the scaled wrapper can reserve the right space.
  useEffect(() => {
    const el = contentRef.current;
    if (el) setDims({ w: el.scrollWidth, h: el.scrollHeight });
  }, [predictions]);

  function fit() {
    const vp = viewportRef.current;
    if (!vp || !dims.w) return;
    const available = vp.clientWidth - 32; // account for px-4 padding
    setScale(clampScale(available / dims.w));
  }

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

  const zoomBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-white/[0.03] text-muted active:scale-90 disabled:opacity-30';

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <button type="button" aria-label="Zoom out" onClick={() => setScale((s) => clampScale(s - 0.15))} disabled={scale <= MIN_SCALE} className={zoomBtn}>
          <ZoomOut className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <button type="button" onClick={fit} className="flex h-8 items-center gap-1 rounded-lg border border-edge bg-white/[0.03] px-2.5 text-xs font-semibold text-muted active:scale-90">
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          Fit
        </button>
        <button type="button" onClick={() => setScale(1)} className="flex h-8 items-center rounded-lg border border-edge bg-white/[0.03] px-2.5 text-xs font-semibold text-muted active:scale-90">
          1×
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => setScale((s) => clampScale(s + 0.15))} disabled={scale >= MAX_SCALE} className={zoomBtn}>
          <ZoomIn className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      <div ref={viewportRef} className="-mx-4 overflow-x-auto px-4 pb-2">
        <div style={dims.w ? { width: dims.w * scale, height: dims.h * scale } : undefined}>
          <div
            ref={contentRef}
            data-fullbracket
            className="flex items-center"
            style={{ width: 'max-content', transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
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
      </div>
    </div>
  );
}
