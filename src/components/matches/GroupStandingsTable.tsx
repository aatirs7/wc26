import type { Team } from '@/types/team';

export interface StandingRowData {
  groupLetter: string;
  teamCode: string;
  played: number;
  points: number;
  gd: number;
  gf: number;
  rank: number | null;
  advanced: boolean;
  isBestThird: boolean;
}

interface Props {
  letter: string;
  rows: StandingRowData[];
  teamsByCode: Map<string, Team>;
}

export default function GroupStandingsTable({ letter, rows, teamsByCode }: Props) {
  const sorted = [...rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return (
    <section className="rounded-2xl border border-edge bg-surface/50 p-3">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Group {letter}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase text-muted">
            <th className="w-6 pb-1 font-medium">#</th>
            <th className="pb-1 font-medium">Team</th>
            <th className="w-8 pb-1 text-right font-medium">P</th>
            <th className="w-8 pb-1 text-right font-medium">GD</th>
            <th className="w-10 pb-1 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const team = teamsByCode.get(row.teamCode);
            return (
              <tr key={row.teamCode} className="border-t border-edge/50">
                <td className="py-1.5 text-muted">{row.rank ?? '–'}</td>
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <span>{team?.flag}</span>
                    <span className="truncate font-medium">{team?.name ?? row.teamCode}</span>
                    {row.advanced ? (
                      <span
                        className={`rounded-full px-1.5 text-[9px] font-bold ${
                          row.isBestThird ? 'bg-gold/20 text-gold' : 'bg-accent/20 text-accent'
                        }`}
                      >
                        {row.isBestThird ? '3rd' : 'Q'}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="py-1.5 text-right text-muted">{row.played}</td>
                <td className="py-1.5 text-right text-muted">
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="py-1.5 text-right font-bold">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
