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
import GroupPicker from './GroupPicker';
import ThirdPlacePicker from './ThirdPlacePicker';
import FullBracket from './FullBracket';
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

type StepKey = 'groups' | 'thirds' | 'knockout';

const STEP_ORDER: StepKey[] = ['groups', 'thirds', 'knockout'];

const STEP_TITLES: Record<StepKey, string> = {
  groups: 'Groups',
  thirds: 'Best 3rds',
  knockout: 'Bracket',
};

const STEP_HEADINGS: Record<StepKey, string> = {
  groups: 'Group stage',
  thirds: 'Third-place race',
  knockout: 'Knockout bracket',
};

// 16 + 8 + 4 + 2 + 1 ties decide the whole knockout.
const KO_TOTAL = 31;

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

  const koDecided =
    predictions.knockout.r16.length +
    predictions.knockout.qf.length +
    predictions.knockout.sf.length +
    predictions.knockout.final.length +
    (predictions.knockout.champion ? 1 : 0);

  const stepInfos: StepInfo[] = useMemo(() => {
    const groupsDone = GROUP_LETTERS.filter((l) => isGroupComplete(predictions.groups[l])).length;
    return [
      { key: 'groups', title: STEP_TITLES.groups, done: groupsDone, total: 12 },
      { key: 'thirds', title: STEP_TITLES.thirds, done: predictions.thirdPlace.length, total: THIRD_PLACE_PICKS },
      { key: 'knockout', title: STEP_TITLES.knockout, done: koDecided, total: KO_TOTAL },
    ];
  }, [predictions, koDecided]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const complete = isComplete(predictions);
  const thirdsReady =
    GROUP_LETTERS.every((l) => isGroupComplete(predictions.groups[l])) &&
    predictions.thirdPlace.length === THIRD_PLACE_PICKS;

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
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              Tap the winner of each tie and they slide into the next round to
              face the neighbouring winner. Drag sideways to follow it all the
              way to the trophy.
            </p>
            {!thirdsReady ? (
              <p className="rounded-xl border border-gold/30 bg-gold/[0.08] p-3 text-sm text-gold">
                Finish your group ranks and best-thirds first to seed the 32 teams.
              </p>
            ) : null}
            <FullBracket
              predictions={predictions}
              teamsByCode={teamsByCode}
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
        showSubmit={step === 'knockout'}
        submitEnabled={complete}
        submitted={submitted}
        submitting={submitting}
        onSubmit={submit}
      />
    </div>
  );
}
