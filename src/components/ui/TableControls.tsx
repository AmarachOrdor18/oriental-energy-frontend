import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from './StatusBadge';

/* ── useTableControls — search + sort + pagination, one hook for every table ── */
export function useTableControls<T extends Record<string, any>>(
  rows: T[],
  initialPageSize = 10,
) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        typeof v === 'string' ? v.toLowerCase().includes(q) : String(v ?? '').toLowerCase().includes(q),
      ),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return {
    search, setSearch,
    page: safePage, setPage,
    pageSize, setPageSize,
    paged, sorted, totalItems, totalPages,
    sortKey, sortDir, toggleSort,
  };
}

/* ── TableToolbar — search + optional right slot (filters, actions) ── */
export function TableToolbar({
  searchValue,
  onSearchChange,
  right,
  left,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {left}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type to search…"
            className="pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-100 rounded-full text-[13px] w-52
                       focus:bg-white focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all"
          />
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* ── TablePagination — Prev/pages/Next + result count ── */
export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const window = page <= 3
    ? Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)
    : page >= totalPages - 2
      ? Array.from({ length: Math.min(totalPages, 5) }, (_, i) => totalPages - Math.min(totalPages, 5) + i + 1)
      : [page - 2, page - 1, page, page + 1, page + 2];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/40">
      <p className="text-[12px] font-medium text-gray-500">
        Showing <span className="font-semibold text-navy-900">{from}–{to}</span> of{' '}
        <span className="font-semibold text-navy-900">{totalItems}</span> results
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 px-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-white disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <div className="flex items-center gap-1 mx-1">
            {window.map((p) => (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={cn(
                  'h-8 min-w-[32px] px-2 rounded-lg text-[12px] font-semibold transition-colors',
                  p === page
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'border border-gray-200 text-gray-500 hover:bg-white',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 px-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-white disabled:opacity-40 transition-colors"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Th — sortable column header ── */
export function SortableTh({
  label,
  k,
  sortKey,
  onSort,
  className,
}: {
  label: string;
  k?: string;
  sortKey?: string | null;
  onSort?: (k: string) => void;
  className?: string;
}) {
  const sortable = !!k && !!onSort;
  const active = sortable && sortKey === k;
  return (
    <th className={cn('table-datagrid-th', className)}>
      {sortable ? (
        <button
          onClick={() => onSort!(k!)}
          className={cn('inline-flex items-center gap-1 uppercase tracking-wider transition-colors', active && 'text-navy-700')}
        >
          {label}
          <ChevronsUpDown className={cn('h-3 w-3', active ? 'opacity-80' : 'opacity-40')} />
        </button>
      ) : (
        label
      )}
    </th>
  );
}
