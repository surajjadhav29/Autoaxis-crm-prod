import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CrmCheckIcon, CrmChevronDown } from '@/components/icons/CrmIcons';
import type { User } from '@/types/user.types';

interface AssigneeSelectProps {
  value: string;
  users: User[];
  onChange: (userId: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
}

export default function AssigneeSelect({
  value,
  users,
  onChange,
  disabled = false,
  className = '',
  'aria-label': ariaLabel = 'Assign to user',
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = users.find((u) => u.id === value);
  const label = selected?.fullName || 'Unassigned';

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(200, rect.width);
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    let top = rect.bottom + 4;
    const estimatedHeight = 280;
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
            className="fixed z-[80] m-0 max-h-[280px] list-none overflow-auto rounded-lg border border-[#dbdfe5] bg-white p-1 shadow-[0_8px_24px_rgba(30,36,44,0.12)]"
          >
            {users.length === 0 ? (
              <li className="px-2.5 py-2 text-[12px] text-[#667488]">No users</li>
            ) : (
              users.map((u) => {
                const isSelected = u.id === value;
                return (
                  <li key={u.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-medium leading-4 text-[#1e242c]',
                        isSelected ? 'bg-[#e4e9fa] text-[#1a73e8]' : 'hover:bg-[#f9fafb]',
                      ].join(' ')}
                      onClick={() => {
                        if (u.id !== value) onChange(u.id);
                        setOpen(false);
                      }}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e4e9fa] text-[10px] font-semibold text-[#1a73e8]">
                        {(u.fullName || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{u.fullName}</span>
                        <span className="truncate text-[10px] font-normal text-[#667488]">
                          {u.role === 'superadmin' ? 'Admin' : 'Staff'}
                        </span>
                      </span>
                      {isSelected ? <CrmCheckIcon size={14} /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className={`relative inline-flex max-w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className="figma-assignee-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="figma-assignee-trigger-label">{label}</span>
        <CrmChevronDown open={open} />
      </button>
      {menu}
    </div>
  );
}
