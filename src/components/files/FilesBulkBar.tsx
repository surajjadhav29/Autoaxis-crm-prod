import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { FILE_STATUSES } from '@/lib/constants';
import { getAllowedStatusValues } from '@/lib/whatsapp';
import { FigmaCheckbox } from '@/components/table/FigmaTable';
import type { FileRecord } from '@/types/file.types';
import type { User } from '@/types/user.types';

const BULK_STATUSES = FILE_STATUSES.filter((s) => s.value !== 'objection');

interface MenuItem {
  value: string;
  label: string;
}

function statusItemsFor(files: FileRecord[]) {
  if (!files?.length) return BULK_STATUSES;
  return BULK_STATUSES.filter((s) =>
    files.every((file) => getAllowedStatusValues(file).includes(s.value))
  );
}

interface BulkMenuProps {
  anchorRef: RefObject<HTMLButtonElement | null>;
  items: MenuItem[];
  empty: string;
  onPick: (value: string) => void;
  onClose: () => void;
}

function BulkMenu({ anchorRef, items, empty, onPick, onClose }: BulkMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 240;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    let top = rect.bottom + 6;
    if (top + 280 > window.innerHeight - 8) {
      top = Math.max(8, rect.top - 280 - 6);
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    updatePosition();
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div ref={menuRef} className="crm-bulk-menu" style={{ top: pos.top, left: pos.left }} role="menu">
      {items.length ? (
        items.map((item) => (
          <button
            key={item.value}
            type="button"
            className="crm-bulk-menu-item"
            role="menuitem"
            onClick={() => onPick(item.value)}
          >
            {item.label}
          </button>
        ))
      ) : (
        <p className="crm-bulk-menu-empty">{empty}</p>
      )}
    </div>,
    document.body
  );
}

interface FilesBulkBarProps {
  count: number;
  pageCount?: number;
  allSelected?: boolean;
  isAdmin: boolean;
  users: User[];
  selectedFiles?: FileRecord[];
  busy: boolean;
  onAssign: (userId: string) => void;
  onStatus: (status: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onToggleSelectAll?: () => void;
}

export default function FilesBulkBar({
  count,
  pageCount = 0,
  allSelected = false,
  isAdmin,
  users,
  selectedFiles = [],
  busy,
  onAssign,
  onStatus,
  onDelete,
  onClear,
  onToggleSelectAll,
}: FilesBulkBarProps) {
  const disabled = busy || count === 0;
  const [open, setOpen] = useState<'assign' | 'status' | null>(null);
  const assignRef = useRef<HTMLButtonElement | null>(null);
  const statusRef = useRef<HTMLButtonElement | null>(null);
  const statusItems = statusItemsFor(selectedFiles);

  const close = () => setOpen(null);

  useEffect(() => {
    if (disabled) setOpen(null);
  }, [disabled]);

  return (
    <div className="crm-bulk-bar print:hidden">
      <div className="flex items-center justify-between gap-3 md:contents">
        <label className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-[#2c3340] lg:hidden">
          <FigmaCheckbox
            checked={allSelected && pageCount > 0}
            label="Select all files on this page"
            onChange={() => onToggleSelectAll?.()}
          />
          <span>Select all</span>
        </label>
        {count ? (
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#576579] md:hidden">
            <span>{count} selected</span>
            <button type="button" className="crm-bulk-clear" disabled={busy} onClick={onClear}>
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <div className={`crm-bulk-bar-actions${isAdmin ? '' : ' crm-bulk-bar-actions--staff'}`}>
        {isAdmin ? (
          <button
            ref={assignRef}
            type="button"
            className={`crm-bulk-link ${open === 'assign' ? 'crm-bulk-link--active' : ''}`}
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={open === 'assign'}
            onClick={() => setOpen((v) => (v === 'assign' ? null : 'assign'))}
          >
            <UserPlus size={16} strokeWidth={1.75} />
            Assign
          </button>
        ) : null}

        <button
          ref={statusRef}
          type="button"
          className={`crm-bulk-link ${open === 'status' ? 'crm-bulk-link--active' : ''}`}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open === 'status'}
          onClick={() => setOpen((v) => (v === 'status' ? null : 'status'))}
        >
          <RefreshCw size={16} strokeWidth={1.75} />
          <span className="md:hidden">Status</span>
          <span className="hidden md:inline">Change status</span>
        </button>

        <button
          type="button"
          className="crm-bulk-link"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 size={16} strokeWidth={1.75} />
          <span className="md:hidden">Delete</span>
          <span className="hidden md:inline">Delete all</span>
        </button>
      </div>

      {count ? (
        <div className="crm-bulk-bar-meta hidden md:flex">
          <span>{count} selected</span>
          <button type="button" className="crm-bulk-clear" disabled={busy} onClick={onClear}>
            Clear
          </button>
        </div>
      ) : null}

      {open === 'assign' ? (
        <BulkMenu
          anchorRef={assignRef}
          items={(users || []).map((u) => ({ value: u.id, label: u.fullName }))}
          empty="No users"
          onPick={(userId) => {
            onAssign(userId);
            close();
          }}
          onClose={close}
        />
      ) : null}

      {open === 'status' ? (
        <BulkMenu
          anchorRef={statusRef}
          items={statusItems.map((s) => ({ value: s.value, label: s.label }))}
          empty="No status applies to all selected files"
          onPick={(status) => {
            onStatus(status);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
