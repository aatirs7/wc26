'use client';

import type { Team } from '@/types/team';
import type { Predictions } from '@/types/bracket';
import { GROUP_LETTERS, type GroupLetter } from '@/lib/constants';
import TeamChip from './TeamChip';

interface Props {
  teams: Team[];
  predictions: Predictions;
  onCycle: (letter: GroupLetter, code: string) => void;
}

export default function GroupPicker({ teams, predictions, onCycle }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Tap a team to set its finish: first tap is 1st, tap a picked team to
        cycle it to 2nd, then off.
      </p>
      {GROUP_LETTERS.map((letter) => {
        const groupTeams = teams.filter((t) => t.groupLetter === letter);
        const pick = predictions.groups[letter];
        const done = !!pick?.first && !!pick?.second;
        return (
          <section
            key={letter}
            className="rounded-2xl border border-edge bg-surface/50 p-3"
          >
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Group {letter}
              </h3>
              <span className={`text-xs ${done ? 'text-accent' : 'text-muted'}`}>
                {done ? 'Done' : 'Pick 1st and 2nd'}
              </span>
            </header>
            <div className="space-y-2">
              {groupTeams.map((team) => {
                const badge =
                  pick?.first === team.code
                    ? '1st'
                    : pick?.second === team.code
                      ? '2nd'
                      : undefined;
                return (
                  <TeamChip
                    key={team.code}
                    team={team}
                    selected={!!badge}
                    badge={badge}
                    onTap={() => onCycle(letter, team.code)}
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
