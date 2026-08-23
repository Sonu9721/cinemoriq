'use client';

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Film,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '../shell/dashboard-shell';
import { Drawer } from '../ui/overlays';
import { Button, Card, Skeleton, StatusBadge, cx } from '../ui/primitives';
import {
  DEMO_CAMPAIGN_ID,
  workflowStages,
  type CampaignEvent,
  type CampaignRecord,
} from './campaign-record-model';
import {
  ensureDemoCampaignRecord,
  loadCampaignRecord,
  loadLatestCampaignRecord,
  saveCampaignRecord,
} from './campaign-record-store';
import { channelLabels, objectiveLabels } from './campaign-wizard-model';
import {
  browserCampaignDraftStore,
  createStoredDraft,
} from './campaign-draft-store';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

function WorkspaceSkeleton() {
  return (
    <main
      className="workspace-main"
      id="main-content"
      aria-busy="true"
      aria-label="Loading campaign workspace"
    >
      <div className="workspace-header workspace-header--loading">
        <div className="workspace-skeleton-copy">
          <Skeleton className="workspace-skeleton-title" />
          <Skeleton className="workspace-skeleton-subtitle" />
        </div>
        <Skeleton className="workspace-skeleton-button" />
      </div>
      <Card className="workspace-workflow-card workspace-workflow-card--loading">
        <Skeleton className="workspace-skeleton-label" />
        <div className="workspace-skeleton-workflow">
          {workflowStages.map((stage) => (
            <span key={stage.title}>
              <Skeleton className="workspace-skeleton-node" />
              <Skeleton className="workspace-skeleton-line" />
            </span>
          ))}
        </div>
      </Card>
      <div className="workspace-content-grid">
        <Card className="workspace-concept-card workspace-concept-card--loading">
          <Skeleton className="workspace-skeleton-preview" />
          <div className="workspace-skeleton-summary">
            <Skeleton className="workspace-skeleton-label" />
            <Skeleton className="workspace-skeleton-copy-line" />
            <Skeleton className="workspace-skeleton-copy-line workspace-skeleton-copy-line--short" />
          </div>
        </Card>
        <Card className="workspace-log-card workspace-log-card--loading">
          <Skeleton className="workspace-skeleton-label" />
          {[0, 1, 2].map((item) => (
            <div className="workspace-skeleton-log" key={item}>
              <Skeleton className="workspace-skeleton-log-icon" />
              <span>
                <Skeleton className="workspace-skeleton-copy-line" />
                <Skeleton className="workspace-skeleton-copy-line workspace-skeleton-copy-line--short" />
              </span>
            </div>
          ))}
        </Card>
      </div>
    </main>
  );
}

function WorkspaceEmptyState({
  state,
  hasDraft,
}: {
  state: 'empty' | 'error';
  hasDraft: boolean;
}) {
  const router = useRouter();
  return (
    <main className="workspace-main workspace-main--empty" id="main-content">
      <Card className="workspace-empty-card">
        <span className="workspace-empty-card__icon" aria-hidden="true">
          {state === 'error' ? <AlertTriangle size={30} /> : <Film size={30} />}
        </span>
        <p className="workspace-eyebrow">
          {state === 'error' ? 'Workspace unavailable' : 'Campaign workspace'}
        </p>
        <h1>
          {state === 'error'
            ? 'Your local campaign data could not be opened'
            : 'No production-ready campaign yet'}
        </h1>
        <p>
          {state === 'error'
            ? 'Check this browser’s site-storage permissions, then return to campaign setup and save the brief again.'
            : 'Complete the campaign brief first. Cinemoriq will then create a local workspace record for human-reviewed orchestration.'}
        </p>
        <div className="workspace-empty-card__actions">
          <Button variant="primary" onClick={() => router.push('/campaigns/new')}>
            {state === 'error'
              ? 'Return to campaign setup'
              : hasDraft
                ? 'Resume draft'
                : 'Create campaign'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Back to Command Center
          </Button>
        </div>
      </Card>
    </main>
  );
}

function AgentWorkflow({ record }: { record: CampaignRecord }) {
  const activeStage = record.activeWorkflowStage;
  return (
    <Card className="workspace-workflow-card">
      <div className="workspace-section-header">
        <div>
          <p className="workspace-eyebrow">Local orchestration preview</p>
          <h2>Agent Workflow</h2>
        </div>
        <StatusBadge tone={record.paused ? 'warning' : 'blue'} pulse={!record.paused}>
          {record.paused ? 'Paused' : 'Concept development'}
        </StatusBadge>
      </div>

      <div
        className="workspace-workflow-progress"
        role="progressbar"
        aria-label="Campaign workflow progress"
        aria-valuemin={1}
        aria-valuemax={workflowStages.length}
        aria-valuenow={activeStage + 1}
      >
        <span style={{ width: `${(activeStage / (workflowStages.length - 1)) * 100}%` }} />
      </div>

      <ol className="workspace-workflow-list">
        {workflowStages.map((stage, index) => {
          const state =
            index < activeStage
              ? 'complete'
              : index === activeStage
                ? record.paused
                  ? 'paused'
                  : 'active'
                : index === activeStage + 1
                  ? 'queued'
                  : 'waiting';
          const stateLabel =
            state === 'complete'
              ? 'Complete'
              : state === 'active'
                ? 'Working'
                : state === 'paused'
                  ? 'Paused'
                  : state === 'queued'
                    ? 'Queued'
                    : 'Waiting';
          return (
            <li
              className={cx(
                'workspace-workflow-stage',
                `workspace-workflow-stage--${state}`,
              )}
              key={stage.title}
              aria-current={index === activeStage ? 'step' : undefined}
            >
              <span className="workspace-workflow-stage__node" aria-hidden="true">
                {state === 'complete' ? (
                  <Check size={17} strokeWidth={2.4} />
                ) : state === 'active' || state === 'paused' ? (
                  <Sparkles size={17} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="workspace-workflow-stage__copy">
                <strong>{stage.title}</strong>
                <small>{stage.agent}</small>
                <span>{stateLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function CreativeConceptCard({
  record,
  imageFailed,
  onImageError,
  onViewDetails,
}: {
  record: CampaignRecord;
  imageFailed: boolean;
  onImageError: () => void;
  onViewDetails: () => void;
}) {
  const draft = record.draft;
  const tone = draft.brandTones.length
    ? draft.brandTones.join(', ').toLowerCase()
    : 'brand-aligned';
  const mustShow = (draft.mustShow || 'the approved product story').replace(
    /[.!?]+$/,
    '',
  );
  const summary = `${draft.creativeStyle || 'Cinematic concept'} for ${draft.audienceName || 'the selected audience'}, shaped with a ${tone} tone. The preview prioritizes ${mustShow} while preserving the submitted rights and claim guardrails.`;
  const previewUnavailable = record.kind !== 'sample' || imageFailed;

  return (
    <Card className="workspace-concept-card">
      <div className="workspace-concept-visual">
        {previewUnavailable ? (
          <div
            className="workspace-concept-fallback"
            role="img"
            aria-label={
              record.kind === 'sample'
                ? 'Creative preview unavailable'
                : 'Creative preview has not been generated'
            }
          >
            <Clapperboard size={34} aria-hidden="true" />
            <span>
              {record.kind === 'sample'
                ? 'Creative preview unavailable'
                : 'Creative preview not generated'}
            </span>
          </div>
        ) : (
          <Image
            src="/neon-ascendance.webp"
            alt="Rain-lit near-future city and premium electric grand tourer for the Neon Ascendance concept"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            onError={onImageError}
          />
        )}
        <span className="workspace-concept-visual__veil" aria-hidden="true" />
        <div className="workspace-concept-overlay">
          <div className="workspace-concept-overlay__meta">
            <span>Concept A</span>
            <StatusBadge tone="blue" pulse={!record.paused}>
              {record.paused ? 'Paused' : 'Preview'}
            </StatusBadge>
          </div>
          <h2>{record.conceptTitle}</h2>
          <p>{draft.creativeEnergy || 'Precise & Restrained'} · {draft.masterDuration || '30 seconds'}</p>
        </div>
      </div>

      <div className="workspace-concept-summary">
        <div>
          <p className="workspace-eyebrow">AI Strategy Summary</p>
          <p>{summary}</p>
        </div>
        <Button variant="secondary" onClick={onViewDetails}>
          View details
        </Button>
      </div>
    </Card>
  );
}

function formatEventTime(event: CampaignEvent) {
  if (!event.occurredAt) return 'PENDING';
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(event.occurredAt)) / 60000),
  );
  if (elapsedMinutes < 1) return 'JUST NOW';
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} ${elapsedMinutes === 1 ? 'MIN' : 'MINS'} AGO`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} ${elapsedHours === 1 ? 'HOUR' : 'HOURS'} AGO`;
  }
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(event.occurredAt)).toUpperCase();
}

function ProductionLogsCard({ record }: { record: CampaignRecord }) {
  return (
    <Card className="workspace-log-card">
      <div className="workspace-section-header">
        <div>
          <p className="workspace-eyebrow">Local preview</p>
          <h2>Production Logs</h2>
        </div>
        <Clock3 size={18} aria-hidden="true" />
      </div>

      {record.events.length ? (
        <div className="workspace-log-list" role="log" aria-live="polite">
          {record.events.map((event) => (
            <article className="workspace-log-entry" key={event.id}>
              <span
                className={cx(
                  'workspace-log-entry__icon',
                  `workspace-log-entry__icon--${event.state}`,
                )}
                aria-hidden="true"
              >
                {event.state === 'complete' ? (
                  <CheckCircle2 size={17} />
                ) : event.state === 'active' ? (
                  <Sparkles size={17} />
                ) : (
                  <Clock3 size={17} />
                )}
              </span>
              <div>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
                <time dateTime={event.occurredAt ?? undefined}>
                  {formatEventTime(event)}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-log-empty">
          <Clock3 size={22} aria-hidden="true" />
          <strong>No production events yet</strong>
          <p>Events will appear after a human starts the local workflow preview.</p>
        </div>
      )}

      <div className="workspace-trust-note">
        <ShieldCheck size={17} aria-hidden="true" />
        <p>
          No external AI model is running. These deterministic states demonstrate
          the future orchestration experience.
        </p>
      </div>
    </Card>
  );
}

export function CampaignWorkspaceScreen() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [record, setRecord] = useState<CampaignRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        setHasSavedDraft(Boolean(browserCampaignDraftStore.load()));
        const searchParams = new URLSearchParams(window.location.search);
        const demoRequested = searchParams.get('demo') === DEMO_CAMPAIGN_ID;
        const requestedCampaignId = searchParams.get('campaign');
        const loaded = demoRequested
          ? ensureDemoCampaignRecord()
          : requestedCampaignId
            ? loadCampaignRecord(requestedCampaignId)
            : loadLatestCampaignRecord();
        setRecord(loaded);
        setLoadState(loaded ? 'ready' : 'empty');
      } catch {
        setRecord(null);
        setLoadState('error');
      }
    }, 180);
    return () => window.clearTimeout(loadTimer);
  }, []);

  const closeDetails = useCallback(() => setDetailsOpen(false), []);

  function togglePaused() {
    if (!record) return;
    const nextPaused = !record.paused;
    const workflowEvent: CampaignEvent = {
      id: `${nextPaused ? 'paused' : 'resumed'}-${Date.now()}`,
      title: nextPaused ? 'Local workflow paused' : 'Local workflow resumed',
      detail: nextPaused
        ? 'No preview stages will advance until a human resumes the campaign.'
        : 'Concept development is active again in this local preview.',
      occurredAt: new Date().toISOString(),
      state: nextPaused ? 'waiting' : 'active',
    };
    const nextRecord: CampaignRecord = {
      ...record,
      paused: nextPaused,
      events: [workflowEvent, ...record.events].slice(0, 20),
    };

    try {
      const saved = saveCampaignRecord(nextRecord);
      setRecord(saved);
      setNotice(
        nextPaused
          ? 'Campaign preview paused on this device.'
          : 'Campaign preview resumed on this device.',
      );
    } catch {
      setNotice(
        'This browser could not save the workflow state. Check site-storage permissions and try again.',
      );
    }
  }

  if (loadState === 'loading') {
    return (
      <DashboardShell activeSection="Campaigns">
        <WorkspaceSkeleton />
      </DashboardShell>
    );
  }

  if (loadState === 'empty' || loadState === 'error' || !record) {
    return (
      <DashboardShell activeSection="Campaigns">
        <WorkspaceEmptyState
          state={loadState === 'error' ? 'error' : 'empty'}
          hasDraft={hasSavedDraft}
        />
      </DashboardShell>
    );
  }

  const draft = record.draft;
  const selectedChannels = draft.channels
    .map((channel) => channelLabels[channel] ?? channel)
    .join(', ');
  const reviewConfirmations = [
    draft.confirmAssetRights && 'asset rights',
    draft.confirmNoUnauthorizedIdentity && 'identity safeguards',
    draft.confirmHumanReview && 'human review',
  ].filter(Boolean) as string[];
  const allReviewConfirmationsComplete = reviewConfirmations.length === 3;

  function editBrief() {
    try {
      browserCampaignDraftStore.save(createStoredDraft(draft, 6, 6));
      closeDetails();
      router.push('/campaigns/new');
    } catch {
      setNotice(
        'This browser could not prepare the selected brief for editing. Check site-storage permissions and try again.',
      );
    }
  }

  return (
    <DashboardShell activeSection="Campaigns">
      <main className="workspace-main" id="main-content">
        <header className="workspace-header">
          <div className="workspace-header__copy">
            <div className="workspace-header__meta">
              <StatusBadge tone="blue">
                {record.kind === 'sample' ? 'Sample workspace' : 'Campaign workspace'}
              </StatusBadge>
              <span>Human review required</span>
            </div>
            <h1>{draft.campaignName || 'Untitled campaign'}</h1>
            <p>Production Pipeline Orchestration</p>
          </div>
          <div className="workspace-header__actions">
            <Button
              variant="secondary"
              leadingIcon={record.paused ? <Play size={16} /> : <Pause size={16} />}
              onClick={togglePaused}
            >
              {record.paused ? 'Resume campaign' : 'Pause campaign'}
            </Button>
            <Button
              variant="primary"
              disabled
              title="Analytics arrives in Phase 6"
            >
              View analytics · Phase 6
            </Button>
          </div>
        </header>

        <p className="workspace-live-notice" aria-live="polite">
          {notice}
        </p>

        <AgentWorkflow record={record} />

        <div className="workspace-content-grid">
          <CreativeConceptCard
            record={record}
            imageFailed={imageFailed}
            onImageError={() => setImageFailed(true)}
            onViewDetails={() => setDetailsOpen(true)}
          />
          <ProductionLogsCard record={record} />
        </div>
      </main>

      <Drawer
        open={detailsOpen}
        onClose={closeDetails}
        eyebrow="Concept A · Human review"
        title={record.conceptTitle}
      >
        <div className="workspace-details">
          <div className="workspace-details__hero">
            <span className="workspace-details__icon">
              <Target size={19} aria-hidden="true" />
            </span>
            <div>
              <strong>{objectiveLabels[draft.objective]}</strong>
              <p>{draft.valueProposition || 'No value proposition provided.'}</p>
            </div>
          </div>

          <dl className="workspace-details__list">
            <div>
              <dt><Users size={15} /> Audience</dt>
              <dd>{draft.audienceName || 'Not provided'} · {draft.primaryMarkets.join(', ') || 'No market selected'}</dd>
            </div>
            <div>
              <dt><Film size={15} /> Creative direction</dt>
              <dd>{draft.creativeStyle || 'Not provided'} · {draft.creativeEnergy || 'Not provided'} · {draft.masterDuration || 'Not provided'}</dd>
            </div>
            <div>
              <dt><Clapperboard size={15} /> Distribution</dt>
              <dd>{selectedChannels || 'Not provided'} · {draft.campaignDuration || 'No duration selected'}</dd>
            </div>
            <div>
              <dt><ShieldCheck size={15} /> Guardrails</dt>
              <dd>{draft.brandAvoid || 'No additional exclusions provided.'}</dd>
            </div>
          </dl>

          <div className="workspace-details__review-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              {allReviewConfirmationsComplete
                ? 'Asset rights, identity safeguards, and human review were confirmed when this brief was created. Final claims still require review before release.'
                : `${reviewConfirmations.length ? `Confirmed: ${reviewConfirmations.join(', ')}. ` : ''}Missing safeguards must be completed before any production release.`}
            </p>
          </div>

          <div className="workspace-details__actions">
            <Button variant="secondary" onClick={editBrief}>
              Edit brief
            </Button>
            <Button variant="primary" onClick={closeDetails}>
              Keep concept in review
            </Button>
          </div>
        </div>
      </Drawer>
    </DashboardShell>
  );
}
