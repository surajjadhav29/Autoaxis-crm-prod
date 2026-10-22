import { NavLink, useLocation } from 'react-router-dom';
import {
  CRM_NAV_ICON_SIZE_MOBILE,
  CrmNavIcon,
  CrmNavIconSet,
} from '@/components/layout/CrmNavIcons';

interface MobileBottomNavProps {
  isAdmin: boolean;
}

const itemClass = (active: boolean) =>
  `crm-mobile-nav-item ${active ? 'crm-mobile-nav-item--active' : ''}`;

export default function MobileBottomNav({ isAdmin }: MobileBottomNavProps) {
  const { pathname } = useLocation();

  const isFilesActive = pathname.startsWith('/files') && pathname !== '/files/new';

  return (
    <nav className="crm-mobile-nav print:hidden" aria-label="Mobile navigation">
      <NavLink to="/dashboard" end className={({ isActive }) => itemClass(isActive)}>
        <CrmNavIcon icon={CrmNavIconSet.dashboard} size={CRM_NAV_ICON_SIZE_MOBILE} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/files"
        className={() => itemClass(isFilesActive)}
        aria-current={isFilesActive ? 'page' : undefined}
      >
        <CrmNavIcon icon={CrmNavIconSet.fileRecords} size={CRM_NAV_ICON_SIZE_MOBILE} />
        <span>Records</span>
      </NavLink>

      <NavLink to="/files/new" className={({ isActive }) => itemClass(isActive)}>
        <CrmNavIcon icon={CrmNavIconSet.newEntry} size={CRM_NAV_ICON_SIZE_MOBILE} />
        <span>New</span>
      </NavLink>

      <NavLink to="/admin/work-types" className={({ isActive }) => itemClass(isActive)}>
        <CrmNavIcon icon={CrmNavIconSet.workTypes} size={CRM_NAV_ICON_SIZE_MOBILE} />
        <span>Types</span>
      </NavLink>

      <NavLink to="/admin/field-agents" className={({ isActive }) => itemClass(isActive)}>
        <CrmNavIcon icon={CrmNavIconSet.fieldAgents} size={CRM_NAV_ICON_SIZE_MOBILE} />
        <span>Agents</span>
      </NavLink>

      <NavLink to="/dealers" className={({ isActive }) => itemClass(isActive)}>
        <CrmNavIcon icon={CrmNavIconSet.dealer} size={CRM_NAV_ICON_SIZE_MOBILE} />
        <span>Dealer</span>
      </NavLink>

      {isAdmin && (
        <>
          <NavLink to="/admin/billing" className={({ isActive }) => itemClass(isActive)}>
            <CrmNavIcon icon={CrmNavIconSet.billing} size={CRM_NAV_ICON_SIZE_MOBILE} />
            <span>Bill</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => itemClass(isActive)}>
            <CrmNavIcon icon={CrmNavIconSet.users} size={CRM_NAV_ICON_SIZE_MOBILE} />
            <span>Users</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}
