import type { ReactNode } from 'react';
import {
  CrmGlobeSideIcon,
  CrmKebabIcon,
  CrmMonitorSideIcon,
  CrmRowErrorIcon,
  CrmRowSuccessIcon,
  CrmRowWarningIcon,
  CrmSortIcon,
} from '@/components/icons/CrmIcons';

const ICONS = { globe: CrmGlobeSideIcon, monitor: CrmMonitorSideIcon } as const;

type RowState = 'ok' | 'warn' | 'err';
type SideIconKey = keyof typeof ICONS;

interface FigmaCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onChange?: (event: { target: { checked: boolean } }) => void;
  label?: string;
}

export function FigmaCheckbox({ checked, disabled = false, onChange, label }: FigmaCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange?.({ target: { checked: !checked } });
      }}
      className={`figma-checkbox ${checked ? 'figma-checkbox--checked' : ''}${
        disabled ? ' figma-checkbox--disabled' : ''
      }`}
    />
  );
}

interface FigmaSortHeaderProps {
  label: string;
  onClick?: () => void;
  sortable?: boolean;
}

export function FigmaSortHeader({ label, onClick, sortable = true }: FigmaSortHeaderProps) {
  if (!sortable) return <span className="figma-th-label">{label}</span>;
  return (
    <button type="button" onClick={onClick} className="figma-th-sort">
      <span>{label}</span>
      <CrmSortIcon />
    </button>
  );
}

function RowStatusIcon({ state }: { state: RowState }) {
  if (state === 'ok') return <CrmRowSuccessIcon />;
  if (state === 'warn') return <CrmRowWarningIcon />;
  return <CrmRowErrorIcon />;
}

interface FigmaFeatureCellProps {
  name: string;
  state: RowState;
  icon?: SideIconKey;
  tag?: string;
}

export function FigmaFeatureCell({ name, state, icon, tag }: FigmaFeatureCellProps) {
  const SideIcon = icon ? ICONS[icon] : CrmGlobeSideIcon;
  const nameClass =
    state === 'ok'
      ? 'figma-font-name'
      : state === 'warn'
        ? 'figma-font-name figma-font-name--warn'
        : 'figma-font-name figma-font-name--err';

  return (
    <div className="figma-font-cell">
      <div className="figma-font-main">
        <RowStatusIcon state={state} />
        <span className={nameClass}>{name}</span>
        <SideIcon />
      </div>
      {tag && <span className="figma-font-tag">{tag}</span>}
    </div>
  );
}

type LicenseType =
  | 'pill-active'
  | 'pill-missing'
  | 'pill-expiring'
  | 'pill-expired'
  | 'pill-overused'
  | 'progress-blue'
  | 'progress-red';

interface FigmaLicenseCellProps {
  type: LicenseType;
  progress?: { current?: number; max?: number };
  label?: string;
}

export function FigmaLicenseCell({ type, progress, label }: FigmaLicenseCellProps) {
  if (type === 'pill-active') {
    return <span className="figma-license-pill figma-license-pill--active">{label || 'Active'}</span>;
  }
  if (type === 'pill-missing') {
    return <span className="figma-license-pill figma-license-pill--missing">{label || 'Missing'}</span>;
  }
  if (type === 'pill-expiring') {
    return <span className="figma-license-pill figma-license-pill--expiring">{label || 'Expiring soon'}</span>;
  }
  if (type === 'pill-expired') {
    return <span className="figma-license-pill figma-license-pill--expired">{label || 'Expired'}</span>;
  }
  if (type === 'pill-overused') {
    return <span className="figma-license-pill figma-license-pill--overused">{label || 'Overused'}</span>;
  }

  const current = progress?.current ?? 0;
  const max = progress?.max ?? 100;
  const over = current > max;
  const pct = over ? 100 : max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const barTone =
    type === 'progress-blue'
      ? 'figma-bar-fill--blue'
      : type === 'progress-red' || over
        ? 'figma-bar-fill--red'
        : 'figma-bar-fill--empty';
  const currentTone =
    type === 'progress-blue' && !over ? 'figma-bar-num figma-bar-num--blue' : 'figma-bar-num figma-bar-num--red';

  return (
    <div className="figma-license-bar">
      <div className="figma-bar-track">
        <div className={`figma-bar-fill ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="figma-bar-text">
        <span className={currentTone}>{current}</span>
        <span className="figma-bar-sep">/</span>
        <span className="figma-bar-den">{max}</span>
      </p>
    </div>
  );
}

interface FigmaActionsCellProps {
  label?: string;
  onMenu?: () => void;
}

export function FigmaActionsCell({ label = 'Configure', onMenu }: FigmaActionsCellProps) {
  return (
    <div className="figma-action-cell">
      <button type="button" className="figma-action-btn">
        {label}
      </button>
      <button type="button" className="figma-kebab-btn" onClick={onMenu} aria-label="More options">
        <CrmKebabIcon />
      </button>
    </div>
  );
}

export function FigmaTable({ children }: { children: ReactNode }) {
  return (
    <div className="figma-table-shell">
      <div className="figma-table">{children}</div>
    </div>
  );
}

export function FigmaHeaderRow({ children }: { children: ReactNode }) {
  return <div className="figma-tr figma-tr--head">{children}</div>;
}

export function FigmaBodyRow({
  children,
  className = '',
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={`figma-tr figma-tr--body${className ? ` ${className}` : ''}`}
      title={title}
    >
      {children}
    </div>
  );
}

export type FigmaCellVariant =
  | 'check'
  | 'font'
  | 'license'
  | 'scope'
  | 'date'
  | 'access'
  | 'actions'
  | 'vehicle'
  | 'client'
  | 'work'
  | 'dealer'
  | 'filedate'
  | 'filedocs'
  | 'bill'
  | 'filestatus'
  | 'assignee'
  | 'fieldagent'
  | 'fieldagentname'
  | 'fieldagentmobile'
  | 'fieldagentdesc'
  | 'fieldagentrto'
  | 'fieldagentaddress'
  | 'fieldagentactions'
  | 'fileactions'
  | 'staffname'
  | 'staffemail'
  | 'staffuser'
  | 'staffstatus'
  | 'staffdate'
  | 'stafflogin'
  | 'staffactions'
  | 'worktypename'
  | 'worktypedocs'
  | 'worktypeactions'
  | 'default';

const CELL_VARIANTS = new Set<string>([
  'check', 'font', 'license', 'scope', 'date', 'access', 'actions',
  'vehicle', 'client', 'work', 'dealer', 'filedate', 'filedocs', 'bill', 'filestatus', 'assignee',
  'fieldagent', 'fieldagentname', 'fieldagentmobile', 'fieldagentdesc', 'fieldagentrto', 'fieldagentaddress', 'fieldagentactions', 'fileactions',
  'staffname', 'staffemail', 'staffuser', 'staffstatus', 'staffdate', 'stafflogin', 'staffactions',
  'worktypename', 'worktypedocs', 'worktypeactions',
]);

interface FigmaCellProps {
  variant?: FigmaCellVariant;
  children: ReactNode;
}

export function FigmaCell({ variant = 'default', children }: FigmaCellProps) {
  const cls = CELL_VARIANTS.has(variant) ? `figma-td--${variant}` : 'figma-td--default';
  return <div className={`figma-td ${cls}`}>{children}</div>;
}
