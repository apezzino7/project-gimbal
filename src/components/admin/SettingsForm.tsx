/**
 * SettingsForm Component
 * Form for managing application settings
 */

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SettingsSection } from '@/types/admin';
import { SETTINGS_SECTIONS } from '@/types/admin';
import { useAppSettings, useUpdateAppSettings, useMessagingStatus } from '@/hooks/useProfile';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';

// =============================================================================
// Types & Schema
// =============================================================================

// Explicit interface to avoid zod type inference issues with preprocess
interface SettingsFormData {
  companyName: string;
  companyAddress?: string | null;
  timezone: string;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioPhoneNumber?: string | null;
  sendgridApiKey?: string | null;
  sendgridFromEmail?: string | null;
  sendgridFromName?: string | null;
  monthlySmsLimit: number;
  monthlyEmailLimit: number;
  dataRetentionDays: number;
  auditRetentionDays: number;
}

const settingsSchema = z.object({
  // General
  companyName: z.string().min(1, 'Company name is required').max(100),
  companyAddress: z.string().max(500).optional().nullable(),
  timezone: z.string().min(1, 'Timezone is required'),
  // Twilio
  twilioAccountSid: z.string().max(100).optional().nullable(),
  twilioAuthToken: z.string().max(100).optional().nullable(),
  twilioPhoneNumber: z.string().max(20).optional().nullable(),
  // SendGrid
  sendgridApiKey: z.string().max(100).optional().nullable(),
  sendgridFromEmail: z.string().email('Invalid email').max(100).optional().nullable().or(z.literal('')),
  sendgridFromName: z.string().max(100).optional().nullable(),
  // Limits
  monthlySmsLimit: z.coerce.number().int().min(0).max(1000000),
  monthlyEmailLimit: z.coerce.number().int().min(0).max(10000000),
  // Retention
  dataRetentionDays: z.coerce.number().int().min(7).max(365),
  auditRetentionDays: z.coerce.number().int().min(7).max(2555),
});

export interface SettingsFormProps {
  /** Initial section to show */
  initialSection?: SettingsSection;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' },
];

// =============================================================================
// Icons
// =============================================================================

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ConfiguredIcon() {
  return (
    <svg className="w-4 h-4 text-[#2e7d32]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function NotConfiguredIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SettingsForm({
  initialSection = 'general',
  className = '',
}: SettingsFormProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const { data: settings, isLoading } = useAppSettings();
  const { data: messagingStatus } = useMessagingStatus();
  const updateSettings = useUpdateAppSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormData>,
    defaultValues: {
      companyName: '',
      companyAddress: '',
      timezone: 'America/New_York',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
      sendgridApiKey: '',
      sendgridFromEmail: '',
      sendgridFromName: '',
      monthlySmsLimit: 10000,
      monthlyEmailLimit: 50000,
      dataRetentionDays: 30,
      auditRetentionDays: 30,
    },
  });

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        companyName: settings.companyName || '',
        companyAddress: settings.companyAddress || '',
        timezone: settings.timezone || 'America/New_York',
        twilioAccountSid: settings.twilioAccountSid || '',
        twilioAuthToken: '', // Don't prefill masked value
        twilioPhoneNumber: settings.twilioPhoneNumber || '',
        sendgridApiKey: '', // Don't prefill masked value
        sendgridFromEmail: settings.sendgridFromEmail || '',
        sendgridFromName: settings.sendgridFromName || '',
        monthlySmsLimit: settings.monthlySmsLimit,
        monthlyEmailLimit: settings.monthlyEmailLimit,
        dataRetentionDays: settings.dataRetentionDays,
        auditRetentionDays: settings.auditRetentionDays,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      // Only include fields that have values (don't overwrite with empty strings)
      const updateData: Record<string, unknown> = {
        companyName: data.companyName,
        companyAddress: data.companyAddress || null,
        timezone: data.timezone,
        monthlySmsLimit: data.monthlySmsLimit,
        monthlyEmailLimit: data.monthlyEmailLimit,
        dataRetentionDays: data.dataRetentionDays,
        auditRetentionDays: data.auditRetentionDays,
      };

      // Only include Twilio fields if provided
      if (data.twilioAccountSid) updateData.twilioAccountSid = data.twilioAccountSid;
      if (data.twilioAuthToken) updateData.twilioAuthToken = data.twilioAuthToken;
      if (data.twilioPhoneNumber) updateData.twilioPhoneNumber = data.twilioPhoneNumber;

      // Only include SendGrid fields if provided
      if (data.sendgridApiKey) updateData.sendgridApiKey = data.sendgridApiKey;
      if (data.sendgridFromEmail) updateData.sendgridFromEmail = data.sendgridFromEmail;
      if (data.sendgridFromName) updateData.sendgridFromName = data.sendgridFromName;

      await updateSettings.mutateAsync(updateData);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="p-8 text-center text-gray-500">Loading settings...</div>
      </Card>
    );
  }

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* Section Navigation */}
      <div className="w-64 shrink-0">
        <nav className="space-y-1" aria-label="Settings sections">
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-[#0353a4] text-white'
                  : 'text-gray-700 hover:bg-[#f5f5f5]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{section.label}</span>
                {section.id === 'twilio' && messagingStatus && (
                  messagingStatus.sms.configured ? <ConfiguredIcon /> : <NotConfiguredIcon />
                )}
                {section.id === 'sendgrid' && messagingStatus && (
                  messagingStatus.email.configured ? <ConfiguredIcon /> : <NotConfiguredIcon />
                )}
              </div>
              <span
                className={`text-sm ${
                  activeSection === section.id ? 'text-white/80' : 'text-gray-500'
                }`}
              >
                {section.description}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Form */}
      <Card className="flex-1">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label || 'Settings'}
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* General Section */}
            {activeSection === 'general' && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    error={errors.companyName?.message}
                  />
                </div>

                <div>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Physical Address (CAN-SPAM)
                  </label>
                  <Textarea
                    id="companyAddress"
                    {...register('companyAddress')}
                    rows={3}
                    placeholder="123 Main St, Suite 100&#10;City, State 12345"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Required for CAN-SPAM compliance in marketing emails
                  </p>
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                    Default Timezone
                  </label>
                  <Select
                    id="timezone"
                    options={TIMEZONES}
                    {...register('timezone')}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Used for TCPA quiet hours (8 AM - 9 PM)
                  </p>
                </div>
              </>
            )}

            {/* Twilio Section */}
            {activeSection === 'twilio' && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  {messagingStatus?.sms.configured ? (
                    <Badge variant="success" dot>Configured</Badge>
                  ) : (
                    <Badge variant="warning">Not Configured</Badge>
                  )}
                  {messagingStatus?.sms.phoneNumber && (
                    <span className="text-sm text-gray-600">
                      Phone: {messagingStatus.sms.phoneNumber}
                    </span>
                  )}
                </div>

                <div>
                  <label htmlFor="twilioAccountSid" className="block text-sm font-medium text-gray-700 mb-1">
                    Account SID
                  </label>
                  <Input
                    id="twilioAccountSid"
                    {...register('twilioAccountSid')}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label htmlFor="twilioAuthToken" className="block text-sm font-medium text-gray-700 mb-1">
                    Auth Token
                  </label>
                  <Input
                    id="twilioAuthToken"
                    type="password"
                    {...register('twilioAuthToken')}
                    placeholder={settings?.twilioAuthToken ? '••••••••' : 'Enter auth token'}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Leave blank to keep existing token
                  </p>
                </div>

                <div>
                  <label htmlFor="twilioPhoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    id="twilioPhoneNumber"
                    {...register('twilioPhoneNumber')}
                    placeholder="+15551234567"
                  />
                </div>
              </>
            )}

            {/* SendGrid Section */}
            {activeSection === 'sendgrid' && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  {messagingStatus?.email.configured ? (
                    <Badge variant="success" dot>Configured</Badge>
                  ) : (
                    <Badge variant="warning">Not Configured</Badge>
                  )}
                  {messagingStatus?.email.fromEmail && (
                    <span className="text-sm text-gray-600">
                      From: {messagingStatus.email.fromName || ''} &lt;{messagingStatus.email.fromEmail}&gt;
                    </span>
                  )}
                </div>

                <div>
                  <label htmlFor="sendgridApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <Input
                    id="sendgridApiKey"
                    type="password"
                    {...register('sendgridApiKey')}
                    placeholder={settings?.sendgridApiKey ? '••••••••' : 'SG.xxxxxxxx'}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Leave blank to keep existing key
                  </p>
                </div>

                <div>
                  <label htmlFor="sendgridFromEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    From Email
                  </label>
                  <Input
                    id="sendgridFromEmail"
                    type="email"
                    {...register('sendgridFromEmail')}
                    error={errors.sendgridFromEmail?.message}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>

                <div>
                  <label htmlFor="sendgridFromName" className="block text-sm font-medium text-gray-700 mb-1">
                    From Name
                  </label>
                  <Input
                    id="sendgridFromName"
                    {...register('sendgridFromName')}
                    placeholder="Your Company"
                  />
                </div>
              </>
            )}

            {/* Limits Section */}
            {activeSection === 'limits' && (
              <>
                <div>
                  <label htmlFor="monthlySmsLimit" className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly SMS Limit
                  </label>
                  <Input
                    id="monthlySmsLimit"
                    type="number"
                    {...register('monthlySmsLimit')}
                    error={errors.monthlySmsLimit?.message}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Maximum SMS messages per month (0 = unlimited)
                  </p>
                </div>

                <div>
                  <label htmlFor="monthlyEmailLimit" className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Email Limit
                  </label>
                  <Input
                    id="monthlyEmailLimit"
                    type="number"
                    {...register('monthlyEmailLimit')}
                    error={errors.monthlyEmailLimit?.message}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Maximum emails per month (0 = unlimited)
                  </p>
                </div>
              </>
            )}

            {/* Retention Section */}
            {activeSection === 'retention' && (
              <>
                <div>
                  <label htmlFor="dataRetentionDays" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Retention (Days)
                  </label>
                  <Input
                    id="dataRetentionDays"
                    type="number"
                    {...register('dataRetentionDays')}
                    error={errors.dataRetentionDays?.message}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    How long to keep campaign data (7-365 days)
                  </p>
                </div>

                <div>
                  <label htmlFor="auditRetentionDays" className="block text-sm font-medium text-gray-700 mb-1">
                    Audit Log Retention (Days)
                  </label>
                  <Input
                    id="auditRetentionDays"
                    type="number"
                    {...register('auditRetentionDays')}
                    error={errors.auditRetentionDays?.message}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    How long to keep audit logs (7-2555 days for SOC 2 compliance)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#f5f5f5] border-t border-[#e0e0e0] flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || updateSettings.isPending}
              disabled={!isDirty}
              leftIcon={<CheckIcon />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default SettingsForm;
