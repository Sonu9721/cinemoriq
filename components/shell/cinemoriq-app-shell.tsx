'use client';

import {
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Command,
  Film,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { ensureDemoCampaignRecord } from '../campaigns/campaign-record-store';
import { Button, Card, Input, Skeleton, StatusBadge } from '../ui/primitives';
import { Drawer, Modal } from '../ui/overlays';
import { DashboardShell } from './dashboard-shell';

const quickActions = [
  'Create a campaign',
  'Generate a cinematic ad',
  'Repurpose content',
  'Optimize my ads',
];

function CommandBar({
  value,
  inputRef,
  onChange,
  onSubmit,
}: {
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="command-bar" onSubmit={onSubmit} role="search">
      <WandSparkles className="command-bar__icon" size={23} aria-hidden="true" />
      <input
        ref={inputRef}
        className="command-bar__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="What do you want to achieve?"
        aria-label="Describe your campaign objective"
      />
      {value.trim() ? (
        <Button
          className="command-bar__submit"
          type="submit"
          variant="primary"
          size="icon"
          aria-label="Run command"
        >
          <ArrowUp size={17} />
        </Button>
      ) : (
        <kbd className="command-bar__shortcut">
          <Command size={13} aria-hidden="true" /> K
        </kbd>
      )}
    </form>
  );
}

export function CinemoriqAppShell() {
  const router = useRouter();
  const [command, setCommand] = useState('');
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [approvalDrawerOpen, setApprovalDrawerOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const closeCampaignModal = useCallback(() => setCampaignModalOpen(false), []);
  const closeApprovalDrawer = useCallback(
    () => setApprovalDrawerOpen(false),
    [],
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        commandInputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, []);

  function handleCommandSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!command.trim()) {
      commandInputRef.current?.focus();
      return;
    }
    setCampaignModalOpen(true);
  }

  function handleQuickAction(action: string) {
    setCommand(action);
    commandInputRef.current?.focus();
  }

  function refreshAgentActivity() {
    setActivityLoading(true);
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      setActivityLoading(false);
    }, 900);
  }

  function prepareSampleWorkspace() {
    try {
      ensureDemoCampaignRecord();
    } catch {
      // The workspace route will show its storage-safe empty state.
    }
  }

  return (
    <DashboardShell activeSection="Command Center">
      <main className="main-canvas" id="main-content">
        <section className="intent-hero" aria-labelledby="page-title">
          <h1 id="page-title">Focus your intent.</h1>
          <CommandBar
            value={command}
            inputRef={commandInputRef}
            onChange={setCommand}
            onSubmit={handleCommandSubmit}
          />
          <div className="quick-actions" aria-label="Suggested actions">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="quiet"
                size="sm"
                onClick={() => handleQuickAction(action)}
              >
                {action}
              </Button>
            ))}
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Command center overview">
          <Link
            className="card card--interactive campaign-card campaign-card--link"
            href="/campaigns/workspace?demo=project-noir"
            onClick={prepareSampleWorkspace}
            aria-label="Open Project Noir Q4 Launch campaign workspace"
          >
            <div className="card__header">
              <span className="section-label">
                <Film size={15} aria-hidden="true" /> Sample Campaign
              </span>
              <MoreHorizontal size={20} aria-hidden="true" />
            </div>
            <div className="campaign-card__content">
              <h2>Project Noir // Q4 Launch</h2>
              <p>Production pipeline orchestration • local preview</p>
              <div className="processing-row">
                <span className="processing-row__icon">
                  <Clapperboard size={20} aria-hidden="true" />
                </span>
                <div className="processing-row__copy">
                  <strong>Creative concept ready for review</strong>
                </div>
                <StatusBadge tone="blue">
                  Preview
                </StatusBadge>
              </div>
            </div>
          </Link>

          <Card className="approval-card" interactive>
            <div className="card__header">
              <span className="section-label">
                <CheckCircle2 size={15} aria-hidden="true" /> Pending approvals
              </span>
            </div>
            <div className="approval-card__metric">
              <strong>2</strong>
              <span>Items require your creative sign-off</span>
            </div>
            <Button
              className="approval-card__button"
              variant="secondary"
              onClick={() => setApprovalDrawerOpen(true)}
              trailingIcon={<ChevronRight size={16} />}
            >
              Review now
            </Button>
          </Card>

          <Card className="activity-card">
            <div className="card__header">
              <span className="section-label">
                <Bot size={15} aria-hidden="true" /> AI agent activity
              </span>
              <div className="activity-card__tools">
                <StatusBadge>Local preview</StatusBadge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Refresh agent activity"
                  onClick={refreshAgentActivity}
                  disabled={activityLoading}
                >
                  <RefreshCw
                    size={17}
                    className={activityLoading ? 'spin' : undefined}
                  />
                </Button>
              </div>
            </div>
            {activityLoading ? (
              <div className="agent-row agent-row--loading" role="status">
                <Skeleton className="skeleton--avatar" />
                <div className="skeleton-stack">
                  <Skeleton className="skeleton--title" />
                  <Skeleton className="skeleton--line" />
                </div>
                <span className="sr-only">Refreshing agent activity</span>
              </div>
            ) : (
              <div className="agent-row">
                <span className="agent-row__avatar">
                  <Sparkles size={21} aria-hidden="true" />
                </span>
                <div className="agent-row__copy">
                  <strong>Creative Orchestrator</strong>
                  <span>
                    Organizing campaign inputs into Concept A for human review.
                  </span>
                </div>
                <StatusBadge tone="blue" pulse>
                  Working
                </StatusBadge>
              </div>
            )}
          </Card>
        </section>
      </main>

      <Modal
        open={campaignModalOpen}
        onClose={closeCampaignModal}
        eyebrow="Campaign intake"
        title="Turn intent into a production brief"
        footer={
          <>
            <Button variant="ghost" onClick={closeCampaignModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Sparkles size={16} />}
              onClick={() => router.push('/campaigns/new')}
            >
              Create brief
            </Button>
          </>
        }
      >
        <div className="modal-intro">
          <span className="modal-intro__icon">
            <WandSparkles size={22} aria-hidden="true" />
          </span>
          <p>
            Cinemoriq will preserve your intent, gather the missing inputs, and
            prepare the workflow for human approval.
          </p>
        </div>
        <div className="form-grid">
          <Input
            id="campaign-objective"
            label="Objective"
            defaultValue={command || 'Launch a premium product campaign'}
            hint="Describe the business outcome, not the AI tool you want to use."
          />
          <Input
            id="campaign-market"
            label="Primary market"
            defaultValue="United States"
          />
        </div>
      </Modal>

      <Drawer
        open={approvalDrawerOpen}
        onClose={closeApprovalDrawer}
        eyebrow="Human in the loop"
        title="Creative approvals"
      >
        <div className="drawer-list">
          {[
            ['Concept A · Neon Ascendance', 'Creative preview', 'Awaiting review'],
            ['Project Noir campaign brief', 'Brand & rights check', 'Ready'],
          ].map(([title, owner, status]) => (
            <article className="drawer-item" key={title}>
              <div className="drawer-item__icon">
                <Film size={18} aria-hidden="true" />
              </div>
              <div className="drawer-item__copy">
                <strong>{title}</strong>
                <span>
                  {owner} · {status}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  closeApprovalDrawer();
                  prepareSampleWorkspace();
                  router.push('/campaigns/workspace?demo=project-noir');
                }}
              >
                Review
              </Button>
            </article>
          ))}
        </div>
      </Drawer>
    </DashboardShell>
  );
}
