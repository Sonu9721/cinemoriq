'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Film,
  Layers3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  DEMO_CAMPAIGN_ID,
  type CampaignRecord,
} from '../campaigns/campaign-record-model';
import {
  ensureDemoCampaignRecord,
  loadCampaignRecord,
  loadLatestCampaignRecord,
} from '../campaigns/campaign-record-store';
import { DashboardShell } from '../shell/dashboard-shell';
import { Drawer, Modal } from '../ui/overlays';
import {
  Button,
  Card,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  cx,
} from '../ui/primitives';
import {
  createStudioSession,
  getStudioDuration,
  type StudioApprovalState,
  type StudioScene,
  type StudioSession,
  type StudioVersion,
} from './studio-model';
import { loadStudioSession, saveStudioSession } from './studio-store';
import { ModelAwareGenerationControls } from './model-aware-controls';
import {
  getResolutionLabel,
  getVideoModel,
  validateGenerationConfig,
} from './video-model-catalog';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type BadgeTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger';

const styleOptions: StudioScene['visualStyle'][] = [
  'Cinematic',
  'Minimal',
  'Noir',
  'Documentary',
];
const lightingOptions: StudioScene['lighting'][] = [
  'High Contrast / Low Key',
  'Soft Diffused',
  'Neon / Cyberpunk',
  'Natural Daylight',
];

function selectedVersion(scene: StudioScene) {
  return (
    scene.versions.find((version) => version.id === scene.selectedVersionId) ??
    scene.versions[scene.versions.length - 1]
  );
}

function formatTimecode(seconds: number) {
  const clamped = Math.max(0, seconds);
  const whole = Math.floor(clamped);
  const frames = Math.min(23, Math.floor((clamped - whole) * 24));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return [hours, minutes, secs, frames]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function formatSceneRange(scene: StudioScene) {
  return `${formatTimecode(scene.startSeconds).slice(0, 8)} – ${formatTimecode(
    scene.startSeconds + scene.durationSeconds,
  ).slice(0, 8)}`;
}

function versionStatus(version: StudioVersion): {
  label: string;
  tone: BadgeTone;
} {
  if (version.generationState === 'queued') {
    return { label: 'Queued locally', tone: 'blue' };
  }
  if (version.generationState === 'generating') {
    return { label: `Simulating · ${version.generationProgress}%`, tone: 'blue' };
  }
  if (version.generationState === 'failed') {
    return { label: 'Simulation failed', tone: 'danger' };
  }
  if (version.generationState === 'cancelled') {
    return { label: 'Simulation cancelled', tone: 'warning' };
  }
  const approvalLabels: Record<
    StudioApprovalState,
    { label: string; tone: BadgeTone }
  > = {
    draft: { label: 'Draft', tone: 'neutral' },
    'in-review': { label: 'Ready for review', tone: 'blue' },
    approved: { label: 'Approved', tone: 'success' },
    'changes-requested': { label: 'Changes requested', tone: 'warning' },
  };
  return approvalLabels[version.approvalState];
}

function StudioSkeleton() {
  return (
    <main
      className="studio-main studio-main--loading"
      id="main-content"
      aria-label="Loading AI Creative Studio"
      aria-busy="true"
    >
      <section className="studio-skeleton-panel studio-skeleton-scenes">
        <Skeleton className="studio-skeleton-heading" />
        {[0, 1, 2].map((item) => (
          <Skeleton className="studio-skeleton-scene" key={item} />
        ))}
      </section>
      <section className="studio-skeleton-center">
        <Skeleton className="studio-skeleton-preview" />
        <Skeleton className="studio-skeleton-timeline" />
      </section>
      <section className="studio-skeleton-panel studio-skeleton-director">
        <Skeleton className="studio-skeleton-heading" />
        <Skeleton className="studio-skeleton-field" />
        <Skeleton className="studio-skeleton-field" />
        <Skeleton className="studio-skeleton-field" />
      </section>
    </main>
  );
}

function StudioEmptyState({ state }: { state: 'empty' | 'error' }) {
  const router = useRouter();
  return (
    <main className="studio-main studio-main--empty" id="main-content">
      <Card className="studio-empty-card">
        <span className="studio-empty-card__icon" aria-hidden="true">
          {state === 'error' ? <AlertTriangle size={30} /> : <Film size={30} />}
        </span>
        <p className="workspace-eyebrow">
          {state === 'error' ? 'Studio unavailable' : 'AI Creative Studio'}
        </p>
        <h1>
          {state === 'error'
            ? 'Your Studio session could not be opened'
            : 'No concept is ready for Studio'}
        </h1>
        <p>
          {state === 'error'
            ? 'The campaign link or local session data is unavailable. Return to the campaign workspace and open Studio again.'
            : 'Open a specific campaign workspace first, then send its approved direction into this scene-based production workspace.'}
        </p>
        <div className="studio-empty-card__actions">
          <Button variant="primary" onClick={() => router.push('/campaigns/workspace')}>
            Return to campaign workspace
          </Button>
          <Button variant="secondary" onClick={() => router.push('/campaigns/new')}>
            Create campaign
          </Button>
        </div>
      </Card>
    </main>
  );
}

function SceneRail({
  scenes,
  selectedSceneId,
  brokenMedia,
  guardrailLabel,
  onSelect,
}: {
  scenes: StudioScene[];
  selectedSceneId: string;
  brokenMedia: Set<string>;
  guardrailLabel: string;
  onSelect: (sceneId: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = Math.min(scenes.length - 1, index + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = Math.max(0, index - 1);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = scenes.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onSelect(scenes[nextIndex].id);
    const nextButton = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="option"]',
    )[nextIndex];
    window.requestAnimationFrame(() => nextButton?.focus());
  }

  return (
    <aside className="studio-scenes-panel" aria-labelledby="studio-scenes-title">
      <div className="studio-panel-heading">
        <div>
          <p className="workspace-eyebrow">Storyboard</p>
          <h2 id="studio-scenes-title">Scenes</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add scene (coming with production backend)"
          disabled
          title="Scene creation requires a production backend"
        >
          <Plus size={17} />
        </Button>
      </div>
      <div className="studio-scene-list" role="listbox" ref={listRef}>
        {scenes.map((scene, index) => {
          const version = selectedVersion(scene);
          const active = scene.id === selectedSceneId;
          const mediaUnavailable = !version.mediaSrc || brokenMedia.has(version.id);
          const status = versionStatus(version);
          return (
            <button
              className={cx('studio-scene-item', active && 'studio-scene-item--active')}
              key={scene.id}
              role="option"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(scene.id)}
              onKeyDown={(event) => handleKeyboard(event, index)}
            >
              <span className="studio-scene-thumb">
                {mediaUnavailable ? (
                  <Film size={19} aria-hidden="true" />
                ) : (
                  <Image
                    src={version.mediaSrc as string}
                    alt=""
                    fill
                    sizes="80px"
                  />
                )}
              </span>
              <span className="studio-scene-copy">
                <span className="studio-scene-index">Scene {String(scene.number).padStart(2, '0')}</span>
                <strong>{scene.title}</strong>
                <small>{formatSceneRange(scene)}</small>
                <span className={cx('studio-scene-state', `studio-scene-state--${status.tone}`)}>
                  {status.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="studio-scene-guardrail">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{guardrailLabel}</span>
      </div>
    </aside>
  );
}

function StudioPreview({
  scene,
  version,
  playing,
  broken,
  onTogglePlay,
  onSelectVersion,
  onImageError,
}: {
  scene: StudioScene;
  version: StudioVersion;
  playing: boolean;
  broken: boolean;
  onTogglePlay: () => void;
  onSelectVersion: (versionId: string) => void;
  onImageError: () => void;
}) {
  const status = versionStatus(version);
  const activeGeneration = ['queued', 'generating'].includes(
    version.generationState,
  );
  const model = getVideoModel(scene.generationConfig.modelKey);
  const resolutionLabel =
    scene.generationConfig.resolution === 'standard'
      ? '≤1080p'
      : getResolutionLabel(
          scene.generationConfig.modelKey,
          scene.generationConfig.resolution,
        ).split(' · ')[0];

  return (
    <section className="studio-player" aria-labelledby="studio-preview-title">
      <div className="studio-player__frame">
        {version.mediaSrc && !broken ? (
          <Image
            src={version.mediaSrc}
            alt={version.mediaAlt}
            fill
            priority
            sizes="(max-width: 1199px) 100vw, 60vw"
            onError={onImageError}
          />
        ) : (
          <div className="studio-player__fallback" role="img" aria-label="Preview unavailable">
            <Film size={34} aria-hidden="true" />
            <strong>Preview unavailable</strong>
            <span>No generated media is connected to this version.</span>
          </div>
        )}
        <span className="studio-player__veil" aria-hidden="true" />
        <div className="studio-player__topline">
          <div>
            <StatusBadge tone="blue">Scene {String(scene.number).padStart(2, '0')}</StatusBadge>
            <StatusBadge tone={status.tone} pulse={activeGeneration}>
              V{version.number} · {status.label}
            </StatusBadge>
          </div>
          <div className="studio-player__format" aria-label="Preview format">
            <span>{resolutionLabel}</span>
            <span>
              {scene.generationConfig.aspectRatio === 'source'
                ? 'Source ratio'
                : scene.generationConfig.aspectRatio}
            </span>
          </div>
        </div>

        <button
          className="studio-player__play"
          aria-label={playing ? 'Pause local preview' : 'Play local preview'}
          onClick={onTogglePlay}
        >
          {playing ? <Pause size={24} fill="currentColor" /> : <Play size={25} fill="currentColor" />}
        </button>

        {activeGeneration ? (
          <div className="studio-generation-overlay" aria-live="polite">
            <Sparkles size={19} aria-hidden="true" />
            <strong>{status.label}</strong>
            <div
              className="studio-generation-progress"
              role="progressbar"
              aria-label="Local generation simulation progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={version.generationProgress}
            >
              <span style={{ width: `${version.generationProgress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="studio-player__caption">
          <p className="workspace-eyebrow" id="studio-preview-title">
            {version.illustrative
              ? 'Illustrative concept still · not model output'
              : 'Scene preview'}
          </p>
          <strong>{scene.title}</strong>
          <span>{scene.description}</span>
        </div>
      </div>
      <div className="studio-version-rail" aria-label="Scene versions">
        <span>Versions</span>
        <div>
          {scene.versions.map((item) => (
            <button
              key={item.id}
              className={cx(
                'studio-version-button',
                item.id === version.id && 'studio-version-button--active',
                item.approvalState === 'approved' && 'studio-version-button--approved',
              )}
              aria-pressed={item.id === version.id}
              onClick={() => onSelectVersion(item.id)}
            >
              V{item.number}
              {item.approvalState === 'approved' ? <Check size={13} aria-label="Approved" /> : null}
            </button>
          ))}
        </div>
        <span className="studio-version-rail__truth">
          {model.providerLabel} preset · {model.name}
        </span>
      </div>
    </section>
  );
}

function StudioTimeline({
  session,
  selectedSceneId,
  playing,
  onTogglePlay,
  onSeek,
  onSelectScene,
  onZoom,
}: {
  session: StudioSession;
  selectedSceneId: string;
  playing: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSelectScene: (sceneId: string) => void;
  onZoom: (zoom: number) => void;
}) {
  const duration = getStudioDuration(session);
  const canvasRef = useRef<HTMLDivElement>(null);
  const playheadPercent = duration ? (session.playheadSeconds / duration) * 100 : 0;

  function seekFromPointer(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    onSeek(ratio * duration);
  }

  return (
    <section className="studio-timeline" aria-labelledby="studio-timeline-title">
      <div className="studio-timeline__toolbar">
        <div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={playing ? 'Pause timeline preview' : 'Play timeline preview'}
            onClick={onTogglePlay}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </Button>
          <code aria-label="Current timeline timecode">
            {formatTimecode(session.playheadSeconds)}
          </code>
        </div>
        <h2 id="studio-timeline-title">Timeline</h2>
        <div className="studio-timeline__zoom">
          <ZoomOut size={15} aria-hidden="true" />
          <input
            type="range"
            min={75}
            max={180}
            value={session.zoom}
            aria-label="Timeline zoom"
            onChange={(event) => onZoom(Number(event.target.value))}
          />
          <ZoomIn size={15} aria-hidden="true" />
        </div>
      </div>

      <label className="sr-only" htmlFor="studio-playhead-slider">
        Timeline playhead position
      </label>
      <input
        className="sr-only"
        id="studio-playhead-slider"
        type="range"
        min={0}
        max={duration}
        step={1 / 24}
        value={Math.min(duration, session.playheadSeconds)}
        onChange={(event) => onSeek(Number(event.target.value))}
      />

      <div className="studio-timeline__scroll">
        <div
          className="studio-timeline__canvas"
          ref={canvasRef}
          style={{ minWidth: `${Math.max(800, session.zoom * 8)}px` }}
          onClick={(event) => seekFromPointer(event.clientX)}
        >
          <div className="studio-timeline__ticks" aria-hidden="true">
            {Array.from({ length: 11 }, (_, index) => (
              <span key={index} style={{ left: `${index * 10}%` }}>
                {Math.round((duration * index) / 10)}s
              </span>
            ))}
          </div>
          <span className="studio-track-label studio-track-label--video">V1</span>
          <div className="studio-video-lane">
            {session.scenes.map((scene) => (
              <button
                key={scene.id}
                className={cx(
                  'studio-timeline-clip',
                  scene.id === selectedSceneId && 'studio-timeline-clip--selected',
                )}
                style={{
                  left: `${(scene.startSeconds / duration) * 100}%`,
                  width: `${(scene.durationSeconds / duration) * 100}%`,
                }}
                aria-pressed={scene.id === selectedSceneId}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectScene(scene.id);
                  onSeek(scene.startSeconds);
                }}
              >
                <span>{String(scene.number).padStart(2, '0')}</span>
                <strong>{scene.title}</strong>
              </button>
            ))}
          </div>
          <span className="studio-track-label studio-track-label--audio">A1</span>
          <div className="studio-audio-lane" aria-label="Reference audio lane">
            <span className="studio-audio-clip">
              {Array.from({ length: 46 }, (_, index) => (
                <i
                  key={index}
                  style={{ height: `${18 + ((index * 17) % 70)}%` }}
                />
              ))}
            </span>
          </div>
          <span
            className="studio-playhead"
            style={{ left: `${playheadPercent}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}

function AIDirectorPanel({
  controlIdPrefix,
  scene,
  version,
  campaignPaused,
  guardrailsReady,
  onUpdateScene,
  onGenerate,
  onCancel,
  onRequestChanges,
  onApprove,
}: {
  controlIdPrefix: string;
  scene: StudioScene;
  version: StudioVersion;
  campaignPaused: boolean;
  guardrailsReady: boolean;
  onUpdateScene: (patch: Partial<StudioScene>) => void;
  onGenerate: (retryCurrent?: boolean) => void;
  onCancel: () => void;
  onRequestChanges: () => void;
  onApprove: () => void;
}) {
  const running = ['queued', 'generating'].includes(version.generationState);
  const locked = running || campaignPaused || !guardrailsReady;
  const generationErrors = validateGenerationConfig(
    scene.generationConfig,
    scene.prompt,
  );
  const canReview =
    version.generationState === 'ready' &&
    Boolean(version.mediaSrc) &&
    !campaignPaused;

  return (
    <div className="studio-director-content">
      <div className="studio-panel-heading studio-director-heading">
        <div>
          <p className="workspace-eyebrow">Local production controls</p>
          <h2><WandSparkles size={19} /> AI Director</h2>
        </div>
        <StatusBadge tone={running ? 'blue' : 'neutral'} pulse={running}>
          {running ? 'Simulating' : 'Catalog ready'}
        </StatusBadge>
      </div>

      <div className="studio-director-scroll">
        <div className="studio-truth-note">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            <strong>Primary gateway + one direct exception.</strong> Veo, Kling,
            Seedance, and H3 use fal.ai. Hailuo 02 uses a separate server-only
            MiniMax Platform key; no secret is stored in this browser.
          </span>
        </div>

        <Textarea
          id={`${controlIdPrefix}-scene-prompt-${scene.id}`}
          label="Scene prompt"
          value={scene.prompt}
          maxLength={1200}
          disabled={locked}
          onChange={(event) => onUpdateScene({ prompt: event.target.value })}
          hint={`${scene.prompt.length}/1200 · editing an approved scene returns it to review`}
        />

        <fieldset className="studio-control-group" disabled={locked}>
          <legend>Visual style</legend>
          <div className="studio-choice-grid">
            {styleOptions.map((style) => (
              <button
                type="button"
                key={style}
                className={cx(
                  'studio-choice-chip',
                  scene.visualStyle === style && 'studio-choice-chip--active',
                )}
                aria-pressed={scene.visualStyle === style}
                onClick={() => onUpdateScene({ visualStyle: style })}
              >
                {style}
              </button>
            ))}
          </div>
        </fieldset>

        <label
          className="studio-range-field"
          htmlFor={`${controlIdPrefix}-scene-lens-${scene.id}`}
        >
          <span>
            <strong>Camera lens</strong>
            <output>{scene.lensMm}mm</output>
          </span>
          <input
            id={`${controlIdPrefix}-scene-lens-${scene.id}`}
            type="range"
            min={14}
            max={200}
            value={scene.lensMm}
            disabled={locked}
            onChange={(event) => onUpdateScene({ lensMm: Number(event.target.value) })}
          />
          <small><span>14mm</span><span>200mm</span></small>
        </label>

        <Select
          id={`${controlIdPrefix}-scene-lighting-${scene.id}`}
          label="Lighting"
          value={scene.lighting}
          disabled={locked}
          onChange={(event) =>
            onUpdateScene({ lighting: event.target.value as StudioScene['lighting'] })
          }
        >
          {lightingOptions.map((lighting) => (
            <option key={lighting}>{lighting}</option>
          ))}
        </Select>

        <ModelAwareGenerationControls
          sceneId={`${controlIdPrefix}-${scene.id}`}
          config={scene.generationConfig}
          disabled={locked}
          validationErrors={generationErrors}
          onChange={(generationConfig) => onUpdateScene({ generationConfig })}
        />

        {!guardrailsReady ? (
          <p className="studio-lock-notice" role="alert">
            Rights, identity, and human-review confirmations must be completed in
            the campaign brief.
          </p>
        ) : campaignPaused ? (
          <p className="studio-lock-notice" role="alert">
            This campaign is paused. Resume it in the campaign workspace to edit or
            review scenes.
          </p>
        ) : null}
      </div>

      <div className="studio-director-actions">
        {running ? (
          <Button variant="secondary" size="lg" leadingIcon={<X size={17} />} onClick={onCancel}>
            Cancel local simulation
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            leadingIcon={<Sparkles size={17} />}
            disabled={locked || generationErrors.length > 0}
            onClick={() =>
              onGenerate(
                version.generationState === 'failed' ||
                  version.generationState === 'cancelled',
              )
            }
          >
            {version.generationState === 'failed' || version.generationState === 'cancelled'
              ? 'Retry local simulation'
              : 'Generate local variant'}
          </Button>
        )}
        <div>
          <Button
            variant="secondary"
            leadingIcon={<RotateCcw size={16} />}
            disabled={!canReview}
            onClick={onRequestChanges}
          >
            Request changes
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<CheckCircle2 size={16} />}
            disabled={!canReview || version.approvalState === 'approved'}
            onClick={onApprove}
          >
            {version.approvalState === 'approved' ? 'Approved' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreativeStudioScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCampaignId = searchParams.get('campaign');
  const demoRequested = searchParams.get('demo') === DEMO_CAMPAIGN_ID;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [record, setRecord] = useState<CampaignRecord | null>(null);
  const [session, setSession] = useState<StudioSession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [directorOpen, setDirectorOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [brokenMedia, setBrokenMedia] = useState<Set<string>>(new Set());
  const queueTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const generationLockRef = useRef(false);
  const hydratedRef = useRef(false);
  const playbackDuration = session ? getStudioDuration(session) : 0;
  const playbackCampaignId = session?.campaignId;

  const clearGenerationTimers = useCallback(() => {
    if (queueTimerRef.current !== null) window.clearTimeout(queueTimerRef.current);
    if (progressTimerRef.current !== null) window.clearInterval(progressTimerRef.current);
    queueTimerRef.current = null;
    progressTimerRef.current = null;
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const loadedRecord = demoRequested
          ? ensureDemoCampaignRecord()
          : requestedCampaignId
            ? loadCampaignRecord(requestedCampaignId)
            : loadLatestCampaignRecord();
        if (!loadedRecord) {
          setLoadState('empty');
          return;
        }
        const storedSession = loadStudioSession(loadedRecord.id);
        const nextSession = storedSession ?? createStudioSession(loadedRecord);
        if (!storedSession) saveStudioSession(nextSession);
        setRecord(loadedRecord);
        setSession(nextSession);
        hydratedRef.current = true;
        setLoadState('ready');
      } catch {
        setLoadState('error');
      }
    }, 180);
    return () => window.clearTimeout(loadTimer);
  }, [demoRequested, requestedCampaignId]);

  useEffect(() => {
    if (!hydratedRef.current || !session) return;
    const saveTimer = window.setTimeout(() => {
      try {
        saveStudioSession(session);
      } catch {
        setNotice(
          'Studio changes could not be saved. Check browser storage permissions before continuing.',
        );
      }
    }, 320);
    return () => window.clearTimeout(saveTimer);
  }, [session]);

  useEffect(() => {
    if (!playing || !playbackCampaignId) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) / 1000;
      previous = now;
      setSession((current) => {
        if (!current) return current;
        const nextPlayhead = Math.min(
          playbackDuration,
          current.playheadSeconds + elapsed,
        );
        if (nextPlayhead >= playbackDuration) {
          window.setTimeout(() => setPlaying(false), 0);
        }
        return { ...current, playheadSeconds: nextPlayhead };
      });
    }, 80);
    return () => window.clearInterval(timer);
  }, [playing, playbackCampaignId, playbackDuration]);

  useEffect(() => {
    return () => {
      clearGenerationTimers();
      generationLockRef.current = false;
    };
  }, [clearGenerationTimers]);

  const scene = useMemo(
    () =>
      session?.scenes.find((item) => item.id === session.selectedSceneId) ??
      session?.scenes[0] ??
      null,
    [session],
  );
  const version = scene ? selectedVersion(scene) : null;
  const duration = playbackDuration;
  const guardrailsReady = Boolean(
    record?.draft.confirmAssetRights &&
      record.draft.confirmNoUnauthorizedIdentity &&
      record.draft.confirmHumanReview,
  );
  const allApproved = Boolean(
    session?.scenes.every(
      (item) => selectedVersion(item).approvalState === 'approved',
    ),
  );

  const updateVersion = useCallback(
    (
      sceneId: string,
      versionId: string,
      updater: (current: StudioVersion) => StudioVersion,
    ) => {
      setSession((current) => {
        if (!current) return current;
        return {
          ...current,
          scenes: current.scenes.map((item) =>
            item.id !== sceneId
              ? item
              : {
                  ...item,
                  versions: item.versions.map((candidate) =>
                    candidate.id === versionId ? updater(candidate) : candidate,
                  ),
                },
          ),
        };
      });
    },
    [],
  );

  function selectScene(sceneId: string) {
    setSession((current) =>
      current
        ? {
            ...current,
            selectedSceneId: sceneId,
            playheadSeconds:
              current.scenes.find((item) => item.id === sceneId)?.startSeconds ??
              current.playheadSeconds,
          }
        : current,
    );
  }

  function selectSceneVersion(versionId: string) {
    if (!scene) return;
    setSession((current) =>
      current
        ? {
            ...current,
            scenes: current.scenes.map((item) =>
              item.id === scene.id ? { ...item, selectedVersionId: versionId } : item,
            ),
          }
        : current,
    );
  }

  function updateScene(patch: Partial<StudioScene>) {
    if (!scene || record?.paused) return;
    const invalidatesApproval = version?.approvalState === 'approved';
    setSession((current) =>
      current
        ? {
            ...current,
            scenes: current.scenes.map((item) => {
              if (item.id !== scene.id) return item;
              return {
                ...item,
                ...patch,
                versions: item.versions.map((candidate) =>
                  candidate.id === item.selectedVersionId &&
                  candidate.approvalState === 'approved'
                    ? { ...candidate, approvalState: 'in-review', reviewedAt: null }
                    : candidate,
                ),
              };
            }),
          }
        : current,
    );
    setNotice(
      invalidatesApproval
        ? 'Scene direction updated locally. The selected version returned to review.'
        : 'Scene direction updated locally on this device.',
    );
  }

  function togglePlayback() {
    if (!session) return;
    if (!playing && session.playheadSeconds >= duration) {
      setSession({ ...session, playheadSeconds: 0 });
    }
    setPlaying((current) => !current);
  }

  function startGeneration(retryCurrent = false) {
    if (
      !scene ||
      !version ||
      record?.paused ||
      !guardrailsReady ||
      generationLockRef.current
    ) {
      return;
    }
    generationLockRef.current = true;
    clearGenerationTimers();
    const sceneId = scene.id;
    let targetVersionId = version.id;

    if (retryCurrent) {
      updateVersion(sceneId, targetVersionId, (current) => ({
        ...current,
        generationState: 'queued',
        generationProgress: 0,
        approvalState: 'draft',
        reviewedAt: null,
      }));
    } else {
      const versionNumber = Math.max(...scene.versions.map((item) => item.number)) + 1;
      targetVersionId = `${scene.id}-v${versionNumber}`;
      const nextVersion: StudioVersion = {
        id: targetVersionId,
        number: versionNumber,
        createdAt: new Date().toISOString(),
        mediaSrc: version.mediaSrc,
        mediaAlt: version.mediaAlt,
        illustrative: true,
        generationState: 'queued',
        generationProgress: 0,
        approvalState: 'draft',
        reviewedAt: null,
      };
      setSession((current) =>
        current
          ? {
              ...current,
              scenes: current.scenes.map((item) =>
                item.id === sceneId
                  ? {
                      ...item,
                      selectedVersionId: targetVersionId,
                      versions: [...item.versions, nextVersion].slice(-12),
                    }
                  : item,
              ),
            }
          : current,
      );
    }
    const selectedModel = getVideoModel(scene.generationConfig.modelKey);
    setNotice(
      `Local workflow simulation queued for ${selectedModel.name}. No paid ${selectedModel.providerLabel} request was sent.`,
    );

    queueTimerRef.current = window.setTimeout(() => {
      updateVersion(sceneId, targetVersionId, (current) => ({
        ...current,
        generationState: 'generating',
        generationProgress: 8,
      }));
      let simulatedProgress = 8;
      progressTimerRef.current = window.setInterval(() => {
        simulatedProgress = Math.min(100, simulatedProgress + 8);
        const complete = simulatedProgress >= 100;
        updateVersion(sceneId, targetVersionId, (current) => {
          return {
            ...current,
            generationState: complete ? 'ready' : 'generating',
            generationProgress: simulatedProgress,
            approvalState: complete ? 'in-review' : current.approvalState,
          };
        });
        if (complete) {
          clearGenerationTimers();
          generationLockRef.current = false;
          setNotice(
            'Local orchestration preview is ready for human review. No external media was generated.',
          );
        }
      }, 180);
    }, 420);
  }

  function cancelGeneration() {
    if (!scene || !version) return;
    clearGenerationTimers();
    generationLockRef.current = false;
    updateVersion(scene.id, version.id, (current) => ({
      ...current,
      generationState: 'cancelled',
      approvalState: 'draft',
    }));
    setNotice('Local generation simulation cancelled. No external job was running.');
  }

  function requestChanges() {
    if (
      !scene ||
      !version ||
      version.generationState !== 'ready' ||
      !version.mediaSrc ||
      record?.paused
    ) {
      return;
    }
    updateVersion(scene.id, version.id, (current) => ({
      ...current,
      approvalState: 'changes-requested',
      reviewedAt: new Date().toISOString(),
    }));
    setNotice(`Changes requested for ${scene.title}, version ${version.number}.`);
  }

  function confirmApproval() {
    if (!scene || !version || version.generationState !== 'ready' || record?.paused) {
      return;
    }
    updateVersion(scene.id, version.id, (current) => ({
      ...current,
      approvalState: 'approved',
      reviewedAt: new Date().toISOString(),
    }));
    setApprovalOpen(false);
    setNotice(`Human approval recorded locally for ${scene.title}, version ${version.number}.`);
  }

  if (loadState === 'loading') {
    return (
      <DashboardShell activeSection="Studio" immersive>
        <StudioSkeleton />
      </DashboardShell>
    );
  }

  if (loadState === 'empty' || loadState === 'error' || !record || !session || !scene || !version) {
    return (
      <DashboardShell activeSection="Studio" immersive>
        <StudioEmptyState state={loadState === 'error' ? 'error' : 'empty'} />
      </DashboardShell>
    );
  }

  const workspaceHref =
    record.kind === 'sample'
      ? `/campaigns/workspace?demo=${DEMO_CAMPAIGN_ID}`
      : `/campaigns/workspace?campaign=${encodeURIComponent(record.id)}`;

  const directorProps = {
    scene,
    version,
    campaignPaused: record.paused,
    guardrailsReady,
    onUpdateScene: updateScene,
    onGenerate: startGeneration,
    onCancel: cancelGeneration,
    onRequestChanges: requestChanges,
    onApprove: () => setApprovalOpen(true),
  };

  return (
    <DashboardShell activeSection="Studio" immersive>
      <main className="studio-main" id="main-content">
        <header className="studio-header">
          <div className="studio-header__copy">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to campaign workspace"
              onClick={() => router.push(workspaceHref)}
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <div className="studio-header__meta">
                <StatusBadge tone="blue">AI Creative Studio</StatusBadge>
                <span>{record.kind === 'sample' ? 'Sample session' : 'Local session'}</span>
              </div>
              <h1>{session.campaignName}</h1>
            </div>
          </div>
          <div className="studio-header__actions">
            <span className="studio-header__save" aria-live="polite">
              {notice || 'Changes save on this device'}
            </span>
            <Button
              className="studio-director-trigger"
              variant="secondary"
              leadingIcon={<SlidersHorizontal size={16} />}
              onClick={() => setDirectorOpen(true)}
            >
              AI Director
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Layers3 size={16} />}
              disabled
              title={allApproved ? 'Export backend is not connected' : 'Approve every scene before export'}
            >
              Export locked
            </Button>
          </div>
        </header>

        <div className="studio-editor">
          <SceneRail
            scenes={session.scenes}
            selectedSceneId={scene.id}
            brokenMedia={brokenMedia}
            guardrailLabel={`${record.draft.peoplePolicy || 'Human review required'} · no unauthorized identity`}
            onSelect={selectScene}
          />

          <div className="studio-center-column">
            <StudioPreview
              scene={scene}
              version={version}
              playing={playing}
              broken={brokenMedia.has(version.id)}
              onTogglePlay={togglePlayback}
              onSelectVersion={selectSceneVersion}
              onImageError={() =>
                setBrokenMedia((current) => new Set(current).add(version.id))
              }
            />
            <StudioTimeline
              session={session}
              selectedSceneId={scene.id}
              playing={playing}
              onTogglePlay={togglePlayback}
              onSeek={(seconds) =>
                setSession((current) =>
                  current
                    ? {
                        ...current,
                        playheadSeconds: Math.min(duration, Math.max(0, seconds)),
                      }
                    : current,
                )
              }
              onSelectScene={selectScene}
              onZoom={(zoom) =>
                setSession((current) => (current ? { ...current, zoom } : current))
              }
            />
          </div>

          <aside className="studio-director-panel">
            <AIDirectorPanel controlIdPrefix="desktop" {...directorProps} />
          </aside>
        </div>
      </main>

      <Drawer
        open={directorOpen}
        onClose={() => setDirectorOpen(false)}
        eyebrow={`Scene ${String(scene.number).padStart(2, '0')}`}
        title="AI Director"
      >
        <div className="studio-director-drawer">
          <AIDirectorPanel controlIdPrefix="drawer" {...directorProps} />
        </div>
      </Drawer>

      <Modal
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        eyebrow="Human approval"
        title={`Approve ${scene.title} · V${version.number}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApprovalOpen(false)}>
              Keep in review
            </Button>
            <Button variant="primary" leadingIcon={<Check size={16} />} onClick={confirmApproval}>
              Record approval
            </Button>
          </>
        }
      >
        <div className="studio-approval-dialog">
          <span><CheckCircle2 size={22} aria-hidden="true" /></span>
          <div>
            <strong>This approval is explicit and version-specific.</strong>
            <p>
              Cinemoriq will store it on this device with a timestamp. It does not
              publish, export, or certify the illustrative media for production use.
            </p>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
