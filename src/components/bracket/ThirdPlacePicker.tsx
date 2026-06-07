'use client';

import type { Team } from '@/types/team';
import type { Predictions } from '@/types/bracket';
import { GROUP_LETTERS, THIRD_PLACE_PICKS } from '@/lib/constants';
import TeamChip from './TeamChip';

interface Props {
  teams: Team[];
  predictions: Predictions;
  onToggle: (code: string) => void;
}

export default function ThirdPlacePicker({ teams, predictions, onToggle }: Props) {
  const top2 = new Set(
    Object.values(predictions.groups)
      .flatMap((g) => [g?.first, g?.second])
      .filter(Boolean) as string[],
  );
  const picked = new Set(predictions.thirdPlace);
  const full = picked.size >= THIRD_PLACE_PICKS;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        8 third-placed teams also reach the knockout. Pick which {THIRD_PLACE_PICKS} of
        the remaining teams sneak through. Worth 2 points each.
      </p>
      {GROUP_LETTERS.map((letter) => {
        const candidates = teams.filter(
          (t) => t.groupLetter === letter && !top2.has(t.code),
        );
        if (candidates.length === 0) return null;
        return (
          <section key={letter} className="rounded-2xl border border-edge bg-surface/50 p-3">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">
              Group {letter}
            </h3>
            <div className="space-y-2">
              {candidates.map((team) => {
                const selected = picked.has(team.code);
                return (
                  <TeamChip
                    key={team.code}
                    team={team}
                    selected={selected}
                    badge={selected ? '3rd' : undefined}
                    disabled={!selected && full}
                    onTap={() => onToggle(team.code)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
