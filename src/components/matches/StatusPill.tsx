const STYLES: Record<string, { label: string; cls: string }> = {
  live: { label: 'LIVE', cls: 'bg-danger/20 text-danger animate-pulse' },
  ht: { label: 'HT', cls: 'bg-gold/20 text-gold' },
  ft: { label: 'FT', cls: 'bg-surface-raised text-muted' },
  et: { label: 'AET', cls: 'bg-surface-raised text-muted' },
  pens: { label: 'PENS', cls: 'bg-surface-raised text-muted' },
};

export default function StatusPill({ status }: { status: string }) {
  const s = STYLES[status];
  if (!s) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
