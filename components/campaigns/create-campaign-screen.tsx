'use client';

import {
  ArrowRight,
  Check,
  Eye,
  Rocket,
  TrendingUp,
  UserRoundPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CinemoriqMark } from '../brand/cinemoriq-mark';
import { Button, cx } from '../ui/primitives';

type ObjectiveId = 'sales' | 'leads' | 'launch' | 'awareness';

type Objective = {
  id: ObjectiveId;
  title: string;
  description: string;
  icon: LucideIcon;
};

type CampaignStep = {
  title: string;
  description: string;
};

const objectives: Objective[] = [
  {
    id: 'sales',
    title: 'Increase Sales',
    description:
      'Drive direct conversions, focus on product features, urgency, and strong calls to action.',
    icon: TrendingUp,
  },
  {
    id: 'leads',
    title: 'Generate Leads',
    description:
      'Capture contact information through compelling value propositions, gated content, or sign-ups.',
    icon: UserRoundPlus,
  },
  {
    id: 'launch',
    title: 'Launch a Product',
    description:
      'Create anticipation, highlight innovation, and introduce a new offering to the market.',
    icon: Rocket,
  },
  {
    id: 'awareness',
    title: 'Build Awareness',
    description:
      'Maximize reach and brand recall with emotionally resonant, highly shareable creative content.',
    icon: Eye,
  },
];

const campaignSteps: CampaignStep[] = [
  { title: 'Intent', description: 'Campaign objective' },
  { title: 'Audience', description: 'Target demographics' },
  { title: 'Product', description: "What you're selling" },
  { title: 'Brand', description: 'Identity & Tone' },
  { title: 'Channels', description: 'Distribution strategy' },
  { title: 'Creative Direction', description: 'Visual styling' },
  { title: 'Generate', description: 'AI synthesis' },
];

function CampaignProgress() {
  return (
    <>
      <aside className="campaign-progress" aria-label="Campaign creation progress">
        <p className="campaign-progress__eyebrow">Campaign Creation</p>
        <ol className="campaign-progress__list">
          {campaignSteps.map((step, index) => (
            <li
              className={cx(
                'campaign-progress__step',
                index === 0 && 'campaign-progress__step--active',
              )}
              key={step.title}
              aria-current={index === 0 ? 'step' : undefined}
            >
              <span className="campaign-progress__dot" aria-hidden="true" />
              <span className="campaign-progress__copy">
                <strong>
                  {index + 1}. {step.title}
                </strong>
                <span>{step.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="campaign-progress-compact" aria-label="Campaign creation progress">
        <div className="campaign-progress-compact__copy">
          <span>Step 1 of 7</span>
          <strong>Intent</strong>
        </div>
        <div
          className="campaign-progress-compact__track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={7}
          aria-valuenow={1}
          aria-label="Campaign creation: step 1 of 7"
        >
          <span />
        </div>
      </div>
    </>
  );
}

function ObjectiveCard({
  objective,
  selected,
  onSelect,
}: {
  objective: Objective;
  selected: boolean;
  onSelect: (id: ObjectiveId) => void;
}) {
  const Icon = objective.icon;

  return (
    <label
      className={cx(
        'objective-card',
        selected && 'objective-card--selected',
      )}
    >
      <input
        className="sr-only"
        type="radio"
        name="campaign-objective"
        value={objective.id}
        checked={selected}
        onChange={() => onSelect(objective.id)}
      />
      <span className="objective-card__glow" aria-hidden="true" />
      <span className="objective-card__content">
        <span className="objective-card__icon" aria-hidden="true">
          <Icon size={24} strokeWidth={1.75} />
        </span>
        <span className="objective-card__title">{objective.title}</span>
        <span className="objective-card__description">{objective.description}</span>
      </span>
    </label>
  );
}

export function CreateCampaignScreen() {
  const router = useRouter();
  const [selectedObjective, setSelectedObjective] =
    useState<ObjectiveId>('sales');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const [continuing, setContinuing] = useState(false);
  const [notice, setNotice] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const continueTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (continueTimerRef.current) window.clearTimeout(continueTimerRef.current);
    };
  }, []);

  function saveDraft() {
    if (savingState === 'saving') return;
    setSavingState('saving');
    setNotice('');
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setSavingState('saved');
      setNotice('Campaign draft saved.');
    }, 700);
  }

  function continueToAudience() {
    if (!selectedObjective || continuing) return;
    setContinuing(true);
    setNotice('');
    if (continueTimerRef.current) window.clearTimeout(continueTimerRef.current);
    continueTimerRef.current = window.setTimeout(() => {
      setContinuing(false);
      setNotice('Intent saved. Audience setup is the next build phase.');
    }, 850);
  }

  return (
    <div className="campaign-wizard-shell">
      <a className="skip-link" href="#campaign-intent">
        Skip to campaign intent
      </a>

      <header className="campaign-topbar">
        <div className="campaign-topbar__left">
          <Button
            className="campaign-topbar__close"
            variant="ghost"
            size="icon"
            aria-label="Close campaign creation"
            onClick={() => router.push('/')}
          >
            <X size={21} strokeWidth={1.6} />
          </Button>
          <span className="campaign-topbar__divider" aria-hidden="true" />
          <CinemoriqMark className="brand-mark--campaign" />
          <span className="sr-only">Cinemoriq</span>
        </div>

        <button
          className="campaign-save"
          type="button"
          onClick={saveDraft}
          disabled={savingState === 'saving'}
        >
          {savingState === 'saving' ? (
            <span className="campaign-save__loader" aria-hidden="true" />
          ) : savingState === 'saved' ? (
            <Check size={15} aria-hidden="true" />
          ) : null}
          {savingState === 'saving'
            ? 'Saving…'
            : savingState === 'saved'
              ? 'Saved'
              : 'Save Draft'}
        </button>
      </header>

      <div className="campaign-wizard-body">
        <CampaignProgress />

        <main className="campaign-intent" id="campaign-intent">
          <div className="campaign-intent__inner">
            <header className="campaign-intent__header">
              <h1>Define Campaign Intent</h1>
              <p>
                Select the primary objective for this campaign. Our AI models will
                tune the creative outputs to maximize this specific goal.
              </p>
            </header>

            <fieldset className="objective-grid">
              <legend className="sr-only">Choose the primary campaign objective</legend>
              {objectives.map((objective) => (
                <ObjectiveCard
                  key={objective.id}
                  objective={objective}
                  selected={selectedObjective === objective.id}
                  onSelect={(id) => {
                    setSelectedObjective(id);
                    setNotice('');
                    setSavingState('idle');
                  }}
                />
              ))}
            </fieldset>

            <footer className="campaign-intent__footer">
              <Button
                className="campaign-cancel"
                variant="ghost"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
              <Button
                className="campaign-continue"
                variant="primary"
                trailingIcon={
                  continuing ? (
                    <span className="campaign-save__loader" aria-hidden="true" />
                  ) : (
                    <ArrowRight size={18} strokeWidth={1.7} />
                  )
                }
                onClick={continueToAudience}
                disabled={!selectedObjective || continuing}
              >
                {continuing ? 'Preparing Audience' : 'Continue to Audience'}
              </Button>
            </footer>
            <p className="campaign-notice" aria-live="polite">
              {notice}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
