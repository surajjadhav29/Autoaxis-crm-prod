import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NoResultsInline } from '@/components/EmptyStateIllustration';
import { Check, ChevronDown, Search } from 'lucide-react';

const MENU_MAX = 280;
const MENU_MIN = 180;
const VIEWPORT_PAD = 12;

interface MenuPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export type FilterOption = string | { value: string; label: string };

interface NormalizedOption {
  value: string;
  label: string;
}

function normalizeOptions(options: FilterOption[]): NormalizedOption[] {
  return options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : { value: opt.value, label: opt.label }
  );
}

interface FilterSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  compact?: boolean;
  searchPlaceholder?: string;
}

/** Compact searchable filter dropdown (same UX as RTO / Work Type filters). */
export function FilterSelect({
  id = 'filter-select',
  label = '',
  value,
  onChange,
  options,
  allowEmpty = true,
  emptyLabel = 'All',
  placeholder = 'Select',
  compact = true,
  searchPlaceholder = 'Search…',
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [query, normalized]);

  const selectedLabel = normalized.find((opt) => opt.value === value)?.label || '';

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, compact ? 180 : 220);
    const left = Math.min(Math.max(VIEWPORT_PAD, rect.left), window.innerWidth - width - VIEWPORT_PAD);
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const openUp = spaceBelow < MENU_MIN && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(MENU_MIN, Math.min(MENU_MAX, available));
    const top = openUp ? Math.max(VIEWPORT_PAD, rect.top - maxHeight - 6) : rect.bottom + 6;
    setMenuPos({ top, left, width, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const displayValue = value ? selectedLabel || value : allowEmpty ? emptyLabel : '';

  let triggerBorderClass = 'border-[#d8dde5]';
  if (open) {
    triggerBorderClass = 'border-[#1a73e8] shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';
  }

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-[#dbdfe5] bg-white shadow-[0_12px_28px_rgba(14,16,19,0.18)]"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              height: menuPos.maxHeight,
              maxHeight: menuPos.maxHeight,
            }}
            role="listbox"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-[#eef0f3] p-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[#9aa3b2]"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-[#dbdfe5] bg-[#f9fafb] py-0 pr-3 pl-8 text-[13px] text-[#1e242c] outline-none placeholder:text-[#9aa3b2] focus:border-[#1a73e8] focus:bg-white"
                />
              </div>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:thin] [scrollbar-color:#c5ccd6_transparent]"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-0.5">
                {allowEmpty ? (
                  <button
                    type="button"
                    className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f3f4f6] ${
                      !value ? 'bg-[#1a73e8]/8 font-medium text-[#1a73e8]' : 'text-[#1e242c]'
                    }`}
                    role="option"
                    aria-selected={!value}
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                  >
                    <span>{emptyLabel}</span>
                    {!value ? <Check size={15} strokeWidth={2.5} /> : null}
                  </button>
                ) : null}

                {filtered.length === 0 ? (
                  <div className="px-2 py-4">
                    <NoResultsInline />
                  </div>
                ) : (
                  filtered.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#1e242c] hover:bg-[#f3f4f6] ${
                          selected ? 'bg-[#1a73e8]/8 font-medium text-[#1a73e8]' : ''
                        }`}
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                      >
                        <span className="min-w-0 truncate">{opt.label}</span>
                        {selected ? <Check size={15} strokeWidth={2.5} className="shrink-0" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[13px] leading-[1.3] font-medium text-[#3d4654]">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className={`flex w-full items-center justify-between gap-2 border bg-white text-left transition hover:border-[#c5cad3] ${
            compact
              ? 'min-h-10 rounded-lg px-3.5 py-2 text-[13px] font-medium'
              : 'min-h-11 rounded-[10px] px-3.5 py-2.5 text-sm'
          } ${triggerBorderClass}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={value || allowEmpty ? 'truncate text-[#1e242c]' : 'text-[#9aa3b2]'}>
            {displayValue || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#667488] transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {menu}
      </div>
    </div>
  );
}
