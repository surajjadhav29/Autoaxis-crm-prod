import { useEffect, useRef } from 'react';
import { CrmEditIcon, CrmTrashIcon } from '@/components/icons/CrmIcons';
import EmptyData from './EmptyData';
import TableSkeleton from './table/TableSkeleton';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from './table/FigmaTable';

interface WorkTypeRow {
  id: string;
  name: string;
  documents?: string[];
}

interface WorkTypeTableProps {
  workTypes: WorkTypeRow[];
  loading: boolean;
  onEdit?: (item: WorkTypeRow) => void;
  onDelete?: (item: WorkTypeRow) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function WorkTypeTable({
  workTypes,
  loading,
  onEdit,
  onDelete,
  hasMore = false,
  onLoadMore,
}: WorkTypeTableProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const root = el.closest('.crm-table-scroll');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore();
      },
      { root: root instanceof Element ? root : null, rootMargin: '160px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, workTypes.length]);
  if (loading) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <TableSkeleton variant="worktypes" rows={8} title="Loading work types" />
          </div>
          <div className="lg:hidden">
            <TableSkeleton variant="cards" rows={4} title="Loading work types" />
          </div>
        </div>
      </div>
    );
  }

  if (!workTypes.length) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <div className="figma-table-shell">
              <div className="figma-table-empty">
                <EmptyData
                  title="No work types yet"
                  description="Click Create Work Type to add your first work type and documents."
                  compact
                />
              </div>
            </div>
          </div>
          <div className="lg:hidden">
            <div className="figma-table-shell">
              <div className="figma-table-empty">
                <EmptyData
                  title="No work types yet"
                  description="Click Create Work Type to add your first work type and documents."
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-files-table-panel">
      <div className="crm-table-scroll">
      <div className="hidden lg:block">
        <FigmaTable>
          <FigmaHeaderRow>
            <FigmaCell variant="worktypename">
              <FigmaSortHeader label="Work Type" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="worktypedocs">
              <FigmaSortHeader label="Documents" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="worktypeactions">
              <FigmaSortHeader label="Actions" sortable={false} />
            </FigmaCell>
          </FigmaHeaderRow>

          {workTypes.map((item) => {
            const docCount = (item.documents || []).length;
            return (
              <FigmaBodyRow key={item.id}>
                <FigmaCell variant="worktypename">
                  <span className="figma-td-text" style={{ fontWeight: 500 }}>
                    {item.name}
                  </span>
                </FigmaCell>
                <FigmaCell variant="worktypedocs">
                  <span className="figma-td-text" style={{ color: '#667488' }}>
                    {docCount === 0
                      ? '—'
                      : `${docCount} document${docCount === 1 ? '' : 's'}`}
                  </span>
                </FigmaCell>
                <FigmaCell variant="worktypeactions">
                  <div className="figma-file-actions">
                    <button
                      type="button"
                      title="Edit work type"
                      className="figma-icon-btn"
                      onClick={() => onEdit?.(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <CrmEditIcon size={16} />
                    </button>
                    <button
                      type="button"
                      title="Delete work type"
                      className="figma-icon-btn figma-icon-btn--danger"
                      onClick={() => onDelete?.(item)}
                      aria-label={`Delete ${item.name}`}
                    >
                      <CrmTrashIcon size={16} />
                    </button>
                  </div>
                </FigmaCell>
              </FigmaBodyRow>
            );
          })}
        </FigmaTable>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {workTypes.map((item, index) => {
          const docCount = (item.documents || []).length;
          return (
            <article
              key={item.id}
              className="crm-staff-card crm-animate-in"
              style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
            >
              <div className="crm-staff-card-head">
                <div>
                  <p className="crm-staff-card-name">{item.name}</p>
                  <p className="crm-staff-card-email">
                    {docCount === 0
                      ? 'No documents'
                      : `${docCount} document${docCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="figma-file-actions">
                  <button
                    type="button"
                    title="Edit work type"
                    className="figma-icon-btn"
                    onClick={() => onEdit?.(item)}
                    aria-label={`Edit ${item.name}`}
                  >
                    <CrmEditIcon size={16} />
                  </button>
                  <button
                    type="button"
                    title="Delete work type"
                    className="figma-icon-btn figma-icon-btn--danger"
                    onClick={() => onDelete?.(item)}
                    aria-label={`Delete ${item.name}`}
                  >
                    <CrmTrashIcon size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
        {hasMore ? (
          <div ref={sentinelRef} className="py-3 lg:hidden" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}
