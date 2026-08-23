'use client';

import {
  ArrowUp,
  BarChart3,
  Bell,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Command,
  Film,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Sparkles,
  UserCircle,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { CinemoriqMark } from '../brand/cinemoriq-mark';
import { Button, Card, Input, Skeleton, StatusBadge, cx } from '../ui/primitives';
import { Drawer, Modal } from '../ui/overlays';

type NavItem = {
  label: string;
  icon: LucideIcon;
};

const primaryNavigation: NavItem[] = [
  { label: 'Command Center', icon: LayoutDashboard },
  { label: 'Campaigns', icon: Gauge },
  { label: 'Studio', icon: Clapperboard },
  { label: 'Brand Vault', icon: Box },
  { label: 'Agents', icon: Bot },
  { label: 'Analytics', icon: BarChart3 },
];

const utilityNavigation: NavItem[] = [
  { label: 'Settings', icon: Settings },
  { label: 'Support', icon: CircleHelp },
];

const quickActions = [
  'Create a campaign',
  'Generate a cinematic ad',
  'Repurpose content',
  'Optimize my ads',
];

function SidebarLink({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      className={cx('sidebar-link', active && 'sidebar-link--active')}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

function Sidebar({
  activeNav,
  onSelect,
  mobileOpen,
  onCloseMobile,
}: {
  activeNav: string;
  onSelect: (label: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      <button
        className={cx('mobile-sidebar-backdrop', mobileOpen && 'is-visible')}
        aria-label="Close navigation"
        onClick={onCloseMobile}
      />
      <aside className={cx('sidebar', mobileOpen && 'sidebar--mobile-open')}>
        <div className="sidebar__brand">
          <CinemoriqMark />
          <div className="sidebar__brand-copy">
            <strong>Cinemoriq</strong>
            <span>Creative Director</span>
          </div>
          <Button
            className="sidebar__mobile-close"
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            onClick={onCloseMobile}
          >
            <X size={18} />
          </Button>
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <SidebarLink
              key={item.label}
              item={item}
              active={activeNav === item.label}
              onSelect={() => onSelect(item.label)}
            />
          ))}
        </nav>

        <nav className="sidebar__utility" aria-label="Utility navigation">
          {utilityNavigation.map((item) => (
            <SidebarLink
              key={item.label}
              item={item}
              active={activeNav === item.label}
              onSelect={() => onSelect(item.label)}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

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
  const [activeNav, setActiveNav] = useState('Command Center');
  const [workspace, setWorkspace] = useState('Workspace Alpha');
  const [command, setCommand] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'notifications' | 'approvals' | null>(
    null,
  );
  const [activityLoading, setActivityLoading] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const closeCampaignModal = useCallback(() => setCampaignModalOpen(false), []);
  const closeDrawer = useCallback(() => setDrawerMode(null), []);

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

  function handleNavSelect(label: string) {
    if (label === 'Campaigns') {
      router.push('/campaigns/new');
      return;
    }
    setActiveNav(label);
    setSidebarOpen(false);
  }

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

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        activeNav={activeNav}
        onSelect={handleNavSelect}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="app-column">
        <header className="topbar">
          <div className="topbar__left">
            <Button
              className="topbar__menu"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19} />
            </Button>
            <div className="workspace-tabs" aria-label="Workspace switcher">
              {['Workspace Alpha', 'Workspace Beta'].map((name) => (
                <button
                  key={name}
                  className={cx(
                    'workspace-tab',
                    workspace === name && 'workspace-tab--active',
                  )}
                  onClick={() => setWorkspace(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="topbar__actions">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open notifications"
              onClick={() => setDrawerMode('notifications')}
            >
              <Bell size={21} />
              <span className="notification-dot" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open profile"
              onClick={() => setDrawerMode('notifications')}
            >
              <UserCircle size={23} />
            </Button>
          </div>
        </header>

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
            <Card className="campaign-card" interactive>
              <div className="card__header">
                <span className="section-label">
                  <Film size={15} aria-hidden="true" /> Active Campaign
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More campaign options"
                >
                  <MoreHorizontal size={20} />
                </Button>
              </div>
              <div className="campaign-card__content">
                <h2>Q4 Luxury Watch Launch</h2>
                <p>Multichannel global distribution • 12 assets</p>
                <div className="processing-row">
                  <span className="processing-row__icon">
                    <Clapperboard size={20} aria-hidden="true" />
                  </span>
                  <div className="processing-row__copy">
                    <strong>Rendering cinematic sequences…</strong>
                  </div>
                  <StatusBadge tone="blue" pulse>
                    Generating
                  </StatusBadge>
                </div>
              </div>
            </Card>

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
                onClick={() => setDrawerMode('approvals')}
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
                  <StatusBadge>System optimal</StatusBadge>
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
                      Analyzing audience signals and preparing Q4 creative variants.
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

        <footer className="app-footer">
          <span>© 2026 Cinemoriq. Cinematic intelligence, operationalized.</span>
          <nav aria-label="Legal links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#security">Security</a>
          </nav>
        </footer>
      </div>

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
        open={drawerMode !== null}
        onClose={closeDrawer}
        eyebrow={drawerMode === 'approvals' ? 'Human in the loop' : 'Command center'}
        title={drawerMode === 'approvals' ? 'Creative approvals' : 'Activity'}
      >
        {drawerMode === 'approvals' ? (
          <div className="drawer-list">
            {[
              ['Hero film · Cut 03', 'Cinematic Studio', '2:14 min'],
              ['Dealer launch teaser', 'Creative Orchestrator', '15 sec'],
            ].map(([title, owner, duration]) => (
              <article className="drawer-item" key={title}>
                <div className="drawer-item__icon">
                  <Film size={18} aria-hidden="true" />
                </div>
                <div className="drawer-item__copy">
                  <strong>{title}</strong>
                  <span>
                    {owner} · {duration}
                  </span>
                </div>
                <Button variant="secondary" size="sm">
                  Review
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="drawer-list">
            {[
              ['Render complete', 'Scene 07 is ready for review', 'Now'],
              ['Brand check passed', 'All required assets are compliant', '12m'],
              ['Brief updated', 'Audience insight added by Orchestrator', '1h'],
            ].map(([title, description, time]) => (
              <article className="drawer-item" key={title}>
                <div className="drawer-item__icon drawer-item__icon--success">
                  <Check size={17} aria-hidden="true" />
                </div>
                <div className="drawer-item__copy">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
                <time>{time}</time>
              </article>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
