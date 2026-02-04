import { useState, useCallback, useRef } from 'react';
import { Button } from '../../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface SourceSelectionProps {
  /** Called when a file is selected */
  onFileSelect: (file: File) => void;
  /** Loading state */
  loading?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function UploadIcon() {
  return (
    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-8 h-8 text-[#0353a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 1: Source selection - CSV file upload with drag-and-drop.
 */
export function SourceSelection({ onFileSelect, loading }: SourceSelectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, onFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Upload CSV File</h2>
        <p className="text-gray-500 text-sm">
          Upload a CSV file containing member data. The file should have headers in the first row.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={[
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragActive
            ? 'border-[#0353a4] bg-[#b9d6f2]/10'
            : selectedFile
              ? 'border-[#2e7d32] bg-[#2e7d32]/5'
              : 'border-[#e0e0e0] hover:border-[#0353a4]',
        ].join(' ')}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center">
            <FileIcon />
            <div className="mt-3 font-medium text-[#003559]">{selectedFile.name}</div>
            <div className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="mt-3"
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadIcon />
            <div className="mt-3 text-gray-600">
              <span className="font-medium">Drag and drop</span> a CSV file here, or{' '}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-[#0353a4] font-medium hover:underline"
              >
                browse
              </button>
            </div>
            <div className="text-sm text-gray-400 mt-1">Maximum file size: 50MB</div>
          </div>
        )}
      </div>

      {/* File requirements */}
      <div className="bg-[#f5f5f5] rounded-lg p-4">
        <div className="text-sm font-medium text-[#003559] mb-2">File Requirements</div>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• CSV format with comma-separated values</li>
          <li>• First row must contain column headers</li>
          <li>• UTF-8 encoding recommended</li>
          <li>• Maximum 100,000 rows per file</li>
        </ul>
      </div>

      {/* Action */}
      {selectedFile && (
        <div className="flex justify-center">
          <Button onClick={handleConfirm} loading={loading}>
            Continue with {selectedFile.name}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SourceSelection;
