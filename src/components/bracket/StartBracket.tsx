'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StartBracket({ poolId }: { poolId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          poolId,
          name: name.trim() || 'My bracket',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'could not create bracket');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'could not create bracket');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-4 rounded-2xl border border-edge bg-surface/50 p-4">
      <h2 className="text-lg font-bold">Name your bracket</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Siu Crew Special"
        maxLength={60}
        className="min-h-11 w-full rounded-xl border border-edge bg-surface px-3 text-sm"
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-bold text-black disabled:opacity-40"
      >
        {busy ? 'Creating...' : 'Start picking'}
      </button>
    </div>
  );
}
