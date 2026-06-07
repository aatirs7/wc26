'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Team } from '@/types/team';
import type { Predictions } from '@/types/bracket';
import {
  GROUP_LETTERS,
  THIRD_PLACE_PICKS,
  type GroupLetter,
} from '@/lib/constants';
import { isComplete, isGroupComplete } from '@/lib/predictions';
import { bracketReducer } from '@/lib/bracket-reducer';
import { KO_ROUNDS, resolveBracket, type KoRound } from '@/lib/knockout-bracket';
import GroupPicker from './GroupPicker';
import ThirdPlacePicker from './ThirdPlacePicker';
import KnockoutBracket from './KnockoutBracket';
import StickyProgressBar, { type StepInfo } from './StickyProgressBar';
import SaveSubmitBar, { type SaveStatus } from './SaveSubmitBar';

interface BracketDto {
  id: string;
  name: string;
  predictions: Predictions;
  submitted: boolean;
}

interface Props {
  bracket: BracketDto;
  teams: Team[];
}

type KoKey = KoRound['key'];
type StepKey = 'groups' | 'thirds' | KoKey;

const STEP_ORDER: StepKey[] = ['groups', 'thirds', 'r32', 'r16', 'qf', 'sf', 'final'];

const KO_BY_KEY = Object.fromEntries(KO_ROUNDS.map((r) => [r.key, r])) as Record<KoKey, KoRound>;

const STEP_TITLES: Record<StepKey, string> = {
  groups: 'Groups',
  thirds: 'Best 3rds',
  r32: 'R32',
  r16: 'R16',
  qf: 'QF',
  sf: 'SF',
  final: 'Final',
};

const STEP_HEADINGS: Record<StepKey, string> = {
  groups: 'Group stage',
  thirds: 'Third-place race',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'The Final',
};

const KO_TARGET: Record<KoKey, number> = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 };

const KO_HINT: Record<KoKey, string> = {
  r32: 'Tap the team you think wins each tie to send them to the Round of 16. 5 pts each.',
  r16: 'Pick the 8 that reach the quarter-finals. 8 pts each.',
  qf: 'Pick the 4 that reach the semi-finals. 12 pts each.',
  sf: 'Pick the 2 that reach the Final. 18 pts each.',
  final: 'Tap your champion. 30 pts if they lift the trophy.',
};

export default function BracketBuilder({ bracket, teams }: Props) {
  const [predictions, dispatch] = useReducer(bracketReducer, bracket.predictions, (p) =>
    bracketReducer(p, { type: 'load', predictions: p }),
  );
  const [step, setStep] = useState<StepKey>('groups');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitted, setSubmitted] = useState(bracket.submitted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamsByCode = useMemo(() => new Map(teams.map((t) => [t.code, t])), [teams]);
  const resolved = useMemo(() => resolveBracket(predictions), [predictions]);

  // Debounced optimistic persistence. Local state is the source of truth;
  // the server write trails it by 800ms.
  const firstRender = useRef(true);
  const saveSeq = useRef(0);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveStatus('saving');
    const seq = ++saveSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/bracket', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bracket.id, predictions }),
        });
        if (seq !== saveSeq.current) return;
        if (!res.ok) throw new Error('save failed');
        const data = await res.json();
        setSubmitted(data.bracket.submitted);
        setSaveStatus('saved');
      } catch {
        if (seq === saveSeq.current) setSaveStatus('error');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [predictions, bracket.id]);

  const koDone = (key: KoKey): number => {
    const fills = KO_BY_KEY[key].fills;
    if (fills === 'champion') return predictions.knockout.champion ? 1 : 0;
    return predictions.knockout[fills].length;
  };

  const stepInfos: StepInfo[] = useMemo(() => {
    const groupsDone = GROUP_LETTERS.filter((l) => isGroupComplete(predictions.groups[l])).length;
    return STEP_ORDER.map((key) => {
      if (key === 'groups') return { key, title: STEP_TITLES[key], done: groupsDone, total: 12 };
      if (key === 'thirds')
        return { key, title: STEP_TITLES[key], done: predictions.thirdPlace.length, total: THIRD_PLACE_PICKS };
      return { key, title: STEP_TITLES[key], done: koDone(key), total: KO_TARGET[key] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const complete = isComplete(predictions);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', id: bracket.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'submit failed');
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const isKo = step !== 'groups' && step !== 'thirds';

  return (
    <div className="pb-28">
      <StickyProgressBar steps={stepInfos} activeKey={step} onSelect={(k) => setStep(k as StepKey)} />

      <div className="mt-3 mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-3xl leading-none">{STEP_HEADINGS[step]}</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Step {stepIndex + 1}/{STEP_ORDER.length}
        </span>
      </div>

      {submitted ? (
        <p className="mb-3 rounded-xl border border-accent/40 bg-accent/[0.08] p-3 text-sm text-accent">
          Bracket submitted. You can still tweak picks until kickoff; changing
          anything means you need to submit again.
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-xl border border-live/40 bg-live/[0.08] p-3 text-sm text-live">
          {error}
        </p>
      ) : null}

      <div key={step} className="reveal">
        {step === 'groups' ? (
          <GroupPicker
            teams={teams}
            predictions={predictions}
            onRank={(letter: GroupLetter, code: string) =>
              dispatch({ type: 'rankGroupTeam', letter, code })
            }
          />
        ) : step === 'thirds' ? (
          <ThirdPlacePicker
            teams={teams}
            predictions={predictions}
            onToggle={(code) => dispatch({ type: 'toggleThird', code })}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">{KO_HINT[step as KoKey]}</p>
            <KnockoutBracket
              matchups={resolved[step as KoKey]}
              teamsByCode={teamsByCode}
              fills={KO_BY_KEY[step as KoKey].fills}
              onPick={(fills, winner, loser) => dispatch({ type: 'pickWinner', fills, winner, loser })}
            />
          </div>
        )}
      </div>

      <SaveSubmitBar
        saveStatus={saveStatus}
        canBack={stepIndex > 0}
        canNext={stepIndex < STEP_ORDER.length - 1}
        onBack={() => setStep(STEP_ORDER[stepIndex - 1])}
        onNext={() => setStep(STEP_ORDER[stepIndex + 1])}
        showSubmit={isKo && step === 'final'}
        submitEnabled={complete}
        submitted={submitted}
        submitting={submitting}
        onSubmit={submit}
      />
    </div>
  );
}
