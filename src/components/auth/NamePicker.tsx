'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  players: { id: string; displayName: string }[];
  lastName?: string | null;
}

export default function NamePicker({ players, lastName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(player: { id: string; displayName: string }) {
    setBusy(player.id);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: player.displayName }),
      });
      if (!res.ok) throw new Error('sign in failed');
      router.push('/home');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'sign in failed');
      setBusy(null);
    }
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted">
        No players set up yet. Ask Aatir to add you to the league.
      </p>
    );
  }

  const isLast = (name: string) => !!lastName && name.toLowerCase() === lastName.toLowerCase();
  // Remembered name floats to the front.
  const ordered = [...players].sort((a, b) => Number(isLast(b.displayName)) - Number(isLast(a.displayName)));

  return (
    <div className="space-y-2">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
        Tap your name to play
      </p>
      {lastName ? (
        <p className="text-xs text-accent">Last time you were {lastName}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        {ordered.map((p) => {
          const mine = isLast(p.displayName);
          return (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => signIn(p)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold active:scale-95 disabled:opacity-40 ${
                busy === p.id || mine
                  ? 'border-accent bg-accent/15 text-accent shadow-[0_0_16px_var(--pitch-glow)]'
                  : 'border-edge bg-white/[0.03]'
              }`}
            >
              {p.displayName}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-live">{error}</p> : null}
    </div>
  );
}
