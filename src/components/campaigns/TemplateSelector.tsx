/**
 * Template Selector
 * Dropdown to select a campaign template
 */

import { useMemo } from 'react';
import { Select } from '../common/Select';
import { useTemplates } from '@/services/campaigns';
import type { CampaignType, CampaignTemplate } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface TemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null, template?: CampaignTemplate) => void;
  type?: CampaignType;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function TemplateSelector({
  value,
  onChange,
  type,
  placeholder = 'Select a template...',
  disabled = false,
  error,
  className = '',
}: TemplateSelectorProps) {
  const { data: templates, isLoading } = useTemplates(type);

  const options = useMemo(() => {
    if (!templates) return [];

    return [
      { value: '', label: placeholder },
      ...templates.map((t) => ({
        value: t.id,
        label: t.name,
      })),
    ];
  }, [templates, placeholder]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value || null;
    const selectedTemplate = templates?.find((t) => t.id === selectedId);
    onChange(selectedId, selectedTemplate);
  };

  return (
    <Select
      value={value || ''}
      onChange={handleChange}
      options={options}
      disabled={disabled || isLoading}
      error={error}
      className={className}
    />
  );
}

export default TemplateSelector;
