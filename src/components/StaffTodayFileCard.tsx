import { FILE_STATUSES, clientName } from '@/lib/constants';
import { formatDisplayDate } from '@/lib/fileDates';
import type { FileRecord } from '@/types/file.types';
import { getStatusPillClass } from '@/types/file.types';

function statusLabel(value: string): string {
  return FILE_STATUSES.find((s) => s.value === value)?.label || value;
}

interface StaffTodayFileCardProps {
  file: FileRecord;
}

export default function StaffTodayFileCard({ file }: StaffTodayFileCardProps) {
  return (
    <article className="crm-record-card crm-record-card--readonly">
      <div className="crm-record-card-head">
        <div className="crm-record-card-title">
          <p className="crm-record-card-vehicle">{file.vehicleNo}</p>
          <p className="crm-record-card-client">{clientName(file)}</p>
        </div>
        <span
          className={`${getStatusPillClass(file.status)} figma-file-status--readonly crm-record-card-status`}
        >
          {statusLabel(file.status)}
        </span>
      </div>

      <dl className="crm-record-card-grid">
        <div className="crm-record-card-field">
          <dt>File No</dt>
          <dd>{file.fileNumber}</dd>
        </div>
        <div className="crm-record-card-field">
          <dt>Work Type</dt>
          <dd className="figma-td-text--alert">{file.workType}</dd>
        </div>
        <div className="crm-record-card-field">
          <dt>Dealer</dt>
          <dd>{file.dealerName}</dd>
        </div>
        <div className="crm-record-card-field">
          <dt>Date</dt>
          <dd>{formatDisplayDate(file.date)}</dd>
        </div>
      </dl>
    </article>
  );
}
