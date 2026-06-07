'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PoolActions() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'request failed');
      setName('');
      setCode('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-edge bg-surface/50 p-4">
        <h3 className="mb-2 text-sm font-bold">Join a pool</h3>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            className="min-h-11 flex-1 rounded-xl border border-edge bg-surface px-3 font-mono text-sm uppercase placeholder:normal-case placeholder:font-sans"
          />
          <button
            type="button"
            disabled={busy || code.trim().length < 4}
            onClick={() => call({ action: 'join', code })}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-black disabled:opacity-40"
          >
            Join
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-edge bg-surface/50 p-4">
        <h3 className="mb-2 text-sm font-bold">Start a new pool</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pool name"
            className="min-h-11 flex-1 rounded-xl border border-edge bg-surface px-3 text-sm"
          />
          <button
            type="button"
            disabled={busy || name.trim().length === 0}
            onClick={() => call({ action: 'create', name })}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-black disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
