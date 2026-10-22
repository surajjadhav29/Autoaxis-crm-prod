import type { IconType } from 'react-icons';
import {
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlineFolderOpen,
  HiOutlineInbox,
  HiOutlineMagnifyingGlass,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

export type EmptyIllustrationVariant =
  | 'search'
  | 'folder'
  | 'inbox'
  | 'dealer'
  | 'users'
  | 'documents';

const VARIANT_ICONS: Record<EmptyIllustrationVariant, IconType> = {
  search: HiOutlineMagnifyingGlass,
  folder: HiOutlineFolderOpen,
  inbox: HiOutlineInbox,
  dealer: HiOutlineBuildingStorefront,
  users: HiOutlineUserGroup,
  documents: HiOutlineClipboardDocumentList,
};

interface EmptyStateIllustrationProps {
  className?: string;
  size?: number;
  variant?: EmptyIllustrationVariant;
}

export default function EmptyStateIllustration({
  className = '',
  size = 120,
  variant = 'folder',
}: EmptyStateIllustrationProps) {
  const Icon = VARIANT_ICONS[variant];

  return (
    <div
      className={`crm-empty-state-icon crm-empty-state-icon--${variant} ${className}`.trim()}
      style={{ ['--crm-empty-icon-size' as string]: `${size}px` }}
      aria-hidden
    >
      <Icon className="crm-empty-state-icon-glyph" />
    </div>
  );
}

/** Compact empty state for filter dropdowns and inline lists. */
export function NoResultsInline({ className = '' }: { className?: string }) {
  return (
    <div className={`crm-no-results-inline ${className}`.trim()} role="status">
      <EmptyStateIllustration variant="search" size={72} className="crm-no-results-inline-art" />
      <p className="crm-no-results-inline-label">No results found</p>
    </div>
  );
}
