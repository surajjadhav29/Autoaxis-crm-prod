import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaTable,
  type FigmaCellVariant,
} from './FigmaTable';

export type SkeletonVariant =
  | 'files'
  | 'files-admin'
  | 'staff'
  | 'worktypes'
  | 'fieldagents'
  | 'cards';

interface TableSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
  title?: string;
}

const COLUMN_SETS: Record<SkeletonVariant, FigmaCellVariant[]> = {
  files: [
    'check',
    'client',
    'vehicle',
    'work',
    'dealer',
    'filedate',
    'filedocs',
    'filestatus',
    'fieldagent',
    'fileactions',
  ],
  'files-admin': [
    'check',
    'client',
    'vehicle',
    'work',
    'dealer',
    'filedate',
    'filedocs',
    'bill',
    'filestatus',
    'fieldagent',
    'assignee',
    'fileactions',
  ],
  staff: ['staffname', 'staffemail', 'staffuser', 'staffstatus', 'staffdate', 'stafflogin', 'staffactions'],
  worktypes: ['worktypename', 'worktypedocs', 'worktypeactions'],
  fieldagents: ['fieldagentname', 'fieldagentmobile', 'fieldagentrto', 'fieldagentaddress', 'fieldagentactions'],
  cards: ['client', 'filestatus'],
};

const BAR_WIDTH: Partial<Record<FigmaCellVariant, string>> = {
  vehicle: '72%',
  client: '78%',
  work: '68%',
  dealer: '70%',
  filedate: '64%',
  filedocs: '70%',
  bill: '58%',
  filestatus: '80%',
  assignee: '72%',
  fieldagent: '72%',
  fieldagentname: '70%',
  fieldagentmobile: '62%',
  fieldagentrto: '68%',
  fieldagentaddress: '75%',
  fieldagentactions: '70%',
  fileactions: '88%',
  staffname: '70%',
  staffemail: '82%',
  staffuser: '60%',
  staffstatus: '55%',
  staffdate: '62%',
  stafflogin: '72%',
  staffactions: '70%',
};

function SkeletonBar({ width }: { width: string }) {
  return <span className="table-skeleton-bar" style={{ width }} />;
}

export default function TableSkeleton({
  variant = 'files',
  rows = 8,
  title = 'Loading data',
}: TableSkeletonProps) {
  const columns = COLUMN_SETS[variant];

  return (
    <div className="table-skeleton-wrap" aria-busy="true" aria-live="polite">
      <FigmaTable>
        <FigmaHeaderRow>
          {columns.map((col) => (
            <FigmaCell key={`h-${col}`} variant={col}>
              <SkeletonBar width="48%" />
            </FigmaCell>
          ))}
        </FigmaHeaderRow>

        {Array.from({ length: rows }, (_, row) => (
          <FigmaBodyRow key={`r-${row}`}>
            {columns.map((col, colIndex) => {
              const base = BAR_WIDTH[col] || '70%';
              const pct = Number.parseInt(base, 10) - ((row + colIndex) % 3) * 6;
              return (
                <FigmaCell key={`c-${row}-${col}`} variant={col}>
                  <SkeletonBar width={`${Math.max(40, pct)}%`} />
                </FigmaCell>
              );
            })}
          </FigmaBodyRow>
        ))}
      </FigmaTable>

      <div className="table-skeleton-overlay">
        <div className="table-skeleton-overlay-card">
          <div className="figma-table-spinner" />
          <p className="table-skeleton-title">{title}</p>
        </div>
      </div>
    </div>
  );
}
