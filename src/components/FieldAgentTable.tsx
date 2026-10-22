import { useEffect, useRef } from 'react';
import { CrmEditIcon, CrmTrashIcon } from '@/components/icons/CrmIcons';
import EmptyData from './EmptyData';
import TableSkeleton from './table/TableSkeleton';
import { fieldAgentRtoLabel } from '@/services/fieldAgentService';
import type { FieldAgent } from '@/types/fieldAgent.types';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from './table/FigmaTable';

interface FieldAgentTableProps {
  agents: FieldAgent[];
  loading: boolean;
  onEdit?: (item: FieldAgent) => void;
  onDelete?: (item: FieldAgent) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function FieldAgentTable({
  agents,
  loading,
  onEdit,
  onDelete,
  hasMore = false,
  onLoadMore,
}: FieldAgentTableProps) {
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
  }, [hasMore, onLoadMore, agents.length]);

  if (loading) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <TableSkeleton variant="fieldagents" rows={8} title="Loading field agents" />
          </div>
          <div className="lg:hidden">
            <TableSkeleton variant="cards" rows={4} title="Loading field agents" />
          </div>
        </div>
      </div>
    );
  }

  if (!agents.length) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="figma-table-shell">
            <div className="figma-table-empty">
              <EmptyData
                title="No field agents yet"
                description="Add district RTO contacts here — they are used to track files, not CRM login users."
                compact
              />
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
              <FigmaCell variant="fieldagentname">
                <FigmaSortHeader label="Name" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentmobile">
                <FigmaSortHeader label="Mobile" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentrto">
                <FigmaSortHeader label="RTO" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentaddress">
                <FigmaSortHeader label="Address" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentactions">
                <FigmaSortHeader label="Actions" sortable={false} />
              </FigmaCell>
            </FigmaHeaderRow>

            {agents.map((item) => (
              <FigmaBodyRow key={item.id}>
                <FigmaCell variant="fieldagentname">
                  <span className="figma-td-text" style={{ fontWeight: 500 }}>
                    {item.name}
                  </span>
                </FigmaCell>
                <FigmaCell variant="fieldagentmobile">
                  <span className="figma-td-text font-mono text-[12px]">{item.mobile || '—'}</span>
                </FigmaCell>
                <FigmaCell variant="fieldagentrto">
                  <span className="figma-td-text" style={{ color: '#667488' }}>
                    {fieldAgentRtoLabel(item) || '—'}
                  </span>
                </FigmaCell>
                <FigmaCell variant="fieldagentaddress">
                  <span
                    className="figma-td-text text-[#667488]"
                    title={item.address?.trim() || undefined}
                  >
                    {item.address?.trim() || '—'}
                  </span>
                </FigmaCell>
                <FigmaCell variant="fieldagentactions">
                  <div className="figma-file-actions">
                    <button
                      type="button"
                      title="Edit field agent"
                      className="figma-icon-btn"
                      onClick={() => onEdit?.(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <CrmEditIcon size={16} />
                    </button>
                    <button
                      type="button"
                      title="Delete field agent"
                      className="figma-icon-btn figma-icon-btn--danger"
                      onClick={() => onDelete?.(item)}
                      aria-label={`Delete ${item.name}`}
                    >
                      <CrmTrashIcon size={16} />
                    </button>
                  </div>
                </FigmaCell>
              </FigmaBodyRow>
            ))}
          </FigmaTable>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
          {agents.map((item, index) => (
            <article
              key={item.id}
              className="crm-staff-card crm-animate-in"
              style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
            >
              <div className="crm-staff-card-head">
                <div>
                  <p className="crm-staff-card-name">{item.name}</p>
                  <p className="crm-staff-card-email">
                    {item.mobile || '—'} · {fieldAgentRtoLabel(item) || 'No RTO'}
                  </p>
                  {item.address?.trim() ? (
                    <p className="crm-staff-card-email m-0 mt-1 whitespace-pre-line text-[#667488]">
                      {item.address.trim()}
                    </p>
                  ) : null}
                </div>
                <div className="figma-file-actions">
                  <button
                    type="button"
                    title="Edit field agent"
                    className="figma-icon-btn"
                    onClick={() => onEdit?.(item)}
                    aria-label={`Edit ${item.name}`}
                  >
                    <CrmEditIcon size={16} />
                  </button>
                  <button
                    type="button"
                    title="Delete field agent"
                    className="figma-icon-btn figma-icon-btn--danger"
                    onClick={() => onDelete?.(item)}
                    aria-label={`Delete ${item.name}`}
                  >
                    <CrmTrashIcon size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {hasMore ? <div ref={sentinelRef} className="py-3 lg:hidden" aria-hidden /> : null}
      </div>
    </div>
  );
}
