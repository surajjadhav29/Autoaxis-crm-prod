import { useRef } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateFilterProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}

function toDisplayDate(iso: string) {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/** Compact created-date filter — same row height as All Users / RTO filters. */
export function DateFilter({
  id = 'date-filter',
  value,
  onChange,
  emptyLabel = 'All Dates',
}: DateFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
      return;
    }
    el.focus();
    el.click();
  };

  return (
    <div className="crm-date-filter">
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="crm-date-filter-native"
        aria-label="Filter by created date"
      />
      <button
        type="button"
        className={`crm-date-filter-trigger ${value ? 'crm-date-filter-trigger--filled' : ''}`}
        onClick={openPicker}
        aria-haspopup="dialog"
      >
        <Calendar size={16} className="crm-date-filter-icon" />
        <span className="crm-date-filter-label">{value ? toDisplayDate(value) : emptyLabel}</span>
      </button>
      {value ? (
        <button
          type="button"
          className="crm-date-filter-clear"
          onClick={() => onChange('')}
          aria-label="Clear date filter"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
