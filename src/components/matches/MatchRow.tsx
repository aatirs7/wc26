import type { Team } from '@/types/team';
import StatusPill from './StatusPill';
import LocalTime from './LocalTime';

export interface MatchRowData {
  id: number;
  status: string;
  homeCode: string | null;
  awayCode: string | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoffUtc: Date;
  roundLabel: string;
  groupLetter: string | null;
}

interface Props {
  match: MatchRowData;
  teamsByCode: Map<string, Team>;
}

function Side({
  code,
  placeholder,
  teamsByCode,
}: {
  code: string | null;
  placeholder: string | null;
  teamsByCode: Map<string, Team>;
}) {
  const team = code ? teamsByCode.get(code) : undefined;
  if (!team) {
    return (
      <span className="flex-1 truncate text-sm text-muted">{placeholder ?? 'TBD'}</span>
    );
  }
  return (
    <span className="flex flex-1 items-center gap-2 truncate text-sm font-medium">
      <span className="text-lg leading-none">{team.flag}</span>
      <span className="truncate">{team.name}</span>
    </span>
  );
}

export default function MatchRow({ match, teamsByCode }: Props) {
  const played = match.homeScore !== null && match.awayScore !== null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Side code={match.homeCode} placeholder={match.homePlaceholder} teamsByCode={teamsByCode} />
          {played ? <span className="font-mono text-sm font-bold">{match.homeScore}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <Side code={match.awayCode} placeholder={match.awayPlaceholder} teamsByCode={teamsByCode} />
          {played ? <span className="font-mono text-sm font-bold">{match.awayScore}</span> : null}
        </div>
      </div>
      <div className="flex w-16 flex-col items-end gap-1 text-right">
        <StatusPill status={match.status} />
        {match.status === 'scheduled' ? (
          <span className="text-xs text-muted">
            <LocalTime iso={match.kickoffUtc.toISOString()} />
          </span>
        ) : null}
        <span className="text-[10px] text-muted">
          {match.groupLetter ? `Grp ${match.groupLetter}` : match.roundLabel}
        </span>
      </div>
    </div>
  );
}
