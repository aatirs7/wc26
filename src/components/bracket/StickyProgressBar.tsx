'use client';

export interface StepInfo {
  key: string;
  title: string;
  done: number;
  total: number;
}

interface Props {
  steps: StepInfo[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function StickyProgressBar({ steps, activeKey, onSelect }: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-edge bg-background/95 px-4 py-2 backdrop-blur">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {steps.map((step) => {
          const active = step.key === activeKey;
          const complete = step.done >= step.total;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onSelect(step.key)}
              className={`flex min-h-11 shrink-0 flex-col items-center justify-center rounded-xl border px-3 text-xs font-medium ${
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : complete
                    ? 'border-edge bg-surface text-foreground'
                    : 'border-edge bg-surface text-muted'
              }`}
            >
              <span>{step.title}</span>
              <span className={complete ? 'text-accent' : 'text-muted'}>
                {step.done}/{step.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
