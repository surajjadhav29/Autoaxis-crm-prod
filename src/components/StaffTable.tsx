import { CrmEditIcon, CrmTrashIcon } from '@/components/icons/CrmIcons';
import type { User } from '@/types/user.types';
import {
  FigmaBodyRow,
  FigmaCell,
  FigmaHeaderRow,
  FigmaSortHeader,
  FigmaTable,
} from './table/FigmaTable';
import EmptyData from './EmptyData';
import TableSkeleton from './table/TableSkeleton';

interface StaffTableProps {
  users: User[];
  loading: boolean;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

function roleLabel(role: string): string {
  return role === 'superadmin' ? 'Super Admin' : 'Staff';
}

function formatLoginAt(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function StaffTable({ users, loading, onEdit, onDelete }: StaffTableProps) {
  if (loading) {
    return (
      <>
        <div className="hidden lg:block">
          <TableSkeleton variant="staff" rows={8} title="Loading data" />
        </div>
        <div className="lg:hidden">
          <TableSkeleton variant="cards" rows={6} title="Loading data" />
        </div>
      </>
    );
  }

  if (!users.length) {
    return (
      <>
        <div className="hidden lg:block">
          <div className="figma-table-shell">
            <div className="figma-table-empty">
              <EmptyData
                title="No users yet"
                description="Click Create User to add your first team member."
                compact
              />
            </div>
          </div>
        </div>
        <div className="lg:hidden">
          <div className="figma-table-shell">
            <div className="figma-table-empty">
              <EmptyData
                title="No users yet"
                description="Click Create User to add your first team member."
                compact
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <FigmaTable>
          <FigmaHeaderRow>
            <FigmaCell variant="staffname">
              <FigmaSortHeader label="Name" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="staffemail">
              <FigmaSortHeader label="Email" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="staffuser">
              <FigmaSortHeader label="Username" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="staffstatus">
              <FigmaSortHeader label="Status" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="staffdate">
              <FigmaSortHeader label="Created" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="stafflogin">
              <FigmaSortHeader label="Last Login" sortable={false} />
            </FigmaCell>
            <FigmaCell variant="staffactions">
              <FigmaSortHeader label="Actions" sortable={false} />
            </FigmaCell>
          </FigmaHeaderRow>

          {users.map((user) => (
            <FigmaBodyRow key={user.id}>
              <FigmaCell variant="staffname">
                <span className="figma-td-text" style={{ fontWeight: 500 }}>
                  {user.fullName}
                </span>
              </FigmaCell>
              <FigmaCell variant="staffemail">
                <span className="figma-td-text" style={{ color: '#667488' }}>
                  {user.email}
                </span>
              </FigmaCell>
              <FigmaCell variant="staffuser">
                <span className="figma-td-text figma-td-text--mono">{user.username}</span>
              </FigmaCell>
              <FigmaCell variant="staffstatus">
                <div className="figma-staff-status">
                  <span
                    className={`figma-license-pill ${
                      user.isActive ? 'figma-license-pill--active' : 'figma-license-pill--expired'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </FigmaCell>
              <FigmaCell variant="staffdate">
                <span className="figma-td-text" style={{ color: '#667488' }}>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-IN')
                    : '—'}
                </span>
              </FigmaCell>
              <FigmaCell variant="stafflogin">
                <span className="figma-td-text" style={{ color: '#667488' }}>
                  {formatLoginAt(user.lastLoginAt)}
                </span>
              </FigmaCell>
              <FigmaCell variant="staffactions">
                <div className="figma-file-actions">
                  <button
                    type="button"
                    title="Edit user"
                    className="figma-icon-btn"
                    onClick={() => onEdit?.(user)}
                    aria-label={`Edit ${user.fullName}`}
                  >
                    <CrmEditIcon size={16} />
                  </button>
                  <button
                    type="button"
                    title="Delete user"
                    className="figma-icon-btn figma-icon-btn--danger"
                    onClick={() => onDelete?.(user)}
                    aria-label={`Delete ${user.fullName}`}
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
        {users.map((user, index) => (
          <article
            key={user.id}
            className="crm-staff-card crm-animate-in"
            style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
          >
            <div className="crm-staff-card-head">
              <div>
                <p className="crm-staff-card-name">{user.fullName}</p>
                <p className="crm-staff-card-email">{user.email}</p>
              </div>
              <div className="crm-staff-card-head-actions">
                <div className="figma-staff-status">
                  <span
                    className={`figma-license-pill ${
                      user.isActive ? 'figma-license-pill--active' : 'figma-license-pill--expired'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="figma-file-actions">
                  <button
                    type="button"
                    title="Edit user"
                    className="figma-icon-btn"
                    onClick={() => onEdit?.(user)}
                    aria-label={`Edit ${user.fullName}`}
                  >
                    <CrmEditIcon size={16} />
                  </button>
                  <button
                    type="button"
                    title="Delete user"
                    className="figma-icon-btn figma-icon-btn--danger"
                    onClick={() => onDelete?.(user)}
                    aria-label={`Delete ${user.fullName}`}
                  >
                    <CrmTrashIcon size={16} />
                  </button>
                </div>
              </div>
            </div>
            <dl className="crm-record-card-grid">
              <div className="crm-record-card-field">
                <dt>Username</dt>
                <dd className="figma-td-text--mono">{user.username}</dd>
              </div>
              <div className="crm-record-card-field">
                <dt>Role</dt>
                <dd>{roleLabel(user.role)}</dd>
              </div>
              <div className="crm-record-card-field">
                <dt>Created</dt>
                <dd>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-IN')
                    : '—'}
                </dd>
              </div>
              <div className="crm-record-card-field">
                <dt>Last Login</dt>
                <dd>{formatLoginAt(user.lastLoginAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
