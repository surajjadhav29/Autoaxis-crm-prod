import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useField } from 'formik';
import { RTOS } from '@/lib/constants';
import { fetchRtos, createRto } from '@/services/rtoService';
import { rtoMatchKey } from '@/services/fieldAgentService';

/** Compact scrollable height — same pattern as Work Type / filter drawers. */
const MENU_MAX = 280;
const MENU_MIN = 180;
const VIEWPORT_PAD = 12;

// An RTO's identity is its office code (e.g. "MH22"), so "MH22", "MH22-PARBHANI"
// and "MH22 - PARBHANI" are all treated as the same RTO.
function rtoKey(name: string) {
  return name.trim().toUpperCase().split(/[\s-]+/)[0];
}

/** Custom (DB) RTOs first so newly added offices like Delhi are visible without scrolling. */
function mergeRtos(custom: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rto of [...custom, ...RTOS]) {
    const key = rtoKey(rto);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rto);
  }
  return out;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

interface RtoSelectBaseProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  id?: string;
  /** Compact trigger for toolbar/filter bars */
  compact?: boolean;
  /** Show an "Add RTO" option at the bottom of the drawer */
  allowCreate?: boolean;
  /** RTO match keys (e.g. MH12) that cannot be selected — one field agent per office. */
  disabledRtoMatchKeys?: Set<string>;
  disabledRtoTitle?: string;
}

export function RtoSelectControl({
  label = 'RTO office',
  required,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Select RTO',
  allowEmpty = false,
  emptyLabel = 'All RTO',
  id = 'rto-select',
  compact = false,
  allowCreate = false,
  disabledRtoMatchKeys,
  disabledRtoTitle = 'This RTO already has a field agent',
}: RtoSelectBaseProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customRtos, setCustomRtos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRtos()
      .then((items: { name: string }[]) => setCustomRtos(items.map((r) => r.name)))
      .catch(() => {});
  }, []);

  const options = useMemo(() => mergeRtos(customRtos), [customRtos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((rto) => rto.toLowerCase().includes(q));
  }, [query, options]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const left = Math.min(Math.max(VIEWPORT_PAD, rect.left), window.innerWidth - width - VIEWPORT_PAD);
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    // Prefer opening upward when the field sits near the bottom of the page.
    const openUp = spaceBelow < MENU_MIN && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(MENU_MIN, Math.min(MENU_MAX, available));
    const top = openUp ? Math.max(VIEWPORT_PAD, rect.top - maxHeight - 6) : rect.bottom + 6;
    setMenuPos({ top, left, width, maxHeight, openUp });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updatePosition();
  }, [open, allowCreate, adding]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setAdding(false);
      onBlur?.();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setAdding(false);
      }
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
  }, [open, onBlur, allowCreate]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setAdding(false);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (adding) requestAnimationFrame(() => addInputRef.current?.focus());
  }, [adding]);

  const close = () => {
    setOpen(false);
    setAdding(false);
    onBlur?.();
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError('RTO name is required.');
      return;
    }

    // If this RTO already exists (built-in or custom), just select it instead of
    // creating a duplicate with different spacing.
    const key = rtoKey(trimmed);
    const existing = options.find((rto) => rtoKey(rto) === key);
    if (existing) {
      onChange(existing);
      setAdding(false);
      setNewName('');
      close();
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const rto = await createRto(trimmed);
      setCustomRtos((prev) => Array.from(new Set([rto.name, ...prev])));
      onChange(rto.name);
      setAdding(false);
      setNewName('');
      close();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to create RTO.');
    } finally {
      setCreating(false);
    }
  };

  let triggerBorderClass = 'border-[#d8dde5]';
  if (open) {
    triggerBorderClass = 'border-[#1a73e8] shadow-[0_0_0_3px_rgba(26,115,232,0.14)]';
  } else if (error) {
    triggerBorderClass = 'border-[#dc0024]';
  }

  const displayValue = value || (allowEmpty ? emptyLabel : '');

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
                  placeholder="Search RTO code or name…"
                  className="h-9 w-full rounded-lg border border-[#dbdfe5] bg-[#f9fafb] py-0 pr-3 pl-8 text-[13px] text-[#1e242c] outline-none placeholder:text-[#9aa3b2] focus:border-[#1a73e8] focus:bg-white"
                />
              </div>
            </div>

            {allowCreate ? (
              <div className="shrink-0 border-b border-[#eef0f3] p-1.5">
                {adding ? (
                  <div className="flex items-stretch gap-2 p-1">
                    <input
                      ref={addInputRef}
                      className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#1a73e8] px-3 py-2 text-[13px] text-[#1e242c] shadow-[0_0_0_3px_rgba(26,115,232,0.14)] outline-none"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreate();
                        }
                      }}
                      placeholder="e.g. MH22 - BARAMATI"
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#1a73e8] px-4 text-[13px] font-medium text-white transition hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleCreate}
                      disabled={creating}
                    >
                      {creating ? 'Adding…' : 'Done'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg bg-[#f2f7fe] px-3 py-2.5 text-sm font-medium text-[#1a73e8] hover:bg-[#e6f0fd]"
                    onClick={() => {
                      setNewName('');
                      setCreateError('');
                      setAdding(true);
                    }}
                  >
                    <Plus size={15} strokeWidth={2} />
                    Add new RTO
                  </button>
                )}
                {createError ? (
                  <p className="m-0 px-1 pt-1 text-xs font-medium text-[#dc0024]">{createError}</p>
                ) : null}
              </div>
            ) : null}

            <div
              ref={listRef}
              className="rto-select-drawer min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:thin] [scrollbar-color:#c5ccd6_transparent]"
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
                      close();
                    }}
                  >
                    <span>{emptyLabel}</span>
                    {!value ? <Check size={15} strokeWidth={2.5} /> : null}
                  </button>
                ) : null}

                {filtered.length === 0 ? (
                  <p className="m-0 px-3 py-6 text-center text-[13px] text-[#667488]">No RTO found</p>
                ) : (
                  filtered.map((rto) => {
                    const selected = rto === value;
                    const rtoBlocked =
                      disabledRtoMatchKeys?.size &&
                      disabledRtoMatchKeys.has(rtoMatchKey(rto));
                    return (
                      <button
                        type="button"
                        key={rto}
                        disabled={Boolean(rtoBlocked)}
                        title={rtoBlocked ? disabledRtoTitle : undefined}
                        className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${
                          rtoBlocked
                            ? 'cursor-not-allowed text-[#9aa3b2] opacity-60'
                            : 'text-[#1e242c] hover:bg-[#f3f4f6]'
                        } ${selected && !rtoBlocked ? 'bg-[#1a73e8]/8 font-medium text-[#1a73e8]' : ''}`}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={rtoBlocked || undefined}
                        onClick={() => {
                          if (rtoBlocked) return;
                          onChange(rto);
                          close();
                        }}
                      >
                        <span className="min-w-0 truncate">
                          {rto}
                          {rtoBlocked ? ' · has agent' : ''}
                        </span>
                        {selected && !rtoBlocked ? (
                          <Check size={15} strokeWidth={2.5} className="shrink-0" />
                        ) : null}
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
          {required ? (
            <span className="ml-[3px] font-semibold text-[#dc0024]" aria-hidden>
              *
            </span>
          ) : null}
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

      {error ? <p className="m-0 text-xs font-medium text-[#dc0024]">{error}</p> : null}
    </div>
  );
}

interface RtoSelectProps {
  name: string;
  required?: boolean;
  label?: string;
}

/** Formik-connected RTO select */
export function RtoSelect({ name, required, label }: RtoSelectProps) {
  const [field, meta, helpers] = useField(name);
  const error = meta.touched && meta.error ? String(meta.error) : undefined;

  return (
    <RtoSelectControl
      id={name}
      label={label}
      required={required}
      value={field.value || ''}
      onChange={(v) => helpers.setValue(v)}
      onBlur={() => helpers.setTouched(true)}
      error={error}
      allowCreate
    />
  );
}
