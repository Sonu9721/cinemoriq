'use client';

import {
  CheckCircle2,
  FileAudio2,
  FileImage,
  FileVideo2,
  LoaderCircle,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  FalUploadInitiationResponse,
  GenerationApiError,
  StudioAssetKind,
} from '../../lib/generation-contract';
import { cinemoriqFetch } from '../../lib/client-auth';
import type { StudioVideoModelKey } from './video-model-catalog';
import { Button, Input, cx } from '../ui/primitives';

const assetRules: Record<
  StudioAssetKind,
  {
    accept: string;
    maximumBytes: number;
    help: string;
    icon: typeof FileImage;
  }
> = {
  image: {
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    maximumBytes: 8 * 1024 * 1024,
    help: 'JPEG, PNG or WebP · max 8 MB',
    icon: FileImage,
  },
  video: {
    accept: 'video/mp4,video/quicktime,.mp4,.mov',
    maximumBytes: 50 * 1024 * 1024,
    help: 'MP4 or MOV · 2–15s · max 50 MB',
    icon: FileVideo2,
  },
  audio: {
    accept: 'audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav',
    maximumBytes: 15 * 1024 * 1024,
    help: 'MP3 or WAV · 2–15s · max 15 MB',
    icon: FileAudio2,
  },
};

type UploadState =
  | { phase: 'idle' }
  | { phase: 'preparing'; fileName: string }
  | { phase: 'uploading'; fileName: string; byteSize: number }
  | {
      phase: 'ready';
      fileName: string;
      byteSize: number;
      expiresAt: string;
    }
  | { phase: 'error'; message: string };

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function mimeTypeFor(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    }[extension ?? ''] ?? ''
  );
}

async function mediaDuration(file: File, kind: StudioAssetKind) {
  if (kind === 'image') return null;
  const url = URL.createObjectURL(file);
  const element = document.createElement(kind === 'video' ? 'video' : 'audio');
  element.preload = 'metadata';
  try {
    return await new Promise<number>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('Media metadata could not be read.')),
        10_000,
      );
      element.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve(element.duration);
      };
      element.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('Choose a readable MP4, MOV, MP3, or WAV file.'));
      };
      element.src = url;
    });
  } finally {
    element.removeAttribute('src');
    element.load();
    URL.revokeObjectURL(url);
  }
}

async function apiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | GenerationApiError
    | null;
  return payload?.error.message ?? `Upload failed with HTTP ${response.status}.`;
}

export function AssetUploadField({
  id,
  label,
  kind,
  modelKey,
  value,
  disabled,
  optional = false,
  onChange,
}: {
  id: string;
  label: string;
  kind: StudioAssetKind;
  modelKey: StudioVideoModelKey;
  value: string;
  disabled: boolean;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const rule = assetRules[kind];
  const maximumBytes =
    kind === 'image' && modelKey === 'seedance-2.0'
      ? 30 * 1024 * 1024
      : rule.maximumBytes;
  const Icon = rule.icon;
  const uploading = state.phase === 'preparing' || state.phase === 'uploading';

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function upload(file: File) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const mimeType = mimeTypeFor(file);
    try {
      if (file.size > maximumBytes) {
        throw new Error(`${label} must be ${formatBytes(maximumBytes)} or smaller.`);
      }
      const duration = await mediaDuration(file, kind);
      if (duration !== null && (!Number.isFinite(duration) || duration < 2 || duration > 15)) {
        throw new Error(`${label} must be between 2 and 15 seconds.`);
      }
      setState({ phase: 'preparing', fileName: file.name });
      const initiationResponse = await cinemoriqFetch('/api/studio/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType,
          byteSize: file.size,
          kind,
          modelKey,
        }),
        signal: controller.signal,
      });
      if (!initiationResponse.ok) {
        throw new Error(await apiError(initiationResponse));
      }
      const payload =
        (await initiationResponse.json()) as FalUploadInitiationResponse;
      setState({ phase: 'uploading', fileName: file.name, byteSize: file.size });

      // This URL is a short-lived, single-object signed PUT target. The FAL_KEY
      // remains on Cinemoriq's server and is never included in this request.
      const uploadResponse = await fetch(payload.upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': payload.upload.mimeType },
        body: file,
        signal: controller.signal,
      });
      if (!uploadResponse.ok) {
        throw new Error(`fal.ai file transfer failed with HTTP ${uploadResponse.status}.`);
      }
      onChange(payload.upload.fileUrl);
      setState({
        phase: 'ready',
        fileName: payload.upload.fileName,
        byteSize: payload.upload.byteSize,
        expiresAt: payload.upload.expiresAt,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : 'This file could not be uploaded.',
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cx('studio-asset-field', uploading && 'studio-asset-field--busy')}>
      <div className="studio-asset-field__heading">
        <span><Icon size={14} /> {label}{optional ? ' · optional' : ''}</span>
        <small>{kind === 'image' ? `JPEG, PNG or WebP · max ${Math.floor(maximumBytes / 1024 / 1024)} MB` : rule.help}</small>
      </div>
      <div className="studio-asset-field__controls">
        <Input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          aria-label={`${label} public HTTPS URL`}
          placeholder="https://cdn.example.com/asset"
          value={value}
          disabled={disabled || uploading}
          onChange={(event) => {
            setState({ phase: 'idle' });
            onChange(event.target.value);
          }}
        />
        <input
          ref={inputRef}
          id={`${id}-file`}
          className="sr-only"
          type="file"
          accept={rule.accept}
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          variant="quiet"
          size="sm"
          leadingIcon={
            uploading ? (
              <LoaderCircle className="studio-upload-spinner" size={15} />
            ) : (
              <UploadCloud size={15} />
            )
          }
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading' : 'Choose file'}
        </Button>
        {value ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Clear ${label.toLowerCase()}`}
            disabled={disabled || uploading}
            onClick={() => {
              setState({ phase: 'idle' });
              onChange('');
            }}
          >
            <X size={14} />
          </Button>
        ) : null}
      </div>
      <div className="studio-asset-field__status" aria-live="polite">
        {state.phase === 'preparing' ? (
          <span><LoaderCircle className="studio-upload-spinner" size={13} /> Preparing secure fal.ai upload…</span>
        ) : state.phase === 'uploading' ? (
          <span><LoaderCircle className="studio-upload-spinner" size={13} /> Uploading {state.fileName} · {formatBytes(state.byteSize)}</span>
        ) : state.phase === 'ready' ? (
          <span className="is-ready"><CheckCircle2 size={13} /> {state.fileName} · {formatBytes(state.byteSize)} · temporary fal copy expires in 24h</span>
        ) : state.phase === 'error' ? (
          <span className="is-error" role="alert">{state.message}</span>
        ) : value ? (
          <span className="is-ready"><CheckCircle2 size={13} /> Secure HTTPS asset is ready for the selected model.</span>
        ) : (
          <span>Upload directly or paste a public HTTPS URL. Your FAL_KEY stays server-side.</span>
        )}
      </div>
    </div>
  );
}
