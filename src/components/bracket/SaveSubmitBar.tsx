'use client';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  saveStatus: SaveStatus;
  canBack: boolean;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
  showSubmit: boolean;
  submitEnabled: boolean;
  submitted: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed, retrying on next change',
};

export default function SaveSubmitBar(props: Props) {
  const {
    saveStatus, canBack, canNext, onBack, onNext,
    showSubmit, submitEnabled, submitted, submitting, onSubmit,
  } = props;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-edge bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
        <span
          className={`w-20 text-xs ${saveStatus === 'error' ? 'text-danger' : 'text-muted'}`}
        >
          {STATUS_LABEL[saveStatus]}
        </span>
        <div className="flex flex-1 justify-end gap-2">
          {canBack ? (
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 rounded-xl border border-edge bg-surface px-4 text-sm font-semibold"
            >
              Back
            </button>
          ) : null}
          {showSubmit ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!submitEnabled || submitting || submitted}
              className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-bold ${
                submitted
                  ? 'bg-surface-raised text-accent'
                  : 'bg-accent text-black disabled:opacity-40'
              }`}
            >
              {submitted ? 'Submitted ✓' : submitting ? 'Submitting...' : 'Submit bracket'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className="min-h-11 rounded-xl bg-accent px-6 text-sm font-bold text-black disabled:opacity-40"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
