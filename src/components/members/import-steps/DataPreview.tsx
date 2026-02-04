import type { ImportPreview } from '@/services/members/memberImportService';
import { Badge } from '../../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface DataPreviewProps {
  /** Preview data from file parsing */
  preview: ImportPreview;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 2: Data preview - shows sample rows and detected column types.
 */
export function DataPreview({ preview }: DataPreviewProps) {
  const getTypeBadgeVariant = (type: string): 'default' | 'success' | 'warning' | 'primary' | 'secondary' => {
    switch (type) {
      case 'email':
        return 'success';
      case 'phone':
        return 'primary';
      case 'date':
        return 'secondary';
      case 'number':
      case 'integer':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Preview Data</h2>
        <p className="text-gray-500 text-sm">
          Review the detected columns and sample data. We've auto-detected the data types.
        </p>
      </div>

      {/* Summary */}
      <div className="flex justify-center gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-[#003559]">{preview.totalRows}</div>
          <div className="text-sm text-gray-500">Total Rows</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-[#0353a4]">{preview.columns.length}</div>
          <div className="text-sm text-gray-500">Columns</div>
        </div>
      </div>

      {/* Column overview */}
      <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
        <div className="bg-[#f5f5f5] px-4 py-2 border-b border-[#e0e0e0]">
          <span className="text-sm font-medium text-[#003559]">Detected Columns</span>
        </div>
        <div className="divide-y divide-[#e0e0e0]">
          {preview.columns.map((col) => (
            <div key={col.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1">
                <div className="font-medium text-[#003559]">{col.name}</div>
                <div className="text-sm text-gray-500 truncate max-w-[300px]">
                  {col.sampleValues.slice(0, 3).join(', ') || 'No values'}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={getTypeBadgeVariant(col.detectedType)} size="sm">
                  {col.detectedType}
                </Badge>
                {col.nullCount > 0 && (
                  <span className="text-xs text-gray-400">
                    {col.nullCount} empty
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sample data table */}
      <div>
        <div className="text-sm font-medium text-[#003559] mb-2">Sample Data (First 10 rows)</div>
        <div className="border border-[#e0e0e0] rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f5f5f5]">
              <tr>
                {preview.columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-3 py-2 text-left text-xs font-semibold text-[#003559] uppercase whitespace-nowrap"
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {preview.rows.map((row, index) => (
                <tr key={index} className="hover:bg-[#f5f5f5]/50">
                  {preview.columns.map((col) => (
                    <td
                      key={col.name}
                      className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[200px] truncate"
                    >
                      {String(row[col.name] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DataPreview;
