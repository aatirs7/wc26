'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Member {
  name: string;
  points: number;
  accuracy: number | null;
}

export default function MemberList({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false);
  const sorted = [...members].sort((a, b) => b.points - a.points);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-muted active:scale-95"
      >
        {open ? 'Hide' : `Who's in (${members.length})`}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <ul className="mt-1 space-y-1">
          {sorted.map((m) => (
            <li
              key={m.name}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs"
            >
              <span className="font-semibold">{m.name}</span>
              <span className="text-muted">
                {m.accuracy !== null ? `${m.accuracy}% · ` : ''}
                <span className="font-bold text-accent">{m.points}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
