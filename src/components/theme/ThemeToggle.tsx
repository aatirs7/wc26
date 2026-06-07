'use client';

import { useEffect, useState } from 'react';
import { Moon, CloudSun } from 'lucide-react';

type Theme = 'dark' | 'gray';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'gray' ? 'gray' : 'dark';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `wc26_theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const options: { key: Theme; label: string; icon: typeof Moon }[] = [
    { key: 'dark', label: 'Night', icon: Moon },
    { key: 'gray', label: 'Day', icon: CloudSun },
  ];

  return (
    <div className="card flex items-center justify-between p-3">
      <span className="font-display text-lg">Theme</span>
      <div className="flex rounded-full border border-edge bg-white/[0.03] p-1">
        {options.map((o) => {
          const Icon = o.icon;
          const active = theme === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => apply(o.key)}
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${
                active ? 'bg-accent text-[var(--accent-ink)]' : 'text-muted'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.4} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
