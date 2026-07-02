'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';

// Full-screen, non-dismissible overlay shown to a disqualified player. It sits
// above everything (nav and tab bar included) and swallows all pointer input,
// so the app behind stays visible but blurred and untouchable. A live timer
// counts down to `until`; when it hits zero the block lifts automatically (we
// refresh so the server re-renders without the gate). Controlled by
// src/lib/disqualified.ts.
export default function DisqualifiedGate({ until }: { until: number }) {
  const router = useRouter();
  // null until the first client tick, so server and first client render match.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, until - Date.now());
      setRemaining(r);
      if (r <= 0) router.refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, router]);

  const totalSec = remaining == null ? null : Math.ceil(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock =
    totalSec == null
      ? '—:—:—'
      : totalSec <= 0
        ? 'Reinstating…'
        : `${Math.floor(totalSec / 3600)}:${pad(Math.floor((totalSec % 3600) / 60))}:${pad(totalSec % 60)}`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Disqualified"
      className="fixed inset-0 z-[2000] flex touch-none select-none flex-col items-center justify-center gap-5 px-7 text-center"
      style={{
        backgroundColor: 'rgba(122, 8, 12, 0.9)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
      }}
    >
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(220, 38, 38, 0.35)', border: '4px solid #fca5a5' }}
      >
        <Ban className="h-14 w-14" strokeWidth={2.5} style={{ color: '#fee2e2' }} />
      </div>

      <p className="text-[0.7rem] font-black uppercase tracking-[0.35em]" style={{ color: '#fecaca' }}>
        Siddiqui World Cup
      </p>

      <h1 className="font-display text-6xl leading-none sm:text-7xl" style={{ color: '#fff1f1' }}>
        Disqualified
      </h1>

      <p className="max-w-sm text-base font-semibold leading-relaxed" style={{ color: '#ffe4e4' }}>
        For unsportsmanlike conduct and cheating, you have been suspended from the Siddiqui World Cup.
      </p>

      <div
        className="rounded-2xl px-6 py-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(252,165,165,0.4)' }}
      >
        <p
          className="text-[0.6rem] font-bold uppercase tracking-[0.3em]"
          style={{ color: '#fecaca' }}
        >
          Suspension ends in
        </p>
        <p
          className="font-display text-5xl leading-none tabular-nums"
          style={{ color: '#fff1f1' }}
          suppressHydrationWarning
        >
          {clock}
        </p>
      </div>

      <p className="max-w-sm text-sm" style={{ color: 'rgba(255, 220, 220, 0.8)' }}>
        Sit tight. You are back in automatically when the clock runs out.
      </p>
    </div>
  );
}
