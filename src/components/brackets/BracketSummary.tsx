import type { Predictions } from '@/types/bracket';
import type { Team } from '@/types/team';
import { GROUP_LETTERS, KNOCKOUT_ROUNDS, KNOCKOUT_ROUND_LABELS } from '@/lib/constants';

interface Props {
  predictions: Predictions;
  teams: Team[];
}

// Read-only render of a bracket, used for locked views and viewing
// other people's brackets. Server-safe, no client hooks.
export default function BracketSummary({ predictions, teams }: Props) {
  const byCode = new Map(teams.map((t) => [t.code, t]));
  const chip = (code: string | undefined, key?: string) => {
    if (!code) return null;
    const t = byCode.get(code);
    return (
      <span
        key={key ?? code}
        className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface px-2 py-1 text-xs font-medium"
      >
        <span>{t?.flag}</span>
        {code}
      </span>
    );
  };

  const champion = predictions.knockout.champion;
  const championTeam = champion ? byCode.get(champion) : undefined;

  return (
    <div className="space-y-5">
      {championTeam ? (
        <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center">
          <div className="text-3xl">{championTeam.flag}</div>
          <div className="mt-1 text-lg font-bold text-gold">{championTeam.name}</div>
          <div className="text-xs text-muted">Predicted champion</div>
        </div>
      ) : null}

      {[...KNOCKOUT_ROUNDS].reverse().map((round) => (
        <section key={round}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Reaches the {KNOCKOUT_ROUND_LABELS[round]}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {predictions.knockout[round].length > 0
              ? predictions.knockout[round].map((code) => chip(code))
              : <span className="text-xs text-muted">No picks</span>}
          </div>
        </section>
      ))}

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          Group winners and runners-up
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {GROUP_LETTERS.map((letter) => {
            const g = predictions.groups[letter];
            return (
              <div key={letter} className="rounded-xl border border-edge bg-surface/50 p-2">
                <div className="mb-1 text-xs font-bold text-muted">Group {letter}</div>
                <div className="flex flex-wrap gap-1">
                  {chip(g?.first, `${letter}-1`) ?? <span className="text-xs text-muted">1st?</span>}
                  {chip(g?.second, `${letter}-2`) ?? <span className="text-xs text-muted">2nd?</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          Best third-placed qualifiers
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {predictions.thirdPlace.length > 0
            ? predictions.thirdPlace.map((code) => chip(code))
            : <span className="text-xs text-muted">No picks</span>}
        </div>
      </section>
    </div>
  );
}
