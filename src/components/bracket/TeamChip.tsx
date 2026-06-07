'use client';

import type { Team } from '@/types/team';

interface Props {
  team: Team;
  selected?: boolean;
  badge?: string;
  disabled?: boolean;
  onTap?: () => void;
}

export default function TeamChip({ team, selected, badge, disabled, onTap }: Props) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors ${
        selected
          ? 'border-accent bg-accent/10'
          : 'border-edge bg-surface active:bg-surface-raised'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <span className="text-xl leading-none">{team.flag}</span>
      <span className="flex-1 truncate text-sm font-medium">{team.name}</span>
      <span className="font-mono text-xs text-muted">{team.code}</span>
      {badge ? (
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-black">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
