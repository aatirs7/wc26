'use client';

import type { Team } from '@/types/team';
import type { Predictions } from '@/types/bracket';
import { ROUND_SIZES, type KnockoutRoundKey } from '@/lib/constants';
import { poolForRound } from '@/lib/bracket-reducer';
import TeamChip from './TeamChip';

interface Props {
  teams: Team[];
  predictions: Predictions;
  round: KnockoutRoundKey;
  description: string;
  onToggle: (code: string) => void;
}

export default function KnockoutRound({ teams, predictions, round, description, onToggle }: Props) {
  const pool = poolForRound(predictions, round);
  const picks = new Set(predictions.knockout[round]);
  const size = ROUND_SIZES[round];
  const full = picks.size >= size;
  const candidates = teams.filter((t) => pool.has(t.code));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{description}</p>
      {candidates.length === 0 ? (
        <p className="rounded-xl border border-edge bg-surface p-4 text-sm text-muted">
          Finish the previous step first; the teams you advance there show up here.
        </p>
      ) : (
        <div className="space-y-2">
          {candidates.map((team) => {
            const selected = picks.has(team.code);
            return (
              <TeamChip
                key={team.code}
                team={team}
                selected={selected}
                badge={selected ? 'IN' : undefined}
                disabled={!selected && full}
                onTap={() => onToggle(team.code)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
