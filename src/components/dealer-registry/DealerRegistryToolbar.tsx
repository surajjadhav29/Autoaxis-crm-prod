import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';

interface DealerRegistryToolbarProps {
  title?: string;
  actions?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function DealerRegistryToolbar({
  title = 'Dealers',
  actions,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search by name, email, phone, city…',
}: DealerRegistryToolbarProps) {
  const showSearch = typeof onSearchChange === 'function';

  return (
    <div className="crm-form-page-head">
      <div className="crm-form-page-title-row crm-page-head-row crm-dealer-registry-toolbar-row">
        <div className="crm-page-head">
          <h1 className="crm-title">{title}</h1>
        </div>

        {showSearch ? (
          <div className="crm-dealer-registry-search-wrap">
            <div className="crm-search-wrap crm-search-wrap--expand crm-dealer-registry-search-field">
              <Search size={16} className="crm-search-icon" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="crm-search crm-dealer-registry-search-input"
                aria-label="Search dealers"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="crm-search-clear"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {actions ? <div className="crm-dealer-registry-toolbar-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
