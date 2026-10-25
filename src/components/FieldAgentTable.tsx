import { useEffect, useRef } from 'react';
import { CrmEditIcon, CrmTrashIcon } from '@/components/icons/CrmIcons';
import EmptyData from './EmptyData';
import TableSkeleton from './table/TableSkeleton';
import type { FieldAgentOffice } from '@/types/fieldAgent.types';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from './table/FigmaTable';

interface FieldAgentTableProps {
  offices: FieldAgentOffice[];
  loading: boolean;
  onEdit?: (office: FieldAgentOffice) => void;
  onDelete?: (office: FieldAgentOffice) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function FieldAgentTable({
  offices,
  loading,
  onEdit,
  onDelete,
  hasMore = false,
  onLoadMore,
  emptyTitle = 'No field agents yet',
  emptyDescription = 'Add district RTO contacts here — they are used to track files, not CRM login users.',
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
  }, [hasMore, onLoadMore, offices.length]);

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

  if (!offices.length) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="figma-table-shell">
            <div className="figma-table-empty">
              <EmptyData title={emptyTitle} description={emptyDescription} compact />
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
              <FigmaCell variant="fieldagentrto">
                <FigmaSortHeader label="RTO" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentname">
                <FigmaSortHeader label="Field Agent 1" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentmobile">
                <FigmaSortHeader label="Mobile 1" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentdesc">
                <FigmaSortHeader label="Description 1" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentname">
                <FigmaSortHeader label="Field Agent 2" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentmobile">
                <FigmaSortHeader label="Mobile 2" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentdesc">
                <FigmaSortHeader label="Description 2" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentaddress">
                <FigmaSortHeader label="Address" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="fieldagentactions">
                <FigmaSortHeader label="Actions" sortable={false} />
              </FigmaCell>
            </FigmaHeaderRow>

            {offices.map((office) => {
              const a1 = office.agents[0];
              const a2 = office.agents[1];
              return (
                <FigmaBodyRow key={office.id}>
                  <FigmaCell variant="fieldagentrto">
                    <span className="figma-td-text" style={{ fontWeight: 500 }}>
                      {office.rtoName || '—'}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentname">
                    <span className="figma-td-text">{a1?.name || '—'}</span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentmobile">
                    <span className="figma-td-text font-mono text-[12px]">
                      {a1?.mobile || '—'}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentdesc">
                    <span
                      className="figma-td-text text-[#667488]"
                      title={a1?.description?.trim() || undefined}
                    >
                      {a1?.description?.trim() || '—'}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentname">
                    <span className="figma-td-text text-[#667488]">{a2?.name || '—'}</span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentmobile">
                    <span className="figma-td-text font-mono text-[12px] text-[#667488]">
                      {a2?.mobile || '—'}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentdesc">
                    <span
                      className="figma-td-text text-[#667488]"
                      title={a2?.description?.trim() || undefined}
                    >
                      {a2?.description?.trim() || '—'}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentaddress">
                    <span
                      className="figma-td-text text-[#667488]"
                      title={office.address?.trim() || undefined}
                    >
                      {office.address?.trim() || '—'}
                    </span>
                  </FigmaCell>
                  <FigmaCell variant="fieldagentactions">
                    <div className="figma-file-actions">
                      <button
                        type="button"
                        title="Edit field agents"
                        className="figma-icon-btn"
                        onClick={() => onEdit?.(office)}
                        aria-label={`Edit ${office.rtoName}`}
                      >
                        <CrmEditIcon size={16} />
                      </button>
                      <button
                        type="button"
                        title="Delete field agent entry"
                        className="figma-icon-btn figma-icon-btn--danger"
                        onClick={() => onDelete?.(office)}
                        aria-label={`Delete ${office.rtoName}`}
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
          {offices.map((office, index) => {
            const a1 = office.agents[0];
            const a2 = office.agents[1];
            return (
              <article
                key={office.id}
                className="crm-staff-card crm-animate-in"
                style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
              >
                <div className="crm-staff-card-head">
                  <div>
                    <p className="crm-staff-card-name">{office.rtoName || '—'}</p>
                    <p className="crm-staff-card-email">
                      {a1
                        ? [a1.name, a1.mobile || null, a1.description?.trim() || null]
                            .filter(Boolean)
                            .join(' · ')
                        : 'No agent 1'}
                    </p>
                    {a2 ? (
                      <p className="crm-staff-card-email m-0 mt-1">
                        {[a2.name, a2.mobile || null, a2.description?.trim() || null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
                    {office.address?.trim() ? (
                      <p className="crm-staff-card-email m-0 mt-1 whitespace-pre-line text-[#667488]">
                        {office.address.trim()}
                      </p>
                    ) : null}
                  </div>
                  <div className="figma-file-actions">
                    <button
                      type="button"
                      title="Edit field agents"
                      className="figma-icon-btn"
                      onClick={() => onEdit?.(office)}
                      aria-label={`Edit ${office.rtoName}`}
                    >
                      <CrmEditIcon size={16} />
                    </button>
                    <button
                      type="button"
                      title="Delete field agent entry"
                      className="figma-icon-btn figma-icon-btn--danger"
                      onClick={() => onDelete?.(office)}
                      aria-label={`Delete ${office.rtoName}`}
                    >
                      <CrmTrashIcon size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {hasMore ? <div ref={sentinelRef} className="py-3 lg:hidden" aria-hidden /> : null}
      </div>
    </div>
  );
}
