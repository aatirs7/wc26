'use client';

import { useState } from 'react';
import { Eraser } from 'lucide-react';

// Two-tap clear: first tap arms it, second tap wipes the current step.
export default function ClearStepButton({ onClear }: { onClear: () => void }) {
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          onClear();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={`flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors ${
        armed ? 'border-live/50 bg-live/10 text-live' : 'border-edge text-muted'
      }`}
    >
      <Eraser className="h-3.5 w-3.5" strokeWidth={2.2} />
      {armed ? 'Tap to clear' : 'Clear'}
    </button>
  );
}
