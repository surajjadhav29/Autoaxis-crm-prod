import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import type { DealerRegistryRecord } from '@/types/dealer.types';
import { useIsMobileList } from '@/hooks/useIsMobileList';
import EmptyData from '../EmptyData';
import TableSkeleton from '../table/TableSkeleton';
import BillingDealerCard from './BillingDealerCard';
import Pagination from '../Pagination';
import { FigmaCell, FigmaHeaderRow, FigmaSortHeader, FigmaTable } from '../table/FigmaTable';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface BillingDealerPickPanelProps {
  dealers: DealerRegistryRecord[];
  loading: boolean;
  advancing?: boolean;
  search: string;
  selectedId: string | null;
  onSearchChange: (value: string) => void;
  onSelect: (dealer: DealerRegistryRecord) => void;
}

export default function BillingDealerPickPanel({
  dealers,
  loading,
  advancing = false,
  search,
  selectedId,
  onSearchChange,
  onSelect,
}: BillingDealerPickPanelProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const isMobileList = useIsMobileList();
  const loadMoreLock = useRef(false);
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? dealers.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.city.toLowerCase().includes(q) ||
              d.phone.includes(q)
          )
        : dealers,
    [dealers, q]
  );

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const visibleDealers = useMemo(() => {
    if (isMobileList) {
      return filtered.slice(0, page * pageSize);
    }
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, isMobileList]);

  const hasMore = isMobileList && page < totalPages;

  const handleLoadMore = useCallback(() => {
    if (!isMobileList || loadMoreLock.current || page >= totalPages) return;
    loadMoreLock.current = true;
    setPage((current) => (current < totalPages ? current + 1 : current));
    loadMoreLock.current = false;
  }, [isMobileList, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, isMobileList]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (loading || !hasMore || !isMobileList) return;
    const el = mobileSentinelRef.current;
    if (!el) return;
    const root = el.closest('.crm-table-scroll');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) handleLoadMore();
      },
      { root: root instanceof Element ? root : null, rootMargin: '160px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, isMobileList, handleLoadMore, visibleDealers.length]);

  const clearSearch = () => {
    onSearchChange('');
    setSearchOpen(false);
  };

  return (
    <div className="crm-page crm-page--files crm-billing-dealer-layout">
      <div className="crm-files-main">
        <div className="crm-page-head-row print:hidden">
          <div className="crm-page-head flex min-w-0 flex-1 items-center lg:min-w-0 lg:flex-none">
            <h1 className="crm-title">Billing</h1>
          </div>

          <div className="crm-files-search-center hidden lg:flex">
            <div className="crm-files-search-slot crm-files-search-slot--open">
              <div className="crm-search-wrap crm-search-wrap--expand border border-gray-300 dark:border-gray-600 rounded-md px-2">
                <Search size={16} className="crm-search-icon ml-2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by name, city or phone…"
                  className="crm-search crm-files-search"
                  aria-label="Search dealers"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="crm-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="crm-files-head-actions crm-billing-dealer-head-actions">
            <div
              className={`crm-files-search-slot${searchOpen || search ? ' crm-files-search-slot--open' : ''} lg:hidden`}
            >
              {searchOpen || search ? (
                <div className="crm-search-wrap crm-search-wrap--expand">
                  <Search size={16} className="crm-search-icon" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Name, city, phone…"
                    className="crm-search crm-files-search"
                    autoFocus
                    onBlur={() => {
                      if (!search) setSearchOpen(false);
                    }}
                    aria-label="Search dealers"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="crm-search-clear"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className="crm-icon-btn crm-icon-btn--ghost"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search dealers"
                >
                  <Search size={20} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="crm-billing-dealer-subrow print:hidden">
          <span className="crm-billing-dealer-count">
            {loading ? '…' : `${totalCount} dealer${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="figma-table-card">
          <div className="crm-files-table-panel">
            <div className="crm-table-scroll">
              {loading ? (
                <>
                  <div className="crm-billing-dealer-list-desktop">
                    <TableSkeleton variant="staff" rows={8} title="Loading dealers" />
                  </div>
                  <div className="crm-billing-dealer-list-mobile">
                    <TableSkeleton variant="cards" rows={4} title="Loading dealers" />
                  </div>
                </>
              ) : !filtered.length ? (
                <div className="figma-table-shell">
                  <div className="figma-table-empty">
                    <EmptyData
                      title="No dealers found"
                      description={
                        search.trim()
                          ? 'Try a different search term or clear search to see all dealers.'
                          : 'Add dealers from the Dealer page first.'
                      }
                      compact
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="crm-billing-dealer-list-desktop">
                    <div className="figma-table-shell crm-billing-dealer-table">
                      <FigmaTable>
                        <FigmaHeaderRow>
                          <FigmaCell variant="dealer">
                            <FigmaSortHeader label="Dealer name" sortable={false} />
                          </FigmaCell>
                          <FigmaCell variant="default">
                            <FigmaSortHeader label="City" sortable={false} />
                          </FigmaCell>
                          <FigmaCell variant="staffemail">
                            <FigmaSortHeader label="Phone" sortable={false} />
                          </FigmaCell>
                          <FigmaCell variant="fileactions">
                            <FigmaSortHeader label="Action" sortable={false} />
                          </FigmaCell>
                        </FigmaHeaderRow>

                        {visibleDealers.map((dealer) => {
                          const busy = advancing && selectedId === dealer.id;
                          return (
                            <div key={dealer.id} className="figma-tr figma-tr--body">
                              <FigmaCell variant="dealer">
                                <span className="figma-td-text crm-billing-dealer-name">
                                  {dealer.name}
                                </span>
                              </FigmaCell>
                              <FigmaCell variant="default">
                                <span className="figma-td-text">{dealer.city}</span>
                              </FigmaCell>
                              <FigmaCell variant="staffemail">
                                <span className="figma-td-text crm-billing-dealer-phone">
                                  {dealer.phone}
                                </span>
                              </FigmaCell>
                              <FigmaCell variant="fileactions">
                                <button
                                  type="button"
                                  className="crm-btn crm-btn--primary crm-billing-dealer-continue-btn"
                                  disabled={advancing}
                                  aria-busy={busy}
                                  title="Continue to generate invoice"
                                  onClick={() => onSelect(dealer)}
                                >
                                  <span className="crm-billing-dealer-continue-label">
                                    {busy ? 'Opening…' : 'Continue to generate invoice'}
                                  </span>
                                  {!busy ? <ArrowRight size={16} aria-hidden /> : null}
                                </button>
                              </FigmaCell>
                            </div>
                          );
                        })}
                      </FigmaTable>
                    </div>
                  </div>

                  <div className="crm-billing-dealer-list-mobile">
                    <div className="crm-billing-dealer-card-grid">
                      {visibleDealers.map((dealer, index) => (
                        <div
                          key={dealer.id}
                          className="crm-animate-in"
                          style={{ animationDelay: `${Math.min(index * 0.04, 0.32)}s` }}
                        >
                          <BillingDealerCard
                            dealer={dealer}
                            busy={advancing && selectedId === dealer.id}
                            onSelect={onSelect}
                          />
                        </div>
                      ))}
                    </div>
                    {hasMore ? (
                      <div ref={mobileSentinelRef} className="h-4 lg:hidden" aria-hidden />
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {!loading && totalCount > 0 ? (
            <div className="hidden lg:block print:hidden">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPage(1);
                  setPageSize(size);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
