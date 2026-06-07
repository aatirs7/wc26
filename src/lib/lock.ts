// Single tournament-wide lock moment. Before kickoff brackets are
// editable by their owners; at kickoff everything freezes.

export function kickoffUtc(): Date {
  const raw = process.env.TOURNAMENT_KICKOFF_UTC;
  if (!raw) throw new Error('TOURNAMENT_KICKOFF_UTC is not set');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`TOURNAMENT_KICKOFF_UTC is not a valid date: ${raw}`);
  }
  return d;
}

export function isLocked(now: Date = new Date()): boolean {
  return now.getTime() >= kickoffUtc().getTime();
}
