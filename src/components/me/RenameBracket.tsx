'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RenameBracket({ bracketId, currentName }: { bracketId: string; currentName: string }) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch('/api/bracket', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bracketId, name: name.trim() }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        maxLength={60}
        className="min-h-11 flex-1 rounded-xl border border-edge bg-surface px-3 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy || name.trim().length === 0 || name === currentName}
        className="min-h-11 rounded-xl border border-edge bg-surface px-4 text-sm font-semibold disabled:opacity-40"
      >
        {saved ? 'Saved' : 'Rename'}
      </button>
    </div>
  );
}
