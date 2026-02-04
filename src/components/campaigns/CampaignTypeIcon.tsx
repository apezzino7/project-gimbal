/**
 * Campaign Type Icon
 * Displays SMS or Email icon based on campaign type
 */

import type { CampaignType } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignTypeIconProps {
  type: CampaignType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// Icons
// =============================================================================

function SmsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function CampaignTypeIcon({ type, className = '', size = 'md' }: CampaignTypeIconProps) {
  const sizeClass = SIZE_CLASSES[size];
  const combinedClass = `${sizeClass} ${className}`;

  if (type === 'sms') {
    return <SmsIcon className={combinedClass} />;
  }

  return <EmailIcon className={combinedClass} />;
}

export default CampaignTypeIcon;
