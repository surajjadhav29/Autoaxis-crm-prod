import { Check } from 'lucide-react';

interface DocumentChecklistProps {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

export default function DocumentChecklist({
  options,
  value,
  onChange,
  label = 'Documents',
  hint,
  disabled = false,
  emptyMessage = 'No documents configured for this work type.',
}: DocumentChecklistProps) {
  const selected = new Set(value);
  const allSelected = options.length > 0 && options.every((doc) => selected.has(doc));

  const toggle = (doc: string) => {
    if (disabled) return;
    if (selected.has(doc)) {
      onChange(value.filter((d) => d !== doc));
    } else {
      onChange([...value, doc]);
    }
  };

  const toggleAll = () => {
    if (disabled || options.length === 0) return;
    onChange(allSelected ? [] : [...options]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="m-0 text-[13px] font-medium text-[#3d4654]">
            {label}
            {options.length > 0 ? (
              <span className="ml-2 text-[12px] font-normal text-[#667488]">
                {value.length}/{options.length} selected
              </span>
            ) : null}
          </p>
          {hint ? <p className="m-0 mt-0.5 text-[12px] text-[#667488]">{hint}</p> : null}
        </div>
        {options.length > 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbdfe5] bg-white px-2.5 py-1 text-[12px] font-medium text-[#1a73e8] transition hover:bg-[#f2f7fe] disabled:cursor-not-allowed disabled:opacity-55"
            onClick={toggleAll}
            disabled={disabled}
          >
            <span
              className={`inline-flex size-3.5 items-center justify-center rounded-full border ${
                allSelected ? 'border-[#1a73e8] bg-[#1a73e8] text-white' : 'border-[#c5cad3] bg-white'
              }`}
              aria-hidden
            >
              {allSelected ? <Check size={9} strokeWidth={3} /> : null}
            </span>
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        ) : null}
      </div>

      {options.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-[#dbdfe5] bg-[#f9fafb] px-4 py-4 text-center text-[13px] text-[#667488]">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid max-h-[168px] grid-cols-1 gap-0.5 overflow-y-auto rounded-lg border border-[#e8ecf1] bg-[#fafbfc] p-1.5 sm:grid-cols-2 lg:grid-cols-3 [scrollbar-width:thin]">
          {options.map((doc) => {
            const checked = selected.has(doc);
            return (
              <button
                key={doc}
                type="button"
                disabled={disabled}
                onClick={() => toggle(doc)}
                className={`flex min-h-8 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12px] transition disabled:cursor-not-allowed disabled:opacity-55 ${
                  checked
                    ? 'border-[#1a73e8]/35 bg-[#1a73e8]/8 text-[#1e242c]'
                    : 'border-transparent bg-white text-[#3d4654] hover:border-[#dbdfe5]'
                }`}
              >
                <span
                  className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked
                      ? 'border-[#1a73e8] bg-[#1a73e8] text-white'
                      : 'border-[#c5cad3] bg-white'
                  }`}
                  aria-hidden
                >
                  {checked ? <Check size={9} strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 truncate leading-snug">{doc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
