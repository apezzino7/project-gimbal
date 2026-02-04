/**
 * SMS Character Counter
 * Shows character count and segment information for SMS messages
 */

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface SmsCharacterCounterProps {
  content: string;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const GSM_SEGMENT_SIZE = 160;
const GSM_MULTIPART_SEGMENT_SIZE = 153;
const UNICODE_SEGMENT_SIZE = 70;
const UNICODE_MULTIPART_SEGMENT_SIZE = 67;

/**
 * Check if content contains non-GSM characters
 */
function containsUnicode(text: string): boolean {
  // Extended GSM 7-bit character set
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1B !"#¤%&'()*+,\-.\/0-9:;<=>?¡A-ZÄÖÑÜÿa-zäöñüà\^{}\[\]~|€]*$/;
  return !gsmRegex.test(text);
}

/**
 * Calculate SMS segment count
 */
function calculateSegments(text: string): { segments: number; isUnicode: boolean } {
  if (!text) return { segments: 0, isUnicode: false };

  const isUnicode = containsUnicode(text);
  const singleLimit = isUnicode ? UNICODE_SEGMENT_SIZE : GSM_SEGMENT_SIZE;
  const multiLimit = isUnicode ? UNICODE_MULTIPART_SEGMENT_SIZE : GSM_MULTIPART_SEGMENT_SIZE;

  if (text.length <= singleLimit) {
    return { segments: 1, isUnicode };
  }

  return {
    segments: Math.ceil(text.length / multiLimit),
    isUnicode,
  };
}

// =============================================================================
// Component
// =============================================================================

export function SmsCharacterCounter({ content, className = '' }: SmsCharacterCounterProps) {
  const { charCount, segments, isUnicode, remaining } = useMemo(() => {
    const count = content.length;
    const { segments, isUnicode } = calculateSegments(content);

    // Calculate limit based on encoding
    const singleLimit = isUnicode ? UNICODE_SEGMENT_SIZE : GSM_SEGMENT_SIZE;
    const multiLimit = isUnicode ? UNICODE_MULTIPART_SEGMENT_SIZE : GSM_MULTIPART_SEGMENT_SIZE;

    // Remaining characters before hitting next segment
    const currentLimit = segments === 1 ? singleLimit : segments * multiLimit;
    const remaining = currentLimit - count;

    return {
      charCount: count,
      segments,
      isUnicode,
      remaining: remaining > 0 ? remaining : 0,
    };
  }, [content]);

  // Color based on segment count
  const getStatusColor = () => {
    if (segments === 0) return 'text-gray-400';
    if (segments === 1) return 'text-[#2e7d32]';
    if (segments <= 3) return 'text-[#ed6c02]';
    return 'text-[#d32f2f]';
  };

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {/* Character count */}
      <span className={getStatusColor()}>
        {charCount} {charCount === 1 ? 'character' : 'characters'}
      </span>

      {/* Segment indicator */}
      {charCount > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span className={segments > 1 ? 'text-[#ed6c02]' : 'text-gray-500'}>
            {segments} {segments === 1 ? 'segment' : 'segments'}
          </span>
        </>
      )}

      {/* Unicode warning */}
      {isUnicode && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-[#ed6c02]" title="Message contains special characters">
            Unicode
          </span>
        </>
      )}

      {/* Remaining characters hint */}
      {charCount > 0 && remaining > 0 && remaining < 30 && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            {remaining} left
          </span>
        </>
      )}
    </div>
  );
}

export default SmsCharacterCounter;
