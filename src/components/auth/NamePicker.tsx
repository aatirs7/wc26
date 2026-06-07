'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  players: { id: string; displayName: string }[];
}

export default function NamePicker({ players }: Props) {
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
      router.push('/bracket');
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

  return (
    <div className="space-y-2">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">
        Tap your name to play
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy !== null}
            onClick={() => signIn(p)}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold active:scale-95 disabled:opacity-40 ${
              busy === p.id
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-edge bg-white/[0.03]'
            }`}
          >
            {p.displayName}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-live">{error}</p> : null}
    </div>
  );
}
