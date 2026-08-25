'use client';

import {
  BarChart3,
  Bell,
  Bot,
  Box,
  Check,
  CircleHelp,
  Clapperboard,
  Gauge,
  LayoutDashboard,
  Menu,
  Settings,
  UserCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { CinemoriqMark } from '../brand/cinemoriq-mark';
import { Button, cx } from '../ui/primitives';
import { Drawer } from '../ui/overlays';

export type DashboardSection =
  | 'Command Center'
  | 'Campaigns'
  | 'Studio'
  | 'Brand Vault'
  | 'Agents'
  | 'Analytics'
  | 'Settings'
  | 'Support';

type NavItem = {
  label: DashboardSection;
  icon: LucideIcon;
  href?: string;
};

const primaryNavigation: NavItem[] = [
  { label: 'Command Center', icon: LayoutDashboard, href: '/' },
  { label: 'Campaigns', icon: Gauge, href: '/campaigns/workspace' },
  { label: 'Studio', icon: Clapperboard, href: '/studio' },
  { label: 'Brand Vault', icon: Box },
  { label: 'Agents', icon: Bot },
  { label: 'Analytics', icon: BarChart3 },
];

const utilityNavigation: NavItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Support', icon: CircleHelp },
];

function SidebarLink({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (item: NavItem) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      className={cx('sidebar-link', active && 'sidebar-link--active')}
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(item)}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

function Sidebar({
  activeSection,
  mobileLayout,
  mobileOpen,
  sidebarRef,
  onCloseMobile,
  onSelect,
}: {
  activeSection: DashboardSection;
  mobileLayout: boolean;
  mobileOpen: boolean;
  sidebarRef: RefObject<HTMLElement | null>;
  onCloseMobile: () => void;
  onSelect: (item: NavItem) => void;
}) {
  return (
    <>
      <button
        className={cx('mobile-sidebar-backdrop', mobileOpen && 'is-visible')}
        aria-label="Close navigation"
        onClick={onCloseMobile}
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside
        ref={sidebarRef}
        id="app-navigation"
        className={cx('sidebar', mobileOpen && 'sidebar--mobile-open')}
        role={mobileLayout ? 'dialog' : undefined}
        aria-label="Application navigation"
        aria-modal={mobileLayout && mobileOpen ? true : undefined}
        aria-hidden={mobileLayout && !mobileOpen ? true : undefined}
        inert={mobileLayout && !mobileOpen}
      >
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
              active={activeSection === item.label}
              onSelect={onSelect}
            />
          ))}
        </nav>

        <nav className="sidebar__utility" aria-label="Utility navigation">
          {utilityNavigation.map((item) => (
            <SidebarLink
              key={item.label}
              item={item}
              active={activeSection === item.label}
              onSelect={onSelect}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

export function DashboardShell({
  activeSection,
  children,
  immersive = false,
}: {
  activeSection: DashboardSection;
  children: ReactNode;
  immersive?: boolean;
}) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState('Workspace Alpha');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(false);
  const [drawerMode, setDrawerMode] = useState<
    'activity' | 'profile' | 'roadmap' | null
  >(null);
  const [roadmapSection, setRoadmapSection] = useState<DashboardSection | null>(
    null,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  }, []);

  const closeDrawer = useCallback(() => setDrawerMode(null), []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 63.9375rem)');
    const updateLayout = () => {
      setMobileLayout(media.matches);
      if (!media.matches) setSidebarOpen(false);
    };
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || !mobileLayout) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const selector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(sidebar.querySelectorAll<HTMLElement>(selector));
    window.setTimeout(() => getFocusable()[0]?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeSidebar();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeSidebar, mobileLayout, sidebarOpen]);

  function handleNavSelect(item: NavItem) {
    setSidebarOpen(false);
    if (item.href) {
      router.push(item.href);
      return;
    }
    setRoadmapSection(item.label);
    setDrawerMode('roadmap');
  }

  return (
    <div className={cx('app-shell', immersive && 'app-shell--immersive')}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar
        activeSection={activeSection}
        mobileLayout={mobileLayout}
        mobileOpen={sidebarOpen}
        sidebarRef={sidebarRef}
        onCloseMobile={closeSidebar}
        onSelect={handleNavSelect}
      />

      <div
        className="app-column"
        aria-hidden={mobileLayout && sidebarOpen ? true : undefined}
        inert={mobileLayout && sidebarOpen}
      >
        <header className="topbar">
          <div className="topbar__left">
            <Button
              ref={menuButtonRef}
              className="topbar__menu"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              aria-controls="app-navigation"
              aria-expanded={sidebarOpen}
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
              onClick={() => setDrawerMode('activity')}
            >
              <Bell size={21} />
              <span className="notification-dot" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open profile"
              onClick={() => setDrawerMode('profile')}
            >
              <UserCircle size={23} />
            </Button>
          </div>
        </header>

        {children}

        {!immersive ? (
          <footer className="app-footer">
            <span>© 2026 Cinemoriq. Cinematic intelligence, operationalized.</span>
            <div className="app-footer__trust" aria-label="Product safeguards">
              <span>Privacy-ready</span>
              <span>Human-reviewed</span>
              <span>Secure by design</span>
            </div>
          </footer>
        ) : null}
      </div>

      <Drawer
        open={drawerMode !== null}
        onClose={closeDrawer}
        eyebrow={drawerMode === 'roadmap' ? 'Product roadmap' : 'Command center'}
        title={
          drawerMode === 'roadmap'
            ? `${roadmapSection ?? 'This section'} is next`
            : drawerMode === 'profile'
              ? 'Workspace profile'
              : 'Activity'
        }
      >
        {drawerMode === 'roadmap' ? (
          <div className="drawer-empty-state">
            <span className="drawer-item__icon">
              <Clapperboard size={19} aria-hidden="true" />
            </span>
            <strong>{roadmapSection} is planned for a later build phase.</strong>
            <p>
              The current release keeps this destination honest instead of
              presenting an inactive or fabricated production tool.
            </p>
          </div>
        ) : drawerMode === 'profile' ? (
          <div className="drawer-empty-state">
            <span className="drawer-item__icon">
              <UserCircle size={20} aria-hidden="true" />
            </span>
            <strong>Creative Director workspace</strong>
            <p>
              Profile, team access, and cloud identity controls will arrive with
              the authentication phase.
            </p>
          </div>
        ) : (
          <div className="drawer-list">
            {[
              ['Brief prepared', 'Campaign inputs are ready for human review', 'Now'],
              ['Brand check passed', 'Submitted guardrails are internally consistent', '12m'],
              ['Draft updated', 'Campaign changes were saved on this device', '1h'],
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
