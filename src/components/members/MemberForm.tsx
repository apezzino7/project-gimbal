import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Member, CreateMemberInput, MembershipStatus, AcquisitionSource } from '@/types/member';
import { createMember, updateMember, getMemberById } from '@/services/members/memberService';
import { getMembershipLevels } from '@/services/members/siteService';
import type { MembershipLevel } from '@/types/member';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Card, CardHeader, CardFooter } from '../common/Card';
import { SiteSelector } from './SiteSelector';

// =============================================================================
// Validation Schema
// =============================================================================

const memberSchema = z.object({
  siteId: z.string().min(1, 'Site is required'),
  membershipLevelId: z.string().nullable().optional(),
  externalId: z.string().max(255).nullable().optional(),
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  email: z.string().email('Invalid email').max(255).nullable().optional().or(z.literal('')),
  phone: z.string().max(20).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().length(2).default('US'),
  membershipStartDate: z.string().nullable().optional(),
  membershipExpiryDate: z.string().nullable().optional(),
  membershipStatus: z.enum(['active', 'expired', 'cancelled', 'suspended', 'pending']).default('active'),
  acquisitionSource: z.enum(['campaign', 'promo_code', 'referral', 'organic', 'import', 'api']).nullable().optional(),
  acquisitionPromoCode: z.string().max(50).nullable().optional(),
  acquisitionCost: z.coerce.number().min(0).nullable().optional(),
  tags: z.string().optional(), // Comma-separated for form input
});

type MemberFormData = z.infer<typeof memberSchema>;

// =============================================================================
// Types
// =============================================================================

export interface MemberFormProps {
  /** Member ID for editing (omit for create) */
  memberId?: string;
  /** Pre-selected site ID */
  siteId?: string;
  /** Called on successful save */
  onSuccess?: (member: Member) => void;
  /** Called when cancel is clicked */
  onCancel?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const MEMBERSHIP_STATUSES: Array<{ value: MembershipStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
];

const ACQUISITION_SOURCES: Array<{ value: AcquisitionSource | ''; label: string }> = [
  { value: '', label: 'Select...' },
  { value: 'organic', label: 'Organic' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'promo_code', label: 'Promo Code' },
  { value: 'referral', label: 'Referral' },
  { value: 'import', label: 'Import' },
  { value: 'api', label: 'API' },
];

const GENDERS = [
  { value: '', label: 'Select...' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
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
 * Form for creating or editing a member.
 *
 * @example
 * // Create mode
 * <MemberForm
 *   siteId={selectedSiteId}
 *   onSuccess={(member) => navigate(`/members/${member.id}`)}
 *   onCancel={() => navigate('/members')}
 * />
 *
 * @example
 * // Edit mode
 * <MemberForm
 *   memberId={memberId}
 *   onSuccess={() => refetch()}
 *   onCancel={() => setEditing(false)}
 * />
 */
export function MemberForm({
  memberId,
  siteId: initialSiteId,
  onSuccess,
  onCancel,
  className = '',
}: MemberFormProps) {
  const isEditing = !!memberId;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [membershipLevels, setMembershipLevels] = useState<MembershipLevel[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema) as never,
    defaultValues: {
      siteId: initialSiteId || '',
      membershipLevelId: null,
      externalId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      membershipStartDate: '',
      membershipExpiryDate: '',
      membershipStatus: 'active',
      acquisitionSource: null,
      acquisitionPromoCode: '',
      acquisitionCost: null,
      tags: '',
    },
  });

  const selectedSiteId = watch('siteId');

  // Load existing member data for editing
  useEffect(() => {
    async function loadMember() {
      if (!memberId) return;

      try {
        setLoadingData(true);
        const member = await getMemberById(memberId);
        if (member) {
          reset({
            siteId: member.siteId,
            membershipLevelId: member.membershipLevelId,
            externalId: member.externalId || '',
            firstName: member.firstName || '',
            lastName: member.lastName || '',
            email: member.email || '',
            phone: member.phone || '',
            dateOfBirth: member.dateOfBirth || '',
            gender: member.gender || '',
            addressLine1: member.addressLine1 || '',
            addressLine2: member.addressLine2 || '',
            city: member.city || '',
            state: member.state || '',
            postalCode: member.postalCode || '',
            country: member.country || 'US',
            membershipStartDate: member.membershipStartDate || '',
            membershipExpiryDate: member.membershipExpiryDate || '',
            membershipStatus: member.membershipStatus,
            acquisitionSource: member.acquisitionSource,
            acquisitionPromoCode: member.acquisitionPromoCode || '',
            acquisitionCost: member.acquisitionCost,
            tags: member.tags.join(', '),
          });
        }
      } catch (err) {
        console.error('Failed to load member:', err);
        setError('Failed to load member data');
      } finally {
        setLoadingData(false);
      }
    }

    loadMember();
  }, [memberId, reset]);

  // Load membership levels when site changes
  useEffect(() => {
    async function loadLevels() {
      if (!selectedSiteId) {
        setMembershipLevels([]);
        return;
      }

      try {
        const levels = await getMembershipLevels(selectedSiteId);
        setMembershipLevels(levels.filter((l) => l.isActive));
      } catch (err) {
        console.error('Failed to load membership levels:', err);
      }
    }

    loadLevels();
  }, [selectedSiteId]);

  // Handle form submission
  const onSubmit = useCallback(
    async (data: MemberFormData) => {
      try {
        setLoading(true);
        setError(null);

        const input: CreateMemberInput = {
          siteId: data.siteId,
          membershipLevelId: data.membershipLevelId || null,
          externalId: data.externalId || null,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          email: data.email || null,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth || null,
          gender: data.gender || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          postalCode: data.postalCode || null,
          country: data.country,
          membershipStartDate: data.membershipStartDate || null,
          membershipExpiryDate: data.membershipExpiryDate || null,
          membershipStatus: data.membershipStatus,
          acquisitionSource: data.acquisitionSource || null,
          acquisitionPromoCode: data.acquisitionPromoCode || null,
          acquisitionCost: data.acquisitionCost ?? null,
          tags: data.tags
            ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
        };

        let member: Member;
        if (isEditing && memberId) {
          member = await updateMember(memberId, input);
        } else {
          member = await createMember(input);
        }

        onSuccess?.(member);
      } catch (err) {
        console.error('Failed to save member:', err);
        setError(err instanceof Error ? err.message : 'Failed to save member');
      } finally {
        setLoading(false);
      }
    },
    [isEditing, memberId, onSuccess]
  );

  if (loadingData) {
    return (
      <Card className={className}>
        <CardHeader>{isEditing ? 'Edit Member' : 'Add Member'}</CardHeader>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      <CardHeader>{isEditing ? 'Edit Member' : 'Add Member'}</CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-[#d32f2f]/10 border border-[#d32f2f]/20 rounded-lg text-[#d32f2f]">
              {error}
            </div>
          )}

          {/* Site Selection */}
          <SiteSelector
            value={selectedSiteId}
            onChange={(id) => setValue('siteId', id || '', { shouldDirty: true })}
            label="Site"
            required
            error={errors.siteId?.message}
            disabled={isEditing}
            siteLevel="site"
          />

          {/* Basic Info */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-[#003559]">Basic Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
              />
              <Select
                label="Gender"
                error={errors.gender?.message}
                options={GENDERS}
                {...register('gender')}
              />
              <Input
                label="External ID"
                placeholder="EXT-12345"
                error={errors.externalId?.message}
                {...register('externalId')}
              />
            </div>
          </fieldset>

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
              placeholder="Apt 4B"
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

          {/* Membership */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-[#003559]">Membership</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Membership Level"
                error={errors.membershipLevelId?.message}
                options={[
                  { value: '', label: 'No Level' },
                  ...membershipLevels.map((level) => ({
                    value: level.id,
                    label: level.name,
                  })),
                ]}
                {...register('membershipLevelId')}
              />
              <Select
                label="Status"
                error={errors.membershipStatus?.message}
                options={MEMBERSHIP_STATUSES}
                {...register('membershipStatus')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                error={errors.membershipStartDate?.message}
                {...register('membershipStartDate')}
              />
              <Input
                label="Expiry Date"
                type="date"
                error={errors.membershipExpiryDate?.message}
                {...register('membershipExpiryDate')}
              />
            </div>
          </fieldset>

          {/* Acquisition */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-[#003559]">Acquisition (CAC Tracking)</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Source"
                error={errors.acquisitionSource?.message}
                options={ACQUISITION_SOURCES}
                {...register('acquisitionSource')}
              />
              <Input
                label="Promo Code"
                placeholder="WELCOME10"
                error={errors.acquisitionPromoCode?.message}
                {...register('acquisitionPromoCode')}
              />
              <Input
                label="Acquisition Cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                error={errors.acquisitionCost?.message}
                {...register('acquisitionCost')}
              />
            </div>
          </fieldset>

          {/* Tags */}
          <div>
            <Textarea
              label="Tags"
              placeholder="vip, high-value, at-risk (comma-separated)"
              error={errors.tags?.message}
              rows={2}
              {...register('tags')}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter tags separated by commas. Tags help with segmentation and automation.
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
            {isEditing ? 'Save Changes' : 'Create Member'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default MemberForm;
