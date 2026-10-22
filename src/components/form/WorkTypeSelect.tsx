import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useField } from 'formik';
import { fetchWorkTypes, createWorkType } from '@/services/workTypeService';

/** Compact scrollable height — same pattern as RTO filter. */
const MENU_MAX = 280;
const MENU_MIN = 180;
const VIEWPORT_PAD = 12;

type WorkOption = { value: string; label: string };

function optionKey(opt: WorkOption) {
  return opt.value.trim().toUpperCase().replace(/\s+/g, '');
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

interface WorkTypeSelectBaseProps {
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
  compact?: boolean;
  allowCreate?: boolean;
}

export function WorkTypeSelectControl({
  label = 'Work type',
  required,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Select work type',
  allowEmpty = false,
  emptyLabel = 'All Work Type',
  id = 'work-type-select',
  compact = false,
  allowCreate = false,
}: WorkTypeSelectBaseProps) {
  const [options, setOptions] = useState<WorkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef(-1);
  const selectOptionRef = useRef<(next: string) => void>(() => {});
  const rowsRef = useRef<{ value: string }[]>([]);
  const addingRef = useRef(false);
  const listboxId = useId();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchWorkTypes()
      .then((items: { name: string }[]) => {
        if (!active) return;
        const seen = new Set<string>();
        const next: WorkOption[] = [];
        for (const w of items || []) {
          const opt = { value: w.name, label: w.name };
          const key = optionKey(opt);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          next.push(opt);
        }
        setOptions(next);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const displayOptions = useMemo(() => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return options;
    const key = optionKey({ value: trimmed, label: trimmed });
    if (options.some((opt) => optionKey(opt) === key)) return options;
    return [{ value: trimmed, label: trimmed }, ...options];
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayOptions;
    return displayOptions.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [query, displayOptions]);

  const selected = displayOptions.find((opt) => opt.value === value);

  const rows = useMemo(() => {
    const next: { key: string; value: string; text: string }[] = [];
    if (allowEmpty) next.push({ key: '__empty', value: '', text: emptyLabel });
    for (const opt of filtered) {
      next.push({
        key: opt.value,
        value: opt.value,
        text: compact ? opt.value : opt.label,
      });
    }
    return next;
  }, [allowEmpty, compact, emptyLabel, filtered]);

  rowsRef.current = rows;
  addingRef.current = adding;

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
  }, [open, adding]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setAdding(false);
      onBlur?.();
    };
    const moveActive = (index: number) => {
      const count = rowsRef.current.length;
      if (!count) {
        activeIndexRef.current = -1;
        setActiveIndex(-1);
        return;
      }
      const next = ((index % count) + count) % count;
      activeIndexRef.current = next;
      setActiveIndex(next);
    };
    const focusFromTrigger = (backward: boolean) => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const nodes = [...document.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')].filter(
        (el) => {
          if (el.tabIndex < 0 || (el as HTMLButtonElement).disabled) return false;
          if (menuRef.current?.contains(el)) return false;
          return el.getClientRects().length > 0;
        }
      );
      const index = nodes.indexOf(trigger);
      const next = nodes[index + (backward ? -1 : 1)];
      (next || trigger).focus();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Node;
      const inAddField = Boolean(addInputRef.current && target === addInputRef.current);
      if (inAddField || (addingRef.current && menuRef.current?.contains(target) && target !== searchRef.current)) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setAdding(false);
          searchRef.current?.focus();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setAdding(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const current = activeIndexRef.current;
        moveActive(current < 0 ? 0 : current + 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const current = activeIndexRef.current;
        moveActive(current < 0 ? rowsRef.current.length - 1 : current - 1);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        moveActive(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        moveActive(rowsRef.current.length - 1);
        return;
      }
      if (e.key === 'Enter') {
        const item = rowsRef.current[activeIndexRef.current];
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        selectOptionRef.current(item.value);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setOpen(false);
        setAdding(false);
        onBlur?.();
        focusFromTrigger(e.shiftKey);
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
  }, [open, onBlur]);

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

  useEffect(() => {
    if (!open) {
      activeIndexRef.current = -1;
      setActiveIndex(-1);
      return;
    }
    if (!rows.length) {
      activeIndexRef.current = -1;
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = query.trim() ? 0 : rows.findIndex((row) => row.value === value);
    const next = selectedIndex >= 0 ? selectedIndex : 0;
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [open, query, rows, value]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = () => {
    setOpen(false);
    setAdding(false);
    onBlur?.();
  };

  const selectOption = (next: string) => {
    onChange(next);
    close();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  selectOptionRef.current = selectOption;

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError('Work type name is required.');
      return;
    }

    const key = trimmed.toUpperCase().replace(/\s+/g, '');
    const existing = options.find((opt) => optionKey(opt) === key);
    if (existing) {
      selectOption(existing.value);
      setNewName('');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const workType = await createWorkType({ name: trimmed, documents: [] });
      setOptions((prev) => {
        const opt = { value: workType.name, label: workType.name };
        const key = optionKey(opt);
        if (prev.some((p) => optionKey(p) === key)) return prev;
        return [opt, ...prev];
      });
      selectOption(workType.name);
      setNewName('');
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to create work type.');
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

  const optionText = (opt: WorkOption) => (compact ? opt.value : opt.label);
  const displayValue = selected
    ? optionText(selected)
    : allowEmpty
      ? emptyLabel
      : '';

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
                  placeholder="Search work type…"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
                  aria-label="Search work type"
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
                      placeholder="e.g. ONLY HPA"
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
                    Add work type
                  </button>
                )}
                {createError ? (
                  <p className="m-0 px-1 pt-1 text-xs font-medium text-[#dc0024]">{createError}</p>
                ) : null}
              </div>
            ) : null}

            <div
              id={listboxId}
              role="listbox"
              aria-label={label || 'Work type'}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:thin] [scrollbar-color:#c5ccd6_transparent]"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-0.5">
                {rows.length === 0 ? (
                  <p className="m-0 px-3 py-6 text-center text-[13px] text-[#667488]">
                    {loading
                      ? 'Loading work types…'
                      : options.length === 0
                        ? 'No work types yet. Add them in Work Types.'
                        : 'No work type found'}
                  </p>
                ) : (
                  rows.map((row, index) => {
                    const isSelected = row.value === value;
                    const isActive = index === activeIndex;
                    return (
                      <button
                        type="button"
                        key={row.key}
                        id={`${listboxId}-opt-${index}`}
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        tabIndex={-1}
                        className={`flex w-full shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${
                          isActive ? 'bg-[#e8f1fc]' : 'hover:bg-[#f3f4f6]'
                        } ${isSelected ? 'font-medium text-[#1a73e8]' : 'text-[#1e242c]'}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => {
                          activeIndexRef.current = index;
                          setActiveIndex(index);
                        }}
                        onClick={() => selectOption(row.value)}
                      >
                        <span className="min-w-0 truncate">{row.text}</span>
                        {isSelected ? <Check size={15} strokeWidth={2.5} className="shrink-0" /> : null}
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
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
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

interface WorkTypeSelectProps {
  name: string;
  required?: boolean;
  label?: string;
}

/** Formik-connected work type select */
export function WorkTypeSelect({ name, required, label }: WorkTypeSelectProps) {
  const [field, meta, helpers] = useField(name);
  const error = meta.touched && meta.error ? String(meta.error) : undefined;

  return (
    <WorkTypeSelectControl
      id={name}
      label={label}
      required={required}
      value={field.value || ''}
      onChange={(v) => helpers.setValue(v)}
      onBlur={() => helpers.setTouched(true)}
      error={error}
      allowCreate={false}
    />
  );
}
