/**
 * Content Editor
 * Text editor with template variable insertion support
 */

import { useRef, useState } from 'react';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { SmsCharacterCounter } from './SmsCharacterCounter';
import { TEMPLATE_VARIABLES } from '@/types/campaign';
import type { CampaignType, TemplateVariable } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  type: CampaignType;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

// =============================================================================
// Component
// =============================================================================

export function ContentEditor({
  value,
  onChange,
  type,
  placeholder = 'Enter your message...',
  error,
  disabled = false,
  className = '',
  rows = 6,
}: ContentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVariables, setShowVariables] = useState(false);

  // Insert variable at cursor position
  const insertVariable = (variable: TemplateVariable) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholder = TEMPLATE_VARIABLES[variable].placeholder;

    const newValue =
      value.substring(0, start) +
      placeholder +
      value.substring(end);

    onChange(newValue);
    setShowVariables(false);

    // Restore focus and set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + placeholder.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className={className}>
      {/* Variable insertion button */}
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">Message</label>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVariables(!showVariables)}
            disabled={disabled}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Insert Variable
          </Button>

          {/* Variable dropdown */}
          {showVariables && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#e0e0e0] py-1 z-10">
              {Object.entries(TEMPLATE_VARIABLES).map(([key, { label }]) => (
                <button
                  key={key}
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#f5f5f5] transition-colors"
                  onClick={() => insertVariable(key as TemplateVariable)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        rows={rows}
        className="font-mono text-sm"
      />

      {/* SMS character counter */}
      {type === 'sms' && (
        <div className="mt-2">
          <SmsCharacterCounter content={value} />
        </div>
      )}

      {/* Variable reference */}
      {value.includes('{{') && (
        <div className="mt-2 text-xs text-gray-500">
          Variables will be replaced with member data when the message is sent.
        </div>
      )}
    </div>
  );
}

export default ContentEditor;
