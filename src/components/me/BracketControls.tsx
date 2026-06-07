'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2 } from 'lucide-react';
import { emptyPredictions } from '@/types/bracket';

export default function BracketControls({ bracketId }: { bracketId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'reset' | 'delete'>(null);
  const [confirm, setConfirm] = useState<null | 'reset' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy('reset');
    setError(null);
    try {
      const res = await fetch('/api/bracket', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bracketId, predictions: emptyPredictions() }),
      });
      if (!res.ok) throw new Error('reset failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'reset failed');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  async function remove() {
    setBusy('delete');
    setError(null);
    try {
      const res = await fetch('/api/bracket', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bracketId }),
      });
      if (!res.ok) throw new Error('delete failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete failed');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirm(confirm === 'reset' ? null : 'reset')}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-edge bg-white/[0.03] text-sm font-semibold text-muted active:scale-95"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
          Reset picks
        </button>
        <button
          type="button"
          onClick={() => setConfirm(confirm === 'delete' ? null : 'delete')}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-live/40 bg-live/[0.08] text-sm font-semibold text-live active:scale-95"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
          Delete
        </button>
      </div>

      {confirm === 'reset' ? (
        <div className="rounded-xl border border-edge bg-white/[0.03] p-3 text-sm">
          <p className="text-muted">Clear every pick but keep the bracket and its name?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={busy !== null}
              className="min-h-9 flex-1 rounded-lg bg-accent text-sm font-bold text-[var(--accent-ink)] disabled:opacity-40"
            >
              {busy === 'reset' ? 'Resetting…' : 'Yes, reset'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="min-h-9 flex-1 rounded-lg border border-edge text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {confirm === 'delete' ? (
        <div className="rounded-xl border border-live/40 bg-live/[0.08] p-3 text-sm">
          <p className="text-muted">
            Delete this bracket for good? You can start a fresh one afterwards.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              className="min-h-9 flex-1 rounded-lg bg-live text-sm font-bold text-white disabled:opacity-40"
            >
              {busy === 'delete' ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="min-h-9 flex-1 rounded-lg border border-edge text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-live">{error}</p> : null}
    </div>
  );
}
