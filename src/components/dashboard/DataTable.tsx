import { useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Card, CardHeader, CardFooter } from '../common/Card';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface DataTableColumn<T> {
  /** Unique column key */
  key: string;
  /** Column header label */
  header: string;
  /** Accessor function to get cell value */
  accessor: (row: T) => ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Sort accessor (returns sortable value) */
  sortAccessor?: (row: T) => string | number | Date;
  /** Column width (CSS value) */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  /** Table title */
  title?: string;
  /** Table data */
  data: T[];
  /** Column configuration */
  columns: DataTableColumn<T>[];
  /** Unique key accessor for each row */
  rowKey: (row: T) => string;
  /** Items per page (0 = no pagination) */
  pageSize?: number;
  /** Show search input */
  searchable?: boolean;
  /** Search filter function */
  searchFilter?: (row: T, query: string) => boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Header actions */
  headerActions?: ReactNode;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DataTable component with sorting, pagination, and search.
 *
 * @example
 * const columns: DataTableColumn<Campaign>[] = [
 *   { key: 'name', header: 'Name', accessor: (row) => row.name, sortable: true },
 *   { key: 'status', header: 'Status', accessor: (row) => <Badge>{row.status}</Badge> },
 *   { key: 'sent', header: 'Sent', accessor: (row) => row.sent.toLocaleString(), align: 'right' },
 * ];
 *
 * <DataTable
 *   title="Campaigns"
 *   data={campaigns}
 *   columns={columns}
 *   rowKey={(row) => row.id}
 *   pageSize={10}
 *   searchable
 * />
 */
export function DataTable<T>({
  title,
  data,
  columns,
  rowKey,
  pageSize = 10,
  searchable = false,
  searchFilter,
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
  headerActions,
  className = '',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchFilter) return data;
    return data.filter((row) => searchFilter(row, searchQuery.toLowerCase()));
  }, [data, searchQuery, searchFilter]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortAccessor) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = column.sortAccessor!(a);
      const bVal = column.sortAccessor!(b);

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (pageSize === 0) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedData.length / pageSize) : 1;

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  if (loading) {
    return (
      <Card className={className}>
        {title && <CardHeader>{title}</CardHeader>}
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      {/* Header */}
      {(title || searchable || headerActions) && (
        <CardHeader actions={headerActions}>
          <div className="flex items-center gap-4">
            {title && <span>{title}</span>}
            {searchable && (
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={[
                  'px-3 py-1.5 text-sm rounded-lg border border-[#e0e0e0]',
                  'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:border-[#0353a4]',
                  'placeholder:text-gray-400',
                ].join(' ')}
              />
            )}
          </div>
        </CardHeader>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-[#f5f5f5]/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={[
                    'px-4 py-3 text-sm font-semibold text-[#003559]',
                    column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
                    column.sortable ? 'cursor-pointer hover:bg-[#b9d6f2]/20 select-none' : '',
                  ].join(' ')}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={['inline-flex items-center gap-1', column.align === 'right' ? 'flex-row-reverse' : ''].join(' ')}>
                    {column.header}
                    {column.sortable && (
                      <SortIcon active={sortKey === column.key} direction={sortKey === column.key ? sortDirection : undefined} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-b border-[#e0e0e0] last:border-b-0',
                    'hover:bg-[#b9d6f2]/10 transition-colors',
                    onRowClick ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        'px-4 py-3 text-sm text-[#003559]',
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
                      ].join(' ')}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <CardFooter align="between">
          <span className="text-sm text-gray-500">
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-[#003559] px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function SortIcon({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
  return (
    <svg
      className={['w-4 h-4', active ? 'text-[#0353a4]' : 'text-gray-400'].join(' ')}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      {direction === 'asc' ? (
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      ) : direction === 'desc' ? (
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
      )}
    </svg>
  );
}

export default DataTable;
