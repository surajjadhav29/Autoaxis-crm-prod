import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CrmChevronLeft,
  CrmChevronRight,
  CrmPaginationChevronDown,
} from '@/components/icons/CrmIcons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showPageSize?: boolean;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: Math.max(total, 1) }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) pages.push(p);

  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);

  return pages;
}

const pageBtnClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[#e7eaee] text-[11px] font-medium leading-4 text-[#1e242c] disabled:cursor-not-allowed disabled:opacity-40';

function PageSizeSelect({
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: {
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(72, rect.width + 24);
    const estimatedHeight = pageSizeOptions.length * 36 + 10;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const top = openUp ? Math.max(8, rect.top - estimatedHeight - 4) : rect.bottom + 4;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setMenuPos({ top, left, width, openUp });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, pageSizeOptions.length]);

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
            aria-label="Results per page"
            style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }}
            className="fixed z-[80] m-0 list-none overflow-hidden rounded-lg border border-[#dbdfe5] bg-white p-1 shadow-[0_8px_24px_rgba(30,36,44,0.12)]"
          >
            {pageSizeOptions.map((size) => {
              const selected = size === pageSize;
              return (
                <li key={size} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center justify-center rounded-md px-3 py-2 text-center text-[12px] font-medium leading-4 text-[#1e242c]',
                      selected ? 'bg-[#1a73e8] text-white' : 'hover:bg-[#f3f5f7]',
                    ].join(' ')}
                    onClick={() => {
                      onPageSizeChange(size);
                      setOpen(false);
                    }}
                  >
                    {size}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[
          'inline-flex h-8 min-w-[52px] items-center justify-center gap-1 rounded-md border border-solid bg-white px-2',
          'text-[11px] font-medium leading-4 text-[#1e242c] transition-colors',
          open ? 'border-[#1a73e8] ring-2 ring-[#1a73e8]/20' : 'border-[#dbdfe5] hover:border-[#c5cad3]',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Results per page"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-[14px] text-center tabular-nums">{pageSize}</span>
        <span className="inline-flex text-[#667488]">
          <CrmPaginationChevronDown open={open} />
        </span>
      </button>
      {menu}
    </>
  );
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageSizeChange,
  showPageSize = true,
}: PaginationProps) {
  const safeTotal = Math.max(totalPages, 1);
  const pages = getPageNumbers(currentPage, safeTotal);

  return (
    <div className="box-border flex h-11 w-full shrink-0 items-center justify-between gap-2 border-t border-[#dbdfe5] bg-white px-3 py-1 md:h-16 md:gap-4 md:px-4 md:py-4">
      {showPageSize && pageSize != null && onPageSizeChange ? (
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <span className="hidden whitespace-nowrap text-[11px] font-normal leading-4 text-[#576579] sm:inline">
            Show
          </span>

          <PageSizeSelect
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
          />

          <span className="whitespace-nowrap text-[11px] font-normal leading-4 text-[#576579]">
            <span className="sm:hidden">/ page</span>
            <span className="hidden sm:inline">results per page</span>
          </span>
        </div>
      ) : (
        <div />
      )}

      <nav
        className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto"
        aria-label="Pagination"
      >
        <button
          type="button"
          className={pageBtnClass}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <CrmChevronLeft />
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex size-8 items-center justify-center text-[11px] font-medium leading-4 text-[#1e242c]"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`${pageBtnClass} ${
                p === currentPage ? 'bg-[#1a73e8] text-white' : ''
              }`}
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className={pageBtnClass}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotal}
          aria-label="Next page"
        >
          <CrmChevronRight />
        </button>
      </nav>
    </div>
  );
}
