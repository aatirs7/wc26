'use client';

import { useState } from 'react';
import { Share, MoreVertical, PlusSquare } from 'lucide-react';

type Platform = 'ios' | 'android';

const STEPS: Record<Platform, { icon: typeof Share; text: string }[]> = {
  ios: [
    { icon: Share, text: 'Open this page in Safari, then tap the Share button (the square with an up arrow).' },
    { icon: PlusSquare, text: 'Scroll down and tap "Add to Home Screen".' },
    { icon: PlusSquare, text: 'Tap "Add" in the top corner. The trophy icon lands on your home screen.' },
  ],
  android: [
    { icon: MoreVertical, text: 'Open this page in Chrome, then tap the three-dot menu (top right).' },
    { icon: PlusSquare, text: 'Tap "Add to Home screen" (or "Install app").' },
    { icon: PlusSquare, text: 'Tap "Add" to confirm. Find it with your other apps.' },
  ],
};

export default function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>('ios');

  return (
    <div className="card space-y-3 p-4">
      <div className="flex rounded-full border border-edge bg-white/[0.03] p-1 text-sm font-bold">
        {(['ios', 'android'] as Platform[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatform(p)}
            className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
              platform === p ? 'bg-accent text-[var(--accent-ink)]' : 'text-muted'
            }`}
          >
            {p === 'ios' ? 'iPhone' : 'Android'}
          </button>
        ))}
      </div>
      <ol className="space-y-2.5">
        {STEPS[platform].map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="pt-0.5 text-sm leading-snug text-muted">{step.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
