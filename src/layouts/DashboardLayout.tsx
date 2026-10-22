import { useEffect, useState, type MouseEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, type NavLinkRenderProps } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { CrmNavIcon, CrmNavIconSet } from '@/components/layout/CrmNavIcons';
import { FileStatsProvider } from '../context/FileStatsContext';
import MobileBottomNav from '../components/MobileBottomNav';
import ConfirmModal from '../components/ConfirmModal';
import { OverdueObjectionProvider } from '../context/OverdueObjectionContext';

const mainNavClass = ({ isActive }: NavLinkRenderProps) =>
  `crm-nav-link ${isActive ? 'crm-nav-link--active' : ''}`;

const SIDEBAR_COLLAPSED_KEY = 'crm-sidebar-collapsed';

/** Vahan Know Application Status — open exact URL every click. */
const PARIVAHAN_STATUS_URL =
  'https://vahan.parivahan.gov.in/vahanservice/vahan/ui/appl_status/form_Know_Appl_Status.xhtml';

function openParivahanPortal(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  // Named window so a second click reloads this same status URL (not a cached redirect).
  const win = window.open(PARIVAHAN_STATUS_URL, 'parivahan_appl_status');
  if (win) win.focus();
}

function LayoutInner() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onFilters = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      if (detail?.open) {
        setSidebarCollapsed(true);
        return;
      }
      try {
        setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
      } catch {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('crm:filters', onFilters);
    return () => window.removeEventListener('crm:filters', onFilters);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="crm-shell">
      <div className="crm-top-stack print:hidden">
        <header className="crm-topbar crm-topbar--full">
          <div className="crm-topbar-left">
            <Link to="/dashboard" className="crm-logo-link" aria-label="Go to dashboard">
              <img
                src="/autoaxis-logo.png"
                alt="AutoAxis Solution — Where vehicles meet compliance"
                className="crm-logo"
              />
            </Link>
          </div>

          <div className="crm-topbar-right">
            <p className="crm-topbar-date">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <div className="crm-user-chip">
              <div className="crm-user-avatar">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="crm-user-meta">
                <p className="crm-user-name">{user?.fullName}</p>
                <p className="crm-user-role">
                  {isAdmin ? 'Super Admin' : 'Staff'} · {user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="crm-topbar-logout-mobile"
              onClick={handleLogoutClick}
              aria-label="Secure logout"
              title="Logout"
            >
              <CrmNavIcon icon={CrmNavIconSet.logout} size={20} />
            </button>
          </div>
        </header>
      </div>

      <div className="crm-body">
        <aside
          className={`crm-sidebar print:hidden${sidebarCollapsed ? ' crm-sidebar--collapsed' : ''}`}
        >
          <div className="crm-sidebar-head">
            <button
              type="button"
              className="crm-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <CrmNavIcon icon={CrmNavIconSet.sidebarExpand} />
              ) : (
                <CrmNavIcon icon={CrmNavIconSet.sidebarCollapse} />
              )}
            </button>
          </div>

          <nav className="crm-nav">
            <NavLink to="/dashboard" end className={mainNavClass} title="Dashboard">
              <CrmNavIcon icon={CrmNavIconSet.dashboard} />
              <span className="crm-nav-link-label">Dashboard</span>
            </NavLink>
            <NavLink to="/files" end className={mainNavClass} title="File Records">
              <CrmNavIcon icon={CrmNavIconSet.fileRecords} />
              <span className="crm-nav-link-label">File Records</span>
            </NavLink>
            <NavLink to="/files/new" className={mainNavClass} title="New Entry">
              <CrmNavIcon icon={CrmNavIconSet.newEntry} />
              <span className="crm-nav-link-label">New Entry</span>
            </NavLink>
            <NavLink to="/admin/work-types" className={mainNavClass} title="Work Types">
              <CrmNavIcon icon={CrmNavIconSet.workTypes} />
              <span className="crm-nav-link-label">Work Types</span>
            </NavLink>
            <NavLink to="/admin/field-agents" className={mainNavClass} title="Field Agents">
              <CrmNavIcon icon={CrmNavIconSet.fieldAgents} />
              <span className="crm-nav-link-label">Field Agents</span>
            </NavLink>
            <NavLink to="/dealers" className={mainNavClass} title="Dealers">
              <CrmNavIcon icon={CrmNavIconSet.dealer} />
              <span className="crm-nav-link-label">Dealer</span>
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin/billing" className={mainNavClass} title="Billing">
                  <CrmNavIcon icon={CrmNavIconSet.billing} />
                  <span className="crm-nav-link-label">Billing</span>
                </NavLink>
                <NavLink to="/admin/users" className={mainNavClass} title="All Users">
                  <CrmNavIcon icon={CrmNavIconSet.users} />
                  <span className="crm-nav-link-label">All Users</span>
                </NavLink>
              </>
            )}
            <a
              href={PARIVAHAN_STATUS_URL}
              onClick={openParivahanPortal}
              className="crm-nav-link"
              title="Parivahan Portal"
            >
              <CrmNavIcon icon={CrmNavIconSet.parivahan} />
              <span className="crm-nav-link-label">Parivahan Portal</span>
            </a>
          </nav>

          <div className="crm-sidebar-foot">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="crm-sidebar-logout"
              title="Secure Logout"
            >
              <CrmNavIcon icon={CrmNavIconSet.logout} />
              <span className="crm-sidebar-logout-label">Secure Logout</span>
            </button>
          </div>
        </aside>

        <main className="crm-main">
          <div className="crm-content print:p-4">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileBottomNav isAdmin={isAdmin} />

      <ConfirmModal
        open={showLogoutConfirm}
        title="Are you sure you want to logout?"
        description="You will need to sign in again to access your account and file records."
        cancelLabel="Cancel"
        confirmLabel="Logout"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
      />

    </div>
  );
}

export default function DashboardLayout() {
  return (
    <FileStatsProvider>
      <OverdueObjectionProvider>
        <LayoutInner />
      </OverdueObjectionProvider>
    </FileStatsProvider>
  );
}
