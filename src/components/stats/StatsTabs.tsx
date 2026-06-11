'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

// Toggles between the family head-to-head view and the group-picks view.
// Both trees are rendered on the server and handed in as nodes, so the
// switch is instant with no refetch.
export default function StatsTabs({
  headToHead,
  group,
}: {
  headToHead: ReactNode;
  group: ReactNode;
}) {
  const [tab, setTab] = useState<'h2h' | 'group'>('h2h');

  const tabs = [
    ['h2h', 'Head to Head'],
    ['group', 'Group Stats'],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-xs rounded-full border border-edge bg-white/[0.03] p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-9 flex-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
              tab === key ? 'bg-accent text-[var(--accent-ink)]' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'h2h' ? headToHead : group}
    </div>
  );
}
