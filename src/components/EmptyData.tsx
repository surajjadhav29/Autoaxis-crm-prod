import EmptyStateIllustration, {
  type EmptyIllustrationVariant,
} from './EmptyStateIllustration';

interface EmptyDataProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showIllustration?: boolean;
  illustration?: EmptyIllustrationVariant;
  compact?: boolean;
  className?: string;
}

export default function EmptyData({
  title = 'No data found',
  description,
  actionLabel,
  onAction,
  showIllustration = true,
  illustration = 'folder',
  compact = false,
  className = '',
}: EmptyDataProps) {
  const showAction = actionLabel && onAction;
  const artSize = compact ? 104 : 120;

  return (
    <div
      className={`crm-empty-data ${compact ? 'crm-empty-data--compact' : ''} ${className}`.trim()}
      role="status"
    >
      <div className="crm-empty-data-inner">
        {showIllustration ? (
          <EmptyStateIllustration
            className="crm-empty-data-art"
            size={artSize}
            variant={illustration}
          />
        ) : null}

        <div className="crm-empty-data-copy">
          <h3 className="crm-empty-data-title">{title}</h3>
          {description ? <p className="crm-empty-data-desc">{description}</p> : null}
        </div>

        {showAction ? (
          <button type="button" onClick={onAction} className="crm-btn crm-btn--primary crm-empty-data-action">
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
