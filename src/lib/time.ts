// Parses openfootball time strings like "13:00 UTC-6" together with a
// "2026-06-11" date into a UTC Date. All offsets in the 2026 dataset are
// whole hours (UTC-4 through UTC-7); we assert that to fail loudly if the
// source ever changes.

const TIME_RE = /^(\d{1,2}):(\d{2}) UTC([+-]\d{1,2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseKickoffUtc(date: string, time: string): Date {
  const dm = DATE_RE.exec(date);
  if (!dm) throw new Error(`Unparseable date string: ${date}`);
  const tm = TIME_RE.exec(time);
  if (!tm) throw new Error(`Unparseable time string: ${time}`);

  const [, year, month, day] = dm;
  const [, hh, mm, off] = tm;
  const offsetHours = Number(off);
  if (!Number.isInteger(offsetHours) || Math.abs(offsetHours) > 14) {
    throw new Error(`Unexpected UTC offset: ${off}`);
  }

  // Local wall time minus the offset gives UTC: 13:00 at UTC-6 is 19:00Z.
  const utcMillis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hh) - offsetHours,
    Number(mm),
  );
  return new Date(utcMillis);
}
