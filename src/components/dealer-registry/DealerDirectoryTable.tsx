import { CrmEditIcon } from '@/components/icons/CrmIcons';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import EmptyData from '../EmptyData';
import TableSkeleton from '../table/TableSkeleton';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from '../table/FigmaTable';

interface DealerDirectoryTableProps {
  dealers: DealerRegistryRecord[];
  loading: boolean;
  onEdit?: (item: DealerRegistryRecord) => void;
  emptyDescription?: string;
}

function locationLabel(item: DealerRegistryRecord): string {
  const parts = [item.city, item.state].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export default function DealerDirectoryTable({
  dealers,
  loading,
  onEdit,
  emptyDescription = 'Click Create Dealer to add your first dealer to the registry.',
}: DealerDirectoryTableProps) {
  if (loading) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <TableSkeleton variant="staff" rows={8} title="Loading dealers" />
          </div>
          <div className="lg:hidden">
            <TableSkeleton variant="cards" rows={4} title="Loading dealers" />
          </div>
        </div>
      </div>
    );
  }

  if (!dealers.length) {
    return (
      <div className="crm-files-table-panel">
        <div className="crm-table-scroll">
          <div className="hidden lg:block">
            <div className="figma-table-shell">
              <div className="figma-table-empty">
                <EmptyData
                  title="No dealers found"
                  description={emptyDescription}
                  illustration="dealer"
                  compact
                />
              </div>
            </div>
          </div>
          <div className="lg:hidden">
            <div className="figma-table-shell">
              <div className="figma-table-empty">
                <EmptyData
                  title="No dealers found"
                  description={emptyDescription}
                  illustration="dealer"
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
              <FigmaCell variant="staffname">
                <FigmaSortHeader label="Dealer" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="staffemail">
                <FigmaSortHeader label="Email" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="staffuser">
                <FigmaSortHeader label="Phone" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="staffstatus">
                <FigmaSortHeader label="Location" sortable={false} />
              </FigmaCell>
              <FigmaCell variant="staffactions">
                <FigmaSortHeader label="Actions" sortable={false} />
              </FigmaCell>
            </FigmaHeaderRow>

            {dealers.map((item) => (
              <FigmaBodyRow key={item.id}>
                <FigmaCell variant="staffname">
                  <span className="figma-td-text" style={{ fontWeight: 500 }}>
                    {item.name}
                  </span>
                </FigmaCell>
                <FigmaCell variant="staffemail">
                  <span className="figma-td-text">{item.email || '—'}</span>
                </FigmaCell>
                <FigmaCell variant="staffuser">
                  <span className="figma-td-text">{item.phone || '—'}</span>
                </FigmaCell>
                <FigmaCell variant="staffstatus">
                  <span className="figma-td-text" style={{ color: '#667488' }}>
                    {locationLabel(item)}
                  </span>
                </FigmaCell>
                <FigmaCell variant="staffactions">
                  <div className="figma-file-actions">
                    <button
                      type="button"
                      title="Edit dealer"
                      className="figma-icon-btn"
                      onClick={() => onEdit?.(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <CrmEditIcon size={16} />
                    </button>
                  </div>
                </FigmaCell>
              </FigmaBodyRow>
            ))}
          </FigmaTable>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
          {dealers.map((item, index) => (
            <article
              key={item.id}
              className="crm-staff-card crm-animate-in"
              style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
            >
              <div className="crm-staff-card-head">
                <div>
                  <p className="crm-staff-card-name">{item.name}</p>
                  <p className="crm-staff-card-email">{item.email}</p>
                  <p className="crm-staff-card-email">
                    {item.phone} · {locationLabel(item)}
                  </p>
                </div>
                <div className="figma-file-actions">
                  <button
                    type="button"
                    title="Edit dealer"
                    className="figma-icon-btn"
                    onClick={() => onEdit?.(item)}
                    aria-label={`Edit ${item.name}`}
                  >
                    <CrmEditIcon size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
