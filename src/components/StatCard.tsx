import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type StatTone = 'default' | 'blue' | 'red' | 'orange' | 'purple' | 'green' | 'gold' | 'sky';

const TONES: Record<StatTone, { border: string; icon: string; bg: string }> = {
  default: { border: '#dbdfe5', icon: '#667488', bg: '#f9fafb' },
  blue: { border: '#1a73e8', icon: '#1a73e8', bg: '#eef4fd' },
  red: { border: '#dc0024', icon: '#dc0024', bg: '#fdf0f2' },
  orange: { border: '#e67e22', icon: '#d35400', bg: '#fff8f0' },
  purple: { border: '#8e44ad', icon: '#8e44ad', bg: '#f7f0fa' },
  green: { border: '#1d7f50', icon: '#1d7f50', bg: '#eef8f2' },
  gold: { border: '#f39c12', icon: '#d68910', bg: '#fff9ee' },
  sky: { border: '#5dade2', icon: '#3498db', bg: '#eef7fc' },
};

interface StatCardProps {
  label: string;
  value?: ReactNode;
  /** Full unabbreviated value shown on hover. */
  valueTitle?: string;
  meta?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  onClick?: () => void;
  active?: boolean;
  readOnly?: boolean;
}

export default function StatCard({
  label,
  value,
  valueTitle,
  meta,
  icon: Icon,
  tone = 'default',
  onClick,
  active,
  readOnly,
  ...rest
}: StatCardProps) {
  const t = TONES[tone] || TONES.default;
  const interactive = !readOnly && onClick;

  const style = {
    '--stat-accent': t.border,
    '--stat-icon-bg': t.bg,
    '--stat-icon-color': t.icon,
  } as CSSProperties;

  const className = `crm-stat-card ${interactive ? 'crm-stat-card--interactive' : ''} ${
    active ? 'crm-stat-card--active' : ''
  }`;

  const content = (
    <>
      <div className="crm-stat-card-top">
        {Icon && (
          <span className="crm-stat-icon" aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
        )}
        <p className="crm-stat-label">{label}</p>
      </div>
      <p className="crm-stat-value" title={valueTitle}>
        {value ?? 0}
      </p>
      {meta && <p className="crm-stat-meta">{meta}</p>}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={className} style={style} {...rest}>
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={style} {...rest}>
      {content}
    </div>
  );
}
