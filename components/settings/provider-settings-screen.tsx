'use client';

import {
  AlertTriangle,
  Check,
  Clock3,
  Cloud,
  Copy,
  ExternalLink,
  Gift,
  KeyRound,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { DashboardShell } from '../shell/dashboard-shell';
import { Button, Card, StatusBadge } from '../ui/primitives';

type ProviderStatus = {
  configured: boolean;
  maskedSuffix: string | null;
};

function SecretNameRow({
  secretName,
  copiedSecret,
  onCopy,
}: {
  secretName: 'FAL_KEY' | 'MINIMAX_API_KEY';
  copiedSecret: string | null;
  onCopy: (secretName: string) => void;
}) {
  const copied = copiedSecret === secretName;
  return (
    <div className="provider-secret-row">
      <div>
        <span>Secure server secret</span>
        <code>{secretName}</code>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Copy ${secretName}`}
        onClick={() => onCopy(secretName)}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </Button>
    </div>
  );
}

function ConnectionState({ status }: { status: ProviderStatus }) {
  return (
    <div className="provider-connection-state" aria-live="polite">
      <span className={status.configured ? 'is-connected' : undefined} />
      <div>
        <strong>{status.configured ? 'Connected securely' : 'Not configured'}</strong>
        <small>
          {status.configured
            ? `Server secret detected · ••••${status.maskedSuffix}`
            : 'No browser-side key is stored'}
        </small>
      </div>
    </div>
  );
}

export function ProviderSettingsScreen({
  falStatus,
  minimaxStatus,
}: {
  falStatus: ProviderStatus;
  minimaxStatus: ProviderStatus;
}) {
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  async function copySecretName(secretName: string) {
    try {
      await navigator.clipboard.writeText(secretName);
      setCopiedSecret(secretName);
      window.setTimeout(() => setCopiedSecret(null), 1600);
    } catch {
      setCopiedSecret(null);
    }
  }

  return (
    <DashboardShell activeSection="Settings">
      <main className="settings-main" id="main-content">
        <header className="settings-hero">
          <div>
            <p className="workspace-eyebrow">Provider connections</p>
            <h1>Secure model access.</h1>
            <p>
              Keep fal.ai as the primary gateway and use MiniMax Direct only for
              Hailuo 02. Every credential stays on the server—not in scene data,
              browser storage, or URLs.
            </p>
          </div>
          <StatusBadge tone="success">
            <ShieldCheck size={13} /> Server-side secrets only
          </StatusBadge>
        </header>

        <section className="provider-grid" aria-label="AI provider connections">
          <Card className="provider-card provider-card--primary">
            <div className="provider-card__header">
              <span className="provider-card__icon">
                <Cloud size={20} aria-hidden="true" />
              </span>
              <div>
                <small>Primary gateway</small>
                <h2>fal.ai</h2>
              </div>
              <StatusBadge tone="blue">Recommended</StatusBadge>
            </div>
            <p>
              One integration for Veo 3.1, Kling 3 Standard, Seedance 2.0, and
              MiniMax H3. This remains the scalable production default.
            </p>
            <ConnectionState status={falStatus} />
            <SecretNameRow
              secretName="FAL_KEY"
              copiedSecret={copiedSecret}
              onCopy={copySecretName}
            />
            <div className="provider-card__models">
              <span>Veo 3.1</span>
              <span>Kling 3</span>
              <span>Seedance 2.0</span>
              <span>MiniMax H3</span>
            </div>
            <a
              className="button button--secondary button--md provider-card__link"
              href="https://fal.ai/dashboard/keys"
              target="_blank"
              rel="noreferrer"
            >
              <span>Open fal.ai keys</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </Card>

          <Card className="provider-card provider-card--direct">
            <div className="provider-card__header">
              <span className="provider-card__icon">
                <KeyRound size={20} aria-hidden="true" />
              </span>
              <div>
                <small>Optional direct provider</small>
                <h2>MiniMax Direct</h2>
              </div>
              <StatusBadge tone="warning">Separate billing</StatusBadge>
            </div>
            <p>
              Dedicated MiniMax Platform connection for the official
              <code> MiniMax-Hailuo-02</code> API model. There is no model-specific
              “H2 key”; the key belongs to your MiniMax Platform account.
            </p>
            <ConnectionState status={minimaxStatus} />
            <SecretNameRow
              secretName="MINIMAX_API_KEY"
              copiedSecret={copiedSecret}
              onCopy={copySecretName}
            />
            <div className="provider-card__models">
              <span>Hailuo 02</span>
              <span>6s / 10s</span>
              <span>Up to 1080P</span>
              <span>No native audio</span>
            </div>
            <a
              className="button button--secondary button--md provider-card__link"
              href="https://platform.minimax.io/"
              target="_blank"
              rel="noreferrer"
            >
              <span>Open MiniMax Platform</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </Card>
        </section>

        <section className="hailuo-trial-card" aria-labelledby="hailuo-trial-title">
          <div className="hailuo-trial-card__icon">
            <Gift size={23} aria-hidden="true" />
          </div>
          <div className="hailuo-trial-card__content">
            <div className="hailuo-trial-card__heading">
              <div>
                <p className="workspace-eyebrow">Manual free-credit workflow</p>
                <h2 id="hailuo-trial-title">Hailuo web welcome credits</h2>
              </div>
              <StatusBadge tone="warning">
                <Clock3 size={13} /> Expires after 3 days
              </StatusBadge>
            </div>
            <p>
              Official Hailuo policy says eligible new accounts receive one
              welcome-credit package that expires three days after grant. These
              are consumer website credits, not MiniMax API credits, and free-user
              downloads include a watermark.
            </p>
            <ol className="hailuo-trial-steps">
              <li><span>1</span><div><strong>Register on Hailuo</strong><small>Claim the website welcome package on your own account.</small></div></li>
              <li><span>2</span><div><strong>Generate manually</strong><small>Use the credits inside the official Hailuo web experience.</small></div></li>
              <li><span>3</span><div><strong>Bring output to Cinemoriq</strong><small>Use it as a review reference; automated API rendering needs MiniMax Platform billing.</small></div></li>
            </ol>
            <div className="hailuo-trial-card__actions">
              <a
                className="button button--primary button--md"
                href="https://hailuoai.video/"
                target="_blank"
                rel="noreferrer"
              >
                <span>Open Hailuo</span>
                <ExternalLink size={15} aria-hidden="true" />
              </a>
              <a
                className="button button--quiet button--md"
                href="https://hailuoai.video/doc/payment-policy.html"
                target="_blank"
                rel="noreferrer"
              >
                <span>Read official policy</span>
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="provider-truth-panel" aria-label="Connection safeguards">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Hard truth: free web credits cannot power API automation.</strong>
            <p>
              Cinemoriq will never request your Hailuo password, session cookie, or
              browser token. Real automated renders remain disabled until the
              generation backend and secure provider secrets are connected.
            </p>
          </div>
          <Workflow size={20} aria-hidden="true" />
        </section>
      </main>
    </DashboardShell>
  );
}
