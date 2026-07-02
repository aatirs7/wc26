'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// One-time, dismissible reminder shown to every Siddiqui member. It only starts
// appearing at `activeAt` (the moment Aafi's suspension is lifted) and is
// remembered per device so it auto-opens just once.
const VERSION = '2026-07-02-redcard';
const KEY = 'wc26_redcard_seen';

export default function RedCardReminder({ activeAt }: { activeAt: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Not live until the reinstatement moment has passed.
    if (Date.now() < activeAt) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY);
    } catch {
      // storage unavailable; skip auto-open
    }
    if (seen !== VERSION) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [activeAt]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, VERSION);
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative w-full max-w-[20rem] rounded-2xl border border-edge-strong bg-surface-raised p-5 text-center shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-edge bg-surface text-muted active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>

        {/* A red card. */}
        <div
          className="mx-auto h-16 w-12 rounded-md"
          style={{ backgroundColor: '#dc2626', boxShadow: '0 8px 20px rgba(220,38,38,0.45)' }}
        />

        <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-2">
          Fair play
        </p>
        <h2 className="mt-1 font-display text-2xl leading-tight text-foreground">
          Don&apos;t sign in as someone else
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Reminder: play as yourself only. Cheating or signing in as another person will get you a{' '}
          <span className="font-bold" style={{ color: '#ef4444' }}>
            red card
          </span>
          .
        </p>
        <p className="mt-2 font-display text-xl" style={{ color: '#ef4444' }}>
          #suspended
        </p>

        <button
          type="button"
          onClick={close}
          className="mt-4 min-h-11 w-full rounded-xl bg-accent text-sm font-bold text-[var(--accent-ink)] active:scale-95"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
