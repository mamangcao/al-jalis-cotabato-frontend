import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from?: number | null;
  to?: number | null;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}

export default function Pagination({
  currentPage,
  lastPage,
  perPage,
  total,
  from,
  to,
  isLoading = false,
  onPageChange,
  onPerPageChange,
  perPageOptions = [20, 50, 100],
}: PaginationProps) {
  if (total === 0) {
    return null;
  }

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Number of pages around currentPage

    const left = Math.max(2, currentPage - delta);
    const right = Math.min(lastPage - 1, currentPage + delta);

    pages.push(1);

    if (left > 2) {
      pages.push('...');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < lastPage - 1) {
      pages.push('...');
    }

    if (lastPage > 1) {
      pages.push(lastPage);
    }

    return pages;
  };

  const actualFrom = from ?? (total > 0 ? (currentPage - 1) * perPage + 1 : 0);
  const actualTo = to ?? Math.min(currentPage * perPage, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-200 bg-white select-none">
      {/* Information & Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-500">
        <span>
          Showing <span className="font-semibold text-gray-900">{actualFrom}</span> to{' '}
          <span className="font-semibold text-gray-900">{actualTo}</span> of{' '}
          <span className="font-semibold text-gray-900">{total}</span> results
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-gray-400">|</span>
            <label htmlFor="per-page-select" className="text-xs text-gray-500">
              Rows:
            </label>
            <select
              id="per-page-select"
              value={perPage}
              disabled={isLoading}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-orange-500 disabled:opacity-50 cursor-pointer"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || isLoading}
          title="First Page"
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          title="Previous Page"
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-400 select-none">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                disabled={isLoading || isCurrent}
                className={`min-w-[32px] h-8 px-2 text-xs font-medium rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-orange-500 text-white font-semibold shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100 disabled:opacity-50'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage || isLoading}
          title="Next Page"
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(lastPage)}
          disabled={currentPage >= lastPage || isLoading}
          title="Last Page"
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

