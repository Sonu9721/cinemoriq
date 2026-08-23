'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Rocket,
  TrendingUp,
  UserRoundPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CinemoriqMark } from '../brand/cinemoriq-mark';
import { Button, cx } from '../ui/primitives';
import {
  AudienceStep,
  BrandStep,
  ChannelsStep,
  CreativeDirectionStep,
  GenerationLoading,
  GenerationSuccess,
  GenerateStep,
  ProductStep,
} from './campaign-step-panels';
import {
  campaignSteps,
  validateCampaignStep,
  type CampaignDraft,
  type ObjectiveId,
} from './campaign-wizard-model';
import { useCampaignWizard } from './use-campaign-wizard';

type Objective = {
  id: ObjectiveId;
  title: string;
  description: string;
  icon: LucideIcon;
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

const stepCopy = [
  {
    title: 'Define Campaign Intent',
    description:
      'Select the primary objective for this campaign. Our AI models will tune the creative outputs to maximize this specific goal.',
  },
  {
    title: 'Define Target Audience',
    description:
      'Give this campaign one clear audience so every message and visual can stay focused.',
  },
  {
    title: 'Define the Offer',
    description:
      'Explain what you are promoting, why it matters, and what the audience should do next.',
  },
  {
    title: 'Set Brand Guardrails',
    description:
      'Define the voice and boundaries every campaign output must respect.',
  },
  {
    title: 'Choose Campaign Channels',
    description:
      'Select where the campaign will appear and identify the placement that matters most.',
  },
  {
    title: 'Direct the Creative',
    description:
      'Set the visual language and production boundaries before the brief is created.',
  },
  {
    title: 'Review & Generate Brief',
    description:
      'Confirm the inputs below. Cinemoriq will create a campaign brief—not publish or spend media.',
  },
];

const nextStepLabels = [
  'Audience',
  'Product',
  'Brand',
  'Channels',
  'Creative Direction',
  'Review',
];

function CampaignProgress({
  currentStep,
  furthestStep,
  generated,
  draft,
  onNavigate,
}: {
  currentStep: number;
  furthestStep: number;
  generated: boolean;
  draft: CampaignDraft;
  onNavigate: (step: number) => void;
}) {
  return (
    <>
      <aside className="campaign-progress" aria-label="Campaign creation progress">
        <p className="campaign-progress__eyebrow">Campaign Creation</p>
        <ol className="campaign-progress__list">
          {campaignSteps.map((step, index) => {
            const active = index === currentStep;
            const completed =
              (generated && index === 6) ||
              (index < furthestStep &&
                (index === 0 ||
                  Object.keys(validateCampaignStep(index, draft)).length === 0));
            const navigable = index <= furthestStep && !active;
            return (
              <li
                className={cx(
                  'campaign-progress__step',
                  active && 'campaign-progress__step--active',
                  completed && 'campaign-progress__step--completed',
                  navigable && 'campaign-progress__step--navigable',
                )}
                key={step.title}
              >
                <button
                  className="campaign-progress__button"
                  type="button"
                  aria-current={active ? 'step' : undefined}
                  disabled={!navigable}
                  onClick={() => onNavigate(index)}
                >
                  <span className="campaign-progress__dot" aria-hidden="true">
                    {completed ? <Check size={13} strokeWidth={2.6} /> : null}
                  </span>
                  <span className="campaign-progress__copy">
                    <strong>
                      {index + 1}. {step.title}
                    </strong>
                    <span>{step.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="campaign-progress-compact" aria-label="Campaign creation progress">
        <div className="campaign-progress-compact__copy">
          <span>Step {currentStep + 1} of 7</span>
          <strong>{campaignSteps[currentStep].title}</strong>
        </div>
        <div
          className="campaign-progress-compact__track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={7}
          aria-valuenow={currentStep + 1}
          aria-label={`Campaign creation: step ${currentStep + 1} of 7`}
        >
          <span style={{ width: `${((currentStep + 1) / 7) * 100}%` }} />
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    draft,
    currentStep,
    furthestStep,
    errors,
    saveStatus,
    transitionStatus,
    notice,
    generated,
    generatedCampaignId,
    updateField,
    saveDraft,
    continueToNextStep,
    goBack,
    goToStep,
    generateBrief,
    resetWizard,
    setGenerated,
  } = useCampaignWizard();

  const errorCount = Object.keys(errors).length;
  const isTransitioning = transitionStatus !== 'idle';

  useEffect(() => {
    if (currentStep === 0) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => headingRef.current?.focus(), 50);
  }, [currentStep]);

  useEffect(() => {
    if (errorCount === 0) return;
    window.setTimeout(() => {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      );
      (firstInvalid ?? errorSummaryRef.current)?.focus();
    }, 40);
  }, [errorCount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentStep === 6) {
      generateBrief();
      return;
    }
    continueToNextStep();
  }

  function saveAndExit() {
    if (saveDraft()) router.push('/');
  }

  function renderStep() {
    if (currentStep === 0) {
      return (
        <fieldset className="objective-grid">
          <legend className="sr-only">Choose the primary campaign objective</legend>
          {objectives.map((objective) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              selected={draft.objective === objective.id}
              onSelect={(id) => updateField('objective', id)}
            />
          ))}
        </fieldset>
      );
    }

    if (currentStep === 1) {
      return <AudienceStep draft={draft} errors={errors} updateField={updateField} />;
    }
    if (currentStep === 2) {
      return <ProductStep draft={draft} errors={errors} updateField={updateField} />;
    }
    if (currentStep === 3) {
      return <BrandStep draft={draft} errors={errors} updateField={updateField} />;
    }
    if (currentStep === 4) {
      return <ChannelsStep draft={draft} errors={errors} updateField={updateField} />;
    }
    if (currentStep === 5) {
      return (
        <CreativeDirectionStep
          draft={draft}
          errors={errors}
          updateField={updateField}
        />
      );
    }
    return (
      <GenerateStep
        draft={draft}
        errors={errors}
        updateField={updateField}
        onEditStep={goToStep}
      />
    );
  }

  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Save failed'
          : 'Save Draft';

  const continueLabel =
    currentStep === 6
      ? transitionStatus === 'generating'
        ? 'Generating Brief'
        : 'Generate Campaign Brief'
      : currentStep === 5
        ? 'Review Campaign'
        : transitionStatus === 'continuing'
        ? `Preparing ${nextStepLabels[currentStep]}`
        : `Continue to ${nextStepLabels[currentStep]}`;

  return (
    <div className="campaign-wizard-shell">
      <a className="skip-link" href="#campaign-step">
        Skip to campaign setup
      </a>

      <header className="campaign-topbar">
        <div className="campaign-topbar__left">
          <Button
            className="campaign-topbar__close"
            variant="ghost"
            size="icon"
            aria-label="Close campaign creation"
            onClick={saveAndExit}
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
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? (
            <span className="campaign-save__loader" aria-hidden="true" />
          ) : saveStatus === 'saved' ? (
            <Check size={15} aria-hidden="true" />
          ) : null}
          {saveLabel}
        </button>
      </header>

      <div className="campaign-wizard-body">
        <CampaignProgress
          currentStep={currentStep}
          furthestStep={furthestStep}
          generated={generated}
          draft={draft}
          onNavigate={goToStep}
        />

        <main
          className={cx(
            'campaign-intent',
            currentStep > 0 && 'campaign-intent--workflow',
            generated && 'campaign-intent--success',
          )}
          id="campaign-step"
        >
          <div
            className={cx(
              'campaign-intent__inner',
              currentStep > 0 && 'campaign-intent__inner--workflow',
            )}
          >
            {generated ? (
              <GenerationSuccess
                draft={draft}
                onEdit={() => {
                  setGenerated(false);
                  goToStep(6);
                }}
                onStartNew={resetWizard}
                onOpenWorkspace={() => {
                  if (generatedCampaignId) {
                    router.push(
                      `/campaigns/workspace?campaign=${encodeURIComponent(generatedCampaignId)}`,
                    );
                  }
                }}
                workspaceReady={Boolean(generatedCampaignId)}
              />
            ) : (
              <>
                <header className="campaign-intent__header">
                  <h1 ref={headingRef} tabIndex={-1}>
                    {stepCopy[currentStep].title}
                  </h1>
                  <p>{stepCopy[currentStep].description}</p>
                </header>

                {errorCount > 0 ? (
                  <div
                    className="wizard-error-summary"
                    role="alert"
                    tabIndex={-1}
                    ref={errorSummaryRef}
                  >
                    <span>{errorCount}</span>
                    <p>
                      <strong>Review the highlighted fields.</strong>
                      <small>Your entered information is still preserved.</small>
                    </p>
                  </div>
                ) : null}

                <form
                  className="campaign-step-form"
                  onSubmit={handleSubmit}
                  noValidate
                  ref={formRef}
                >
                  {transitionStatus === 'generating' ? (
                    <GenerationLoading />
                  ) : (
                    renderStep()
                  )}

                  {transitionStatus !== 'generating' ? (
                    <footer className="campaign-intent__footer">
                      {currentStep === 0 ? (
                        <Button
                          className="campaign-cancel"
                          variant="ghost"
                          onClick={saveAndExit}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          className="campaign-cancel"
                          variant="ghost"
                          leadingIcon={<ArrowLeft size={17} strokeWidth={1.7} />}
                          onClick={goBack}
                          disabled={isTransitioning}
                        >
                          Back
                        </Button>
                      )}
                      <Button
                        className="campaign-continue"
                        variant="primary"
                        type="submit"
                        trailingIcon={
                          isTransitioning ? (
                            <span className="campaign-save__loader" aria-hidden="true" />
                          ) : (
                            <ArrowRight size={18} strokeWidth={1.7} />
                          )
                        }
                        disabled={isTransitioning}
                      >
                        {continueLabel}
                      </Button>
                    </footer>
                  ) : null}
                </form>
                <p
                  className={cx(
                    'campaign-notice',
                    currentStep > 0 && 'campaign-notice--workflow',
                  )}
                  aria-live="polite"
                >
                  {notice}
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
