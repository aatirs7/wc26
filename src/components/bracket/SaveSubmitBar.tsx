'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  saveStatus: SaveStatus;
  canNext: boolean;
  onNext: () => void;
  showSubmit: boolean;
  submitEnabled: boolean;
  submitted: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

export default function SaveSubmitBar(props: Props) {
  const { saveStatus, canNext, onNext, showSubmit, submitEnabled, submitted, submitting, onSubmit } =
    props;

  const [hidden, setHidden] = useState(false);

  // Saving is silent. Speak up only on a failed save, or when a complete
  // bracket has changes that have not been submitted yet (so a post-submit
  // edit does not silently leave the bracket off the leaderboard).
  const tone =
    saveStatus === 'error'
      ? 'error'
      : showSubmit && submitEnabled && !submitted
        ? 'unsubmitted'
        : null;

  const note =
    tone === 'error' ? 'Save failed' : tone === 'unsubmitted' ? 'Not submitted' : '';

  // Something the user should act on. The collapsed tab glows when true so
  // it is not missed.
  const needsAttention = tone !== null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        aria-label="Show bracket controls"
        className={`glass fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-30 lg:bottom-6 flex h-9 w-9 items-center justify-center rounded-full shadow-lg shadow-black/40 active:scale-95 ${
          needsAttention ? 'text-accent ring-1 ring-accent' : 'text-muted'
        }`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-30 lg:bottom-6">
      <div className="glass flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-2 shadow-xl shadow-black/40">
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Hide bracket controls"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted active:scale-95"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        {note ? (
          <span
            className={`text-[0.7rem] font-medium ${
              tone === 'error' ? 'text-live' : 'text-accent'
            }`}
          >
            {note}
          </span>
        ) : null}

        {showSubmit ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!submitEnabled || submitting || submitted}
            className={`min-h-8 rounded-full px-3.5 text-xs font-bold transition-all active:scale-95 ${
              submitted
                ? 'bg-accent/15 text-accent'
                : 'bg-accent text-[var(--accent-ink)] disabled:opacity-30'
            }`}
          >
            {submitted ? 'Submitted ✓' : submitting ? 'Submitting…' : 'Submit'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="min-h-8 rounded-full bg-accent px-4 text-xs font-bold text-[var(--accent-ink)] disabled:opacity-30 active:scale-95"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
