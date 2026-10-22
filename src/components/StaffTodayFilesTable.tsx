import { FILE_STATUSES, clientName } from '@/lib/constants';
import type { FileRecord } from '@/types/file.types';
import { getStatusPillClass } from '@/types/file.types';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from './table/FigmaTable';
import EmptyData from './EmptyData';
import StaffTodayFileCard from './StaffTodayFileCard';

function statusLabel(value: string): string {
  return FILE_STATUSES.find((s) => s.value === value)?.label || value;
}

interface TodayFilesTableProps {
  files: FileRecord[];
}

function TodayFilesTable({ files }: TodayFilesTableProps) {
  return (
    <FigmaTable>
      <FigmaHeaderRow>
        <FigmaCell variant="vehicle">
          <FigmaSortHeader label="File No" sortable={false} />
        </FigmaCell>
        <FigmaCell variant="vehicle">
          <FigmaSortHeader label="Vehicle No" sortable={false} />
        </FigmaCell>
        <FigmaCell variant="client">
          <FigmaSortHeader label="Client Name" sortable={false} />
        </FigmaCell>
        <FigmaCell variant="work">
          <FigmaSortHeader label="Work Type" sortable={false} />
        </FigmaCell>
        <FigmaCell variant="dealer">
          <FigmaSortHeader label="Dealer" sortable={false} />
        </FigmaCell>
        <FigmaCell variant="filestatus">
          <FigmaSortHeader label="Status" sortable={false} />
        </FigmaCell>
      </FigmaHeaderRow>

      {files.map((f) => (
        <FigmaBodyRow key={f.id}>
          <FigmaCell variant="vehicle">
            <span className="figma-td-text" style={{ fontWeight: 600 }}>{f.fileNumber}</span>
          </FigmaCell>
          <FigmaCell variant="vehicle">
            <span className="figma-td-text" style={{ fontWeight: 500 }}>{f.vehicleNo}</span>
          </FigmaCell>
          <FigmaCell variant="client">
            <span className="figma-td-text">{clientName(f)}</span>
          </FigmaCell>
          <FigmaCell variant="work">
            <span className="figma-td-text figma-td-text--alert">{f.workType}</span>
          </FigmaCell>
          <FigmaCell variant="dealer">
            <span className="figma-td-text" style={{ color: '#576579' }}>{f.dealerName}</span>
          </FigmaCell>
          <FigmaCell variant="filestatus">
            <span className={`${getStatusPillClass(f.status)} figma-file-status--readonly`}>
              {statusLabel(f.status)}
            </span>
          </FigmaCell>
        </FigmaBodyRow>
      ))}
    </FigmaTable>
  );
}

interface StaffTodayFilesTableProps {
  files: FileRecord[];
}

export default function StaffTodayFilesTable({ files }: StaffTodayFilesTableProps) {
  if (!files.length) {
    return (
      <div className="crm-staff-today-table">
        <div className="figma-table-shell">
          <div className="figma-table-empty">
            <EmptyData
              title="No new entries today"
              description="Files you create today will appear here."
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-staff-today-table">
      <div className="hidden lg:block">
        <div className="figma-table-shell">
          <TodayFilesTable files={files} />
        </div>
      </div>

      <div className="crm-staff-today-cards grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="crm-record-card-wrap crm-animate-in"
            style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
          >
            <StaffTodayFileCard file={file} />
          </div>
        ))}
      </div>
    </div>
  );
}
