'use client';

import {
  AudioLines,
  CircleDollarSign,
  FileOutput,
  Image as ImageIcon,
  Info,
  KeyRound,
  Link2,
  Plus,
  Trash2,
  Video,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { Button, Input, Select, StatusBadge, Textarea, cx } from '../ui/primitives';
import {
  VIDEO_MODEL_CATALOG,
  countReferences,
  estimateGenerationCost,
  formatGenerationDuration,
  getAspectOptions,
  getModelMode,
  getResolutionOptions,
  getResolutionLabel,
  getVideoModel,
  reconcileGenerationConfig,
  type StudioGenerationConfig,
  type StudioGenerationDuration,
  type StudioGenerationMode,
  type StudioVideoModelKey,
} from './video-model-catalog';

type ReferenceKind = 'image' | 'video' | 'audio';

const referenceCopy: Record<
  ReferenceKind,
  { singular: string; plural: string; icon: typeof ImageIcon }
> = {
  image: { singular: 'Image reference', plural: 'images', icon: ImageIcon },
  video: { singular: 'Video reference', plural: 'videos', icon: Video },
  audio: { singular: 'Audio reference', plural: 'audio clips', icon: AudioLines },
};

function ReferenceUrlList({
  kind,
  values,
  max,
  disabled,
  onChange,
}: {
  kind: ReferenceKind;
  values: string[];
  max: number;
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  const copy = referenceCopy[kind];
  const Icon = copy.icon;
  const rows = values.length ? values : [''];
  const completed = values.filter((value) => value.trim()).length;

  function update(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    onChange(next);
  }

  function remove(index: number) {
    onChange(rows.filter((_, candidateIndex) => candidateIndex !== index));
  }

  return (
    <div className="studio-reference-list">
      <div className="studio-reference-list__heading">
        <span><Icon size={14} /> {copy.singular}</span>
        <small>{completed}/{max} {copy.plural}</small>
      </div>
      {rows.map((value, index) => (
        <div className="studio-reference-row" key={`${kind}-${index}`}>
          <Input
            id={`studio-${kind}-reference-${index}`}
            type="url"
            inputMode="url"
            aria-label={`${copy.singular} ${index + 1} URL`}
            placeholder="https://cdn.example.com/asset"
            value={value}
            disabled={disabled}
            onChange={(event) => update(index, event.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${copy.singular.toLowerCase()} ${index + 1}`}
            disabled={disabled || (rows.length === 1 && !value)}
            onClick={() => remove(index)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button
        className="studio-reference-add"
        variant="quiet"
        size="sm"
        leadingIcon={<Plus size={14} />}
        disabled={
          disabled ||
          rows.length >= max ||
          !rows[rows.length - 1]?.trim()
        }
        onClick={() => onChange([...rows, ''])}
      >
        Add {copy.singular.toLowerCase()}
      </Button>
    </div>
  );
}

export function ModelAwareGenerationControls({
  sceneId,
  config,
  disabled,
  validationErrors,
  onChange,
}: {
  sceneId: string;
  config: StudioGenerationConfig;
  disabled: boolean;
  validationErrors: string[];
  onChange: (
    config: StudioGenerationConfig,
    storyboardDuration?: number,
  ) => void;
}) {
  const model = getVideoModel(config.modelKey);
  const mode = getModelMode(config.modelKey, config.mode);
  const aspectOptions = getAspectOptions(config.modelKey, config.mode);
  const estimate = estimateGenerationCost(config);
  const referenceCount = countReferences(config);
  const resolutionOptions = getResolutionOptions(
    config.modelKey,
    config.duration,
    config.mode,
  );

  function update(patch: Partial<StudioGenerationConfig>) {
    onChange({ ...config, ...patch });
  }

  function selectModel(modelKey: StudioVideoModelKey) {
    const next = reconcileGenerationConfig(config, modelKey);
    onChange(
      next,
      typeof next.duration === 'number' ? next.duration : undefined,
    );
  }

  function selectMode(nextMode: StudioGenerationMode) {
    const next = reconcileGenerationConfig(config, config.modelKey, nextMode);
    onChange(
      next,
      typeof next.duration === 'number' ? next.duration : undefined,
    );
  }

  function selectDuration(value: string) {
    const duration: StudioGenerationDuration =
      value === 'auto' ? 'auto' : Number(value);
    const next = reconcileGenerationConfig(
      { ...config, duration },
      config.modelKey,
      config.mode,
    );
    onChange(
      next,
      typeof duration === 'number' ? duration : undefined,
    );
  }

  return (
    <div className="studio-model-controls">
      <Select
        id={`scene-model-${sceneId}`}
        label="Generation model"
        value={config.modelKey}
        disabled={disabled}
        onChange={(event) =>
          selectModel(event.target.value as StudioVideoModelKey)
        }
        hint="Primary fal.ai gateway · optional MiniMax Direct connection"
      >
        {VIDEO_MODEL_CATALOG.map((candidate) => (
          <option key={candidate.key} value={candidate.key}>
            {candidate.name} · {candidate.maker}
          </option>
        ))}
      </Select>

      <div className="studio-model-card">
        <div className="studio-model-card__heading">
          <div>
            <small>{model.maker}</small>
            <strong>{model.name}</strong>
          </div>
          <StatusBadge tone={model.provider === 'fal-ai' ? 'blue' : 'warning'}>
            {model.providerLabel}
          </StatusBadge>
        </div>
        <p>{model.description}</p>
        <div className="studio-capability-list" aria-label={`${model.name} capabilities`}>
          {model.capabilities.map((capability) => (
            <span key={capability}>{capability}</span>
          ))}
        </div>
        <small className="studio-model-card__fit">
          <Info size={13} /> Best for: {model.recommendedFor}
        </small>
      </div>

      {model.provider === 'minimax-direct' ? (
        <div className="studio-provider-notice">
          <KeyRound size={17} aria-hidden="true" />
          <div>
            <strong>Separate MiniMax Platform connection required</strong>
            <p>
              This model uses the server-only {model.providerSecretName} secret.
              Hailuo website welcome credits cannot authorize API renders.
            </p>
            <Link href="/settings">Open connection settings</Link>
          </div>
        </div>
      ) : null}

      <Select
        id={`scene-mode-${sceneId}`}
        label="Creation mode"
        value={config.mode}
        disabled={disabled}
        onChange={(event) =>
          selectMode(event.target.value as StudioGenerationMode)
        }
        hint={mode.description}
      >
        {model.modes.map((candidate) => (
          <option key={candidate.key} value={candidate.key}>
            {candidate.label}
          </option>
        ))}
      </Select>

      <div className="studio-control-pair">
        <Select
          id={`scene-duration-${sceneId}`}
          label="Duration"
          value={String(config.duration)}
          disabled={disabled}
          onChange={(event) => selectDuration(event.target.value)}
        >
          {model.durationOptions.map((duration) => (
            <option key={duration} value={duration}>
              {formatGenerationDuration(duration)}
            </option>
          ))}
        </Select>
        <Select
          id={`scene-resolution-${sceneId}`}
          label="Resolution"
          value={config.resolution}
          disabled={disabled || resolutionOptions.length === 1}
          onChange={(event) => update({ resolution: event.target.value })}
        >
          {resolutionOptions.map((resolution) => (
            <option key={resolution.value} value={resolution.value}>
              {resolution.label}
            </option>
          ))}
        </Select>
      </div>

      <Select
        id={`scene-aspect-${sceneId}`}
        label="Aspect ratio"
        value={config.aspectRatio}
        disabled={disabled || aspectOptions.length === 1}
        onChange={(event) => update({ aspectRatio: event.target.value })}
        hint={
          config.aspectRatio === 'source'
            ? 'Output follows the uploaded start frame.'
            : undefined
        }
      >
        {aspectOptions.map((aspect) => (
          <option key={aspect.value} value={aspect.value}>
            {aspect.label}
          </option>
        ))}
      </Select>

      <div className="studio-audio-control">
        <span className="studio-audio-control__icon"><Volume2 size={16} /></span>
        <span>
          <strong>Native audio</strong>
          <small>{model.audioDescription}</small>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={config.audioEnabled}
          className={cx(
            'studio-audio-switch',
            config.audioEnabled && 'studio-audio-switch--active',
          )}
          disabled={disabled || model.audio !== 'optional'}
          onClick={() => update({ audioEnabled: !config.audioEnabled })}
        >
          <span aria-hidden="true" />
          {model.audio === 'required'
            ? 'Always on'
            : config.audioEnabled
              ? 'On'
              : 'Off'}
        </button>
      </div>

      {mode.requiresStartImage ? (
        <div className="studio-keyframe-fields">
          <Input
            id={`scene-start-image-${sceneId}`}
            label="Start frame URL"
            type="url"
            inputMode="url"
            placeholder="https://cdn.example.com/start-frame.webp"
            value={config.startImageUrl}
            disabled={disabled}
            onChange={(event) => update({ startImageUrl: event.target.value })}
            hint="Public HTTPS image URL · upload storage comes in the backend phase"
          />
          {mode.requiresEndImage || config.mode === 'image-to-video' ? (
            <Input
              id={`scene-end-image-${sceneId}`}
              label={mode.requiresEndImage ? 'End frame URL' : 'End frame URL · optional'}
              type="url"
              inputMode="url"
              placeholder="https://cdn.example.com/end-frame.webp"
              value={config.endImageUrl}
              disabled={disabled}
              onChange={(event) => update({ endImageUrl: event.target.value })}
            />
          ) : null}
        </div>
      ) : null}

      {config.mode === 'reference-to-video' ? (
        <details className="studio-reference-box" open>
          <summary>
            <span><Link2 size={15} /> Reference inputs</span>
            <small>{referenceCount}/{mode.references.total}</small>
          </summary>
          <p>{mode.references.note}</p>
          {mode.references.images > 0 ? (
            <ReferenceUrlList
              kind="image"
              values={config.referenceImageUrls}
              max={mode.references.images}
              disabled={disabled}
              onChange={(referenceImageUrls) => update({ referenceImageUrls })}
            />
          ) : null}
          {mode.references.videos > 0 ? (
            <ReferenceUrlList
              kind="video"
              values={config.referenceVideoUrls}
              max={mode.references.videos}
              disabled={disabled}
              onChange={(referenceVideoUrls) => update({ referenceVideoUrls })}
            />
          ) : null}
          {mode.references.audio > 0 ? (
            <ReferenceUrlList
              kind="audio"
              values={config.referenceAudioUrls}
              max={mode.references.audio}
              disabled={disabled}
              onChange={(referenceAudioUrls) => update({ referenceAudioUrls })}
            />
          ) : null}
        </details>
      ) : null}

      {model.advancedFields.length ? (
        <details className="studio-advanced-controls">
          <summary>Advanced model controls</summary>
          <div>
            {model.advancedFields.includes('negative-prompt') ? (
              <Textarea
                id={`scene-negative-prompt-${sceneId}`}
                label="Negative prompt"
                value={config.negativePrompt}
                maxLength={1200}
                disabled={disabled}
                onChange={(event) => update({ negativePrompt: event.target.value })}
                placeholder="Blur, distortion, unwanted text…"
              />
            ) : null}
            {model.advancedFields.includes('shot-type') ? (
              <Select
                id={`scene-shot-type-${sceneId}`}
                label="Shot structure"
                value={config.shotType}
                disabled={disabled}
                onChange={(event) =>
                  update({
                    shotType: event.target.value as StudioGenerationConfig['shotType'],
                  })
                }
              >
                <option value="customize">Customize from prompt</option>
                <option value="intelligent">Intelligent multi-shot</option>
              </Select>
            ) : null}
            {model.advancedFields.includes('bitrate-mode') ? (
              <Select
                id={`scene-bitrate-${sceneId}`}
                label="Bitrate"
                value={config.bitrateMode}
                disabled={disabled}
                onChange={(event) =>
                  update({
                    bitrateMode: event.target.value as StudioGenerationConfig['bitrateMode'],
                  })
                }
              >
                <option value="standard">Standard</option>
                <option value="high">High · larger file</option>
              </Select>
            ) : null}
            {model.advancedFields.includes('prompt-expansion') ? (
              <Select
                id={`scene-prompt-expansion-${sceneId}`}
                label="Prompt expansion"
                value={config.promptExpansionMode}
                disabled={disabled}
                onChange={(event) =>
                  update({
                    promptExpansionMode:
                      event.target.value as StudioGenerationConfig['promptExpansionMode'],
                  })
                }
              >
                <option value="disabled">Disabled</option>
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="quality">Quality</option>
              </Select>
            ) : null}
            {model.advancedFields.includes('seed') ? (
              <Input
                id={`scene-seed-${sceneId}`}
                label="Seed · optional"
                inputMode="numeric"
                pattern="[0-9]*"
                value={config.seed}
                disabled={disabled}
                onChange={(event) =>
                  update({ seed: event.target.value.replace(/\D/g, '').slice(0, 18) })
                }
                hint="Reuse a seed for controlled iteration; exact frames can still vary."
              />
            ) : null}
          </div>
        </details>
      ) : null}

      {model.resolutionNote ? (
        <p className="studio-model-note"><Info size={14} /> {model.resolutionNote}</p>
      ) : null}

      <div className="studio-output-spec" aria-label="Requested output specification">
        <span><small>Duration</small><strong>{formatGenerationDuration(config.duration)}</strong></span>
        <span><small>Resolution</small><strong>{getResolutionLabel(config.modelKey, config.resolution)}</strong></span>
        <span><small>Aspect</small><strong>{config.aspectRatio === 'source' ? 'Source' : config.aspectRatio}</strong></span>
        <span><small>Audio</small><strong>{config.audioEnabled ? (model.audio === 'required' ? 'Stereo' : 'On') : 'Off'}</strong></span>
        <span><small>References</small><strong>{referenceCount}/{mode.references.total || 0}</strong></span>
        <span><small>Estimate</small><strong>{estimate.label}</strong></span>
      </div>

      <div className="studio-price-card">
        <span><CircleDollarSign size={17} /></span>
        <div>
          <strong>{model.pricingLabel}</strong>
          <p>{estimate.note}</p>
          <small>
            Pricing checked {model.pricingVerifiedAt} · final {model.providerLabel} charge is authoritative.
          </small>
        </div>
      </div>

      <div className="studio-output-metadata">
        <span><FileOutput size={15} /> Expected output metadata</span>
        <div>
          {model.outputFields.map((field) => <small key={field}>{field}</small>)}
        </div>
        <code>{mode.endpointId}</code>
      </div>

      {validationErrors.length ? (
        <div className="studio-config-errors" role="alert">
          <strong>Complete before {model.providerLabel} generation</strong>
          <ul>
            {validationErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : (
        <div className="studio-config-ready">
          <FileOutput size={15} /> Model configuration is valid for the selected {model.providerLabel} endpoint.
        </div>
      )}
    </div>
  );
}
