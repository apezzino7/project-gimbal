import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Site, CreateSiteInput, SiteLevel } from '@/types/member';
import { createSite, updateSite, getSiteById, getSites } from '@/services/members/siteService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Card, CardHeader, CardFooter } from '../common/Card';

// =============================================================================
// Validation Schema
// =============================================================================

const siteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  siteLevel: z.enum(['company', 'region', 'site']),
  parentSiteId: z.string().nullable().optional(),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().length(2).default('US'),
  timezone: z.string().min(1, 'Timezone is required'),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email('Invalid email').max(255).nullable().optional().or(z.literal('')),
  defaultAcquisitionCost: z.coerce.number().min(0).default(0),
});

type SiteFormData = z.infer<typeof siteSchema>;

// =============================================================================
// Types
// =============================================================================

export interface SiteFormProps {
  /** Site ID for editing (omit for create) */
  siteId?: string;
  /** Called on successful save */
  onSuccess?: (site: Site) => void;
  /** Called when cancel is clicked */
  onCancel?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const SITE_LEVELS: Array<{ value: SiteLevel; label: string }> = [
  { value: 'company', label: 'Company' },
  { value: 'region', label: 'Region' },
  { value: 'site', label: 'Site / Location' },
];

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

// =============================================================================
// Component
// =============================================================================

/**
 * Form for creating or editing a site.
 *
 * @example
 * // Create mode
 * <SiteForm
 *   onSuccess={(site) => navigate(`/sites/${site.id}`)}
 *   onCancel={() => navigate('/sites')}
 * />
 *
 * @example
 * // Edit mode
 * <SiteForm
 *   siteId={siteId}
 *   onSuccess={() => refetch()}
 *   onCancel={() => setEditing(false)}
 * />
 */
export function SiteForm({ siteId, onSuccess, onCancel, className = '' }: SiteFormProps) {
  const isEditing = !!siteId;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [parentSites, setParentSites] = useState<Site[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema) as never,
    defaultValues: {
      name: '',
      code: '',
      siteLevel: 'site',
      parentSiteId: null,
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      timezone: 'America/New_York',
      phone: '',
      email: '',
      defaultAcquisitionCost: 0,
    },
  });

  const siteLevel = watch('siteLevel');

  // Load existing site data for editing
  useEffect(() => {
    async function loadSite() {
      if (!siteId) return;

      try {
        setLoadingData(true);
        const site = await getSiteById(siteId);
        if (site) {
          reset({
            name: site.name,
            code: site.code,
            siteLevel: site.siteLevel,
            parentSiteId: site.parentSiteId,
            addressLine1: site.addressLine1 || '',
            addressLine2: site.addressLine2 || '',
            city: site.city || '',
            state: site.state || '',
            postalCode: site.postalCode || '',
            country: site.country || 'US',
            timezone: site.timezone,
            phone: site.phone || '',
            email: site.email || '',
            defaultAcquisitionCost: site.defaultAcquisitionCost,
          });
        }
      } catch (err) {
        console.error('Failed to load site:', err);
        setError('Failed to load site data');
      } finally {
        setLoadingData(false);
      }
    }

    loadSite();
  }, [siteId, reset]);

  // Load parent sites
  useEffect(() => {
    async function loadParentSites() {
      try {
        const sites = await getSites();
        // Filter out the current site and filter by level hierarchy
        const filtered = sites.filter((s) => {
          if (siteId && s.id === siteId) return false;
          // Only show higher levels as potential parents
          if (siteLevel === 'region') return s.siteLevel === 'company';
          if (siteLevel === 'site') return s.siteLevel === 'company' || s.siteLevel === 'region';
          return false;
        });
        setParentSites(filtered);
      } catch (err) {
        console.error('Failed to load parent sites:', err);
      }
    }

    loadParentSites();
  }, [siteId, siteLevel]);

  // Auto-clear parent when company level is selected
  useEffect(() => {
    if (siteLevel === 'company') {
      setValue('parentSiteId', null);
    }
  }, [siteLevel, setValue]);

  // Handle form submission
  const onSubmit = useCallback(
    async (data: SiteFormData) => {
      try {
        setLoading(true);
        setError(null);

        const input: CreateSiteInput = {
          name: data.name,
          code: data.code,
          siteLevel: data.siteLevel,
          parentSiteId: data.parentSiteId || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          postalCode: data.postalCode || null,
          country: data.country,
          timezone: data.timezone,
          phone: data.phone || null,
          email: data.email || null,
          defaultAcquisitionCost: data.defaultAcquisitionCost,
        };

        let site: Site;
        if (isEditing && siteId) {
          site = await updateSite(siteId, input);
        } else {
          site = await createSite(input);
        }

        onSuccess?.(site);
      } catch (err) {
        console.error('Failed to save site:', err);
        setError(err instanceof Error ? err.message : 'Failed to save site');
      } finally {
        setLoading(false);
      }
    },
    [isEditing, siteId, onSuccess]
  );

  if (loadingData) {
    return (
      <Card className={className}>
        <CardHeader>{isEditing ? 'Edit Site' : 'Add Site'}</CardHeader>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      <CardHeader>{isEditing ? 'Edit Site' : 'Add Site'}</CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-[#d32f2f]/10 border border-[#d32f2f]/20 rounded-lg text-[#d32f2f]">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Site Name"
              placeholder="Main Street Location"
              error={errors.name?.message}
              required
              {...register('name')}
            />
            <Input
              label="Site Code"
              placeholder="MAIN-001"
              error={errors.code?.message}
              required
              {...register('code')}
            />
          </div>

          {/* Hierarchy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Site Level"
              error={errors.siteLevel?.message}
              required
              options={SITE_LEVELS}
              {...register('siteLevel')}
            />

            {siteLevel !== 'company' && (
              <Select
                label="Parent Site"
                error={errors.parentSiteId?.message}
                options={[
                  { value: '', label: 'No parent (top-level)' },
                  ...parentSites.map((site) => ({
                    value: site.id,
                    label: `${site.name} (${site.siteLevel})`,
                  })),
                ]}
                {...register('parentSiteId')}
              />
            )}
          </div>

          {/* Address */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-[#003559]">Address</legend>
            <Input
              label="Address Line 1"
              placeholder="123 Main Street"
              error={errors.addressLine1?.message}
              {...register('addressLine1')}
            />
            <Input
              label="Address Line 2"
              placeholder="Suite 100"
              error={errors.addressLine2?.message}
              {...register('addressLine2')}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="City"
                placeholder="New York"
                error={errors.city?.message}
                {...register('city')}
              />
              <Select
                label="State"
                error={errors.state?.message}
                placeholder="Select..."
                options={US_STATES.map((state) => ({ value: state, label: state }))}
                {...register('state')}
              />
              <Input
                label="ZIP Code"
                placeholder="10001"
                error={errors.postalCode?.message}
                {...register('postalCode')}
              />
              <Select
                label="Country"
                error={errors.country?.message}
                options={[{ value: 'US', label: 'United States' }]}
                {...register('country')}
              />
            </div>
          </fieldset>

          {/* Timezone & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Timezone"
              error={errors.timezone?.message}
              required
              options={US_TIMEZONES}
              {...register('timezone')}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="location@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {/* CAC Default */}
          <div className="max-w-xs">
            <Input
              label="Default Acquisition Cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={errors.defaultAcquisitionCost?.message}
              {...register('defaultAcquisitionCost')}
            />
            <p className="mt-1 text-xs text-gray-500">
              Default CAC for members at this site when no campaign or promo code is specified.
            </p>
          </div>
        </div>

        <CardFooter>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={loading} disabled={!isDirty && isEditing}>
            {isEditing ? 'Save Changes' : 'Create Site'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default SiteForm;
