import type { Predictions } from '@/types/bracket';
import type { Team } from '@/types/team';
import { GROUP_LETTERS } from '@/lib/constants';
import { KO_ROUNDS, resolveBracket } from '@/lib/knockout-bracket';
import KnockoutBracket from '@/components/bracket/KnockoutBracket';

interface Props {
  predictions: Predictions;
  teams: Team[];
}

const MEDAL: Record<number, string> = { 1: 'medal-1', 2: 'medal-2', 3: 'medal-3', 4: 'medal-4' };

// Read-only render of a bracket, used for locked views and viewing other
// people's brackets. Server-safe; KnockoutBracket renders without onPick.
export default function BracketSummary({ predictions, teams }: Props) {
  const byCode = new Map(teams.map((t) => [t.code, t]));
  const resolved = resolveBracket(predictions);

  const champion = predictions.knockout.champion;
  const championTeam = champion ? byCode.get(champion) : undefined;

  return (
    <div className="space-y-7">
      {championTeam ? (
        <div className="card relative overflow-hidden p-5 text-center ring-1">
          <div className="text-5xl">{championTeam.flag}</div>
          <div className="shine mt-2 font-display text-3xl">{championTeam.name}</div>
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold">
            Predicted champion
          </div>
        </div>
      ) : null}

      {[...KO_ROUNDS].reverse().map((round) => {
        const ties = resolved[round.key].filter((m) => m.aCode || m.bCode);
        if (ties.length === 0) return null;
        return (
          <section key={round.key}>
            <h3 className="mb-2 font-display text-xl text-muted">{round.title}</h3>
            <KnockoutBracket matchups={resolved[round.key]} teamsByCode={byCode} fills={round.fills} />
          </section>
        );
      })}

      <section>
        <h3 className="mb-2 font-display text-xl text-muted">Group finishes</h3>
        <div className="grid grid-cols-2 gap-2">
          {GROUP_LETTERS.map((letter) => {
            const g = predictions.groups[letter];
            const ordered = [g?.first, g?.second, g?.third, g?.fourth];
            return (
              <div key={letter} className="card p-2.5">
                <div className="mb-1.5 font-display text-base text-foreground">Group {letter}</div>
                <ol className="space-y-1">
                  {ordered.map((code, i) => {
                    const t = code ? byCode.get(code) : undefined;
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold ${MEDAL[i + 1]}`}
                        >
                          {i + 1}
                        </span>
                        {t ? (
                          <span className="truncate">
                            {t.flag} {t.code}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-xl text-muted">Best third-placed qualifiers</h3>
        <div className="flex flex-wrap gap-1.5">
          {predictions.thirdPlace.length > 0 ? (
            predictions.thirdPlace.map((code) => {
              const t = byCode.get(code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-white/[0.03] px-2.5 py-1 text-xs font-semibold"
                >
                  <span>{t?.flag}</span>
                  {code}
                </span>
              );
            })
          ) : (
            <span className="text-xs text-muted">No picks</span>
          )}
        </div>
      </section>
    </div>
  );
}
