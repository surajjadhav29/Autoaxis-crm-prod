import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CrmCheckIcon, CrmChevronDown } from '@/components/icons/CrmIcons';
import { FILE_STATUSES } from '@/lib/constants';
import { getStatusPillClass } from '@/types/file.types';
import type { FileStatus } from '@/types/file.types';

interface StatusSelectProps {
  value: FileStatus | string;
  onChange: (status: FileStatus) => void;
  /** When set, only these statuses appear in the menu (current value always kept). */
  allowedStatuses?: Array<FileStatus | string>;
  className?: string;
  'aria-label'?: string;
}

const DOT: Record<string, string> = {
  pending: 'bg-[#c40020]',
  in_progress: 'bg-[#c9a227]',
  objection: 'bg-[#5b5dd0]',
  paper_return: 'bg-[#576579]',
  on_hold: 'bg-[#1a73e8]',
  completed: 'bg-[#1d7f50]',
  done: 'bg-[#1d7f50]',
};

interface MenuPos {
  top: number;
  left: number;
  width: number;
}

export default function StatusSelect({
  value,
  onChange,
  allowedStatuses,
  className = '',
  'aria-label': ariaLabel = 'Update status',
}: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const label = FILE_STATUSES.find((s) => s.value === value)?.label || value;
  const options = allowedStatuses?.length
    ? FILE_STATUSES.filter(
        (s) => allowedStatuses.includes(s.value) || s.value === value
      )
    : FILE_STATUSES;

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(168, rect.width);
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    let top = rect.bottom + 4;
    const estimatedHeight = 260;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    }
    setMenuPos({ top, left, width: menuWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const menu =
    open && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }}
            className="fixed z-[80] m-0 list-none overflow-hidden rounded-lg border border-[#dbdfe5] bg-white p-1 shadow-[0_8px_24px_rgba(30,36,44,0.12)]"
          >
            {options.map((s) => {
              const selected = s.value === value;
              return (
                <li key={s.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium leading-4 text-[#1e242c]',
                      selected ? 'bg-[#e4e9fa] text-[#1a73e8]' : 'hover:bg-[#f9fafb]',
                    ].join(' ')}
                    onClick={() => {
                      onChange(s.value as FileStatus);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${DOT[s.value] || 'bg-[#667488]'}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    {selected ? <CrmCheckIcon size={14} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className={`relative inline-flex max-w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`${getStatusPillClass(value)} figma-status-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="figma-status-trigger-label">{label}</span>
        <CrmChevronDown open={open} />
      </button>
      {menu}
    </div>
  );
}
