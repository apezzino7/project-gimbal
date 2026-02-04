# Customer Admin Portal

## Overview

The Customer Admin Portal provides instance owners and administrators with tools to configure, manage, and monitor their Project Gimbal instance. This self-service portal reduces dependency on platform support and gives customers control over their deployment.

## Access & Permissions

### Admin Roles

```typescript
enum AdminRole {
  OWNER = 'owner',       // Full access to all settings
  ADMIN = 'admin',       // Most settings, cannot delete instance
  MANAGER = 'manager',   // User management and campaign oversight
  SUPPORT = 'support'    // Read-only access for customer support
}
```

### Permission Matrix

| Feature | Owner | Admin | Manager | Support |
|---------|-------|-------|---------|---------|
| Branding Settings | ✓ | ✓ | ✗ | ✗ |
| User Management | ✓ | ✓ | ✓ | ✗ |
| Integration Config | ✓ | ✓ | ✗ | ✗ |
| Billing & Usage | ✓ | ✓ | ✗ | ✓ (view) |
| Instance Settings | ✓ | ✓ | ✗ | ✗ |
| Audit Logs | ✓ | ✓ | ✗ | ✓ (view) |
| Campaign Management | ✓ | ✓ | ✓ | ✗ |
| Reports & Analytics | ✓ | ✓ | ✓ | ✓ (view) |

## Portal Sections

### 1. Dashboard Overview

The admin dashboard provides at-a-glance metrics and health status.

#### Components
```typescript
interface AdminDashboard {
  instanceHealth: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastIncident?: Date;
  };
  usage: {
    activeUsers: number;
    smsQuota: { used: number; total: number };
    emailQuota: { used: number; total: number };
    storageUsed: number;
  };
  recentActivity: Activity[];
  quickActions: QuickAction[];
}
```

#### UI Layout
```
┌────────────────────────────────────────────────────┐
│  Admin Portal - Dashboard                          │
├────────────────────────────────────────────────────┤
│  Instance Health: ● Healthy    Uptime: 99.9%      │
├──────────────┬──────────────┬─────────────────────┤
│  Active Users│  SMS Usage   │  Email Usage        │
│      47      │  7,245/10K   │  32,891/50K         │
├──────────────┴──────────────┴─────────────────────┤
│  Recent Activity                                   │
│  • John Doe added new user (2 min ago)            │
│  • Campaign "Summer Sale" sent (15 min ago)       │
│  • API key regenerated (1 hour ago)               │
├────────────────────────────────────────────────────┤
│  Quick Actions                                     │
│  [+ Add User] [Upload Template] [View Reports]    │
└────────────────────────────────────────────────────┘
```

### 2. Branding & Customization

Allows customers to customize the look and feel of their instance.

#### Branding Options

##### Logo Upload
```typescript
interface BrandingSettings {
  logo: {
    primary: File | string;   // Main logo
    favicon: File | string;   // Browser favicon
    emailHeader: File | string; // Email template header
  };
  colors: {
    primary: string;          // Hex color #0353A4
    secondary: string;        // Hex color #006DAA
    accent: string;           // Hex color for CTAs
  };
  typography: {
    fontFamily: string;       // Custom font (Google Fonts)
    headingFont?: string;     // Optional heading font
  };
  customCSS?: string;         // Advanced: Custom CSS
}
```

##### Implementation
```typescript
// src/components/admin/BrandingSettings.tsx
function BrandingSettings() {
  const [branding, setBranding] = useState<BrandingSettings>();

  const handleLogoUpload = async (file: File) => {
    const { data, error } = await supabase.storage
      .from('branding')
      .upload(`logos/${instanceId}/${file.name}`, file);

    if (!error) {
      await updateInstanceConfig({ logo_url: data.path });
    }
  };

  const handleColorChange = async (colorType: string, value: string) => {
    await updateInstanceConfig({
      [`${colorType}_color`]: value
    });
  };

  return (
    <div className="branding-settings">
      <h2>Branding</h2>

      <Section title="Logo">
        <ImageUploader
          current={branding.logo.primary}
          onUpload={handleLogoUpload}
          accept="image/png,image/jpeg,image/svg+xml"
          maxSize={2 * 1024 * 1024} // 2MB
        />
      </Section>

      <Section title="Colors">
        <ColorPicker
          label="Primary Color"
          value={branding.colors.primary}
          onChange={(c) => handleColorChange('primary', c)}
        />
        <ColorPicker
          label="Secondary Color"
          value={branding.colors.secondary}
          onChange={(c) => handleColorChange('secondary', c)}
        />
      </Section>

      <Section title="Typography">
        <FontSelector
          value={branding.typography.fontFamily}
          onChange={handleFontChange}
        />
      </Section>
    </div>
  );
}
```

### 3. User Management

Comprehensive user administration tools.

#### User List View
```typescript
interface UserManagement {
  users: User[];
  filters: {
    role?: string;
    status?: 'active' | 'inactive' | 'suspended';
    search?: string;
  };
  actions: {
    create: () => void;
    edit: (userId: string) => void;
    suspend: (userId: string) => void;
    delete: (userId: string) => void;
    resetPassword: (userId: string) => void;
  };
}
```

#### User Form
```typescript
interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  quotas?: {
    maxCampaigns?: number;
    maxReports?: number;
  };
}
```

#### Bulk Operations
```typescript
// Bulk user import from CSV
interface BulkUserImport {
  file: File;
  mapping: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  onProgress: (progress: number) => void;
  onComplete: (result: ImportResult) => void;
}

// CSV Format
// email,first_name,last_name,role
// john@example.com,John,Doe,user
// jane@example.com,Jane,Smith,manager
```

### 4. Integration Settings

Configure third-party service integrations.

#### SMS Provider (Twilio)
```typescript
interface SMSIntegrationSettings {
  provider: 'twilio' | 'aws_sns' | 'custom';
  credentials: {
    accountSid: string;
    authToken: string;    // Encrypted
    phoneNumber: string;  // Sender ID
  };
  settings: {
    enableDeliveryTracking: boolean;
    webhookUrl: string;
    fallbackProvider?: string;
  };
  testing: {
    testMode: boolean;
    testPhoneNumbers: string[];
  };
}
```

#### Email Provider (SendGrid)
```typescript
interface EmailIntegrationSettings {
  provider: 'sendgrid' | 'aws_ses' | 'mailgun' | 'custom';
  credentials: {
    apiKey: string;       // Encrypted
    fromEmail: string;
    fromName: string;
  };
  settings: {
    enableTracking: boolean;
    enableClickTracking: boolean;
    customDomain?: string;
    dkimSettings?: {
      domain: string;
      selector: string;
    };
  };
  unsubscribe: {
    enabled: boolean;
    footerText: string;
    redirectUrl: string;
  };
}
```

#### Integration UI
```typescript
function IntegrationSettings() {
  const [smsConfig, setSMSConfig] = useState<SMSIntegrationSettings>();
  const [emailConfig, setEmailConfig] = useState<EmailIntegrationSettings>();

  const testSMSConnection = async () => {
    try {
      const result = await supabase.functions.invoke('test-sms-connection', {
        body: { phoneNumber: '+1234567890', message: 'Test' }
      });
      if (result.data.success) {
        toast.success('SMS test successful!');
      }
    } catch (error) {
      toast.error('SMS test failed');
    }
  };

  return (
    <div className="integration-settings">
      <Section title="SMS Integration">
        <Select
          label="Provider"
          value={smsConfig.provider}
          options={['twilio', 'aws_sns']}
        />
        <Input
          label="Account SID"
          value={smsConfig.credentials.accountSid}
          onChange={(v) => updateSMSConfig({ accountSid: v })}
        />
        <PasswordInput
          label="Auth Token"
          value="••••••••"
          onChange={(v) => updateSMSConfig({ authToken: v })}
        />
        <Button onClick={testSMSConnection}>Test Connection</Button>
      </Section>

      <Section title="Email Integration">
        {/* Similar setup for email */}
      </Section>
    </div>
  );
}
```

### 5. Instance Settings

Global configuration for the instance.

#### General Settings
```typescript
interface InstanceSettings {
  general: {
    instanceName: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
  };
  security: {
    sessionTimeout: number;  // minutes
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      expiryDays: number;
    };
    mfaRequired: boolean;
    ipWhitelist?: string[];
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    systemAlerts: boolean;
    alertEmail: string;
  };
  compliance: {
    gdprEnabled: boolean;
    dataRetentionDays: number;
    auditLogRetentionDays: number;
  };
}
```

#### Quota Management
```typescript
interface QuotaSettings {
  sms: {
    monthlyLimit: number;
    currentUsage: number;
    overageAllowed: boolean;
    overageRate?: number;
  };
  email: {
    monthlyLimit: number;
    currentUsage: number;
    overageAllowed: boolean;
    overageRate?: number;
  };
  storage: {
    limit: number;        // GB
    currentUsage: number;
    warningThreshold: number; // 80%
  };
  users: {
    maxUsers: number;
    currentUsers: number;
  };
}
```

### 6. Billing & Usage

Subscription and usage tracking.

#### Usage Dashboard
```typescript
interface UsageMetrics {
  currentPeriod: {
    start: Date;
    end: Date;
  };
  sms: {
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  };
  email: {
    sent: number;
    delivered: number;
    bounced: number;
    cost: number;
  };
  storage: {
    used: number;
    cost: number;
  };
  totalCost: number;
  projectedCost: number;
}
```

#### Billing History
```typescript
interface Invoice {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: Date;
  downloadUrl: string;
}
```

#### UI Components
```tsx
function BillingDashboard() {
  const { usage, invoices } = useBillingData();

  return (
    <div>
      <UsageChart data={usage} />

      <QuotaCards>
        <QuotaCard
          title="SMS"
          used={usage.sms.sent}
          limit={10000}
          cost={usage.sms.cost}
        />
        <QuotaCard
          title="Email"
          used={usage.email.sent}
          limit={50000}
          cost={usage.email.cost}
        />
      </QuotaCards>

      <InvoiceTable invoices={invoices} />
    </div>
  );
}
```

### 7. Audit Logs

Comprehensive activity tracking for compliance.

#### Log Filtering
```typescript
interface AuditLogFilters {
  dateRange: { start: Date; end: Date };
  userId?: string;
  action?: string[];  // login, create, update, delete, export
  resourceType?: string[];  // user, campaign, report
  status?: 'success' | 'failure';
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  metadata: Record<string, any>;
}
```

#### Log Viewer
```tsx
function AuditLogViewer() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    dateRange: { start: subDays(new Date(), 30), end: new Date() }
  });
  const { logs, loading } = useAuditLogs(filters);

  return (
    <div>
      <LogFilters filters={filters} onChange={setFilters} />

      <LogTable logs={logs} loading={loading} />

      <ExportButton
        onClick={() => exportLogs(filters, 'csv')}
        label="Export to CSV"
      />
    </div>
  );
}
```

### 8. API & Webhooks

Manage API access and webhook configurations.

#### API Key Management
```typescript
interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;  // First 8 chars (shown)
  scopes: string[];   // Permissions
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

function APIKeyManager() {
  const [keys, setKeys] = useState<APIKey[]>([]);

  const createAPIKey = async (name: string, scopes: string[]) => {
    const { data } = await supabase.functions.invoke('create-api-key', {
      body: { name, scopes }
    });

    // Show full key ONCE
    alert(`API Key (save this, it won't be shown again): ${data.key}`);

    setKeys([...keys, data.keyInfo]);
  };

  return (
    <div>
      <Button onClick={() => createAPIKey('My API Key', ['campaigns.read'])}>
        Create API Key
      </Button>

      <Table>
        {keys.map(key => (
          <Row key={key.id}>
            <Cell>{key.name}</Cell>
            <Cell>{key.keyPrefix}••••••••</Cell>
            <Cell>{key.scopes.join(', ')}</Cell>
            <Cell>{key.lastUsed ? formatDate(key.lastUsed) : 'Never'}</Cell>
            <Cell><Button onClick={() => revokeKey(key.id)}>Revoke</Button></Cell>
          </Row>
        ))}
      </Table>
    </div>
  );
}
```

#### Webhook Configuration
```typescript
interface WebhookConfig {
  id: string;
  url: string;
  events: string[];  // campaign.sent, message.delivered, etc.
  secret: string;    // For signature verification
  active: boolean;
  lastDelivery?: {
    timestamp: Date;
    status: number;
    success: boolean;
  };
}

function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);

  const testWebhook = async (webhookId: string) => {
    await supabase.functions.invoke('test-webhook', {
      body: { webhookId, testEvent: 'test.event' }
    });
  };

  return (
    <div>
      <WebhookForm onSubmit={createWebhook} />

      <WebhookList
        webhooks={webhooks}
        onTest={testWebhook}
        onDelete={deleteWebhook}
      />
    </div>
  );
}
```

### 9. Data Management

Tools for data export, import, and retention.

#### Data Export
```typescript
interface DataExportOptions {
  resources: string[];  // users, campaigns, analytics, reports
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: { start: Date; end: Date };
  includeDeleted: boolean;
}

function DataExport() {
  const exportData = async (options: DataExportOptions) => {
    const { data } = await supabase.functions.invoke('export-data', {
      body: options
    });

    // Download file
    const blob = new Blob([data], { type: 'application/json' });
    downloadBlob(blob, `export-${Date.now()}.json`);
  };

  return (
    <ExportForm onSubmit={exportData} />
  );
}
```

#### GDPR Tools
```typescript
function GDPRTools() {
  const handleDataDeletion = async (userId: string) => {
    if (confirm('This will permanently delete all user data. Continue?')) {
      await supabase.functions.invoke('gdpr-delete-user', {
        body: { userId }
      });
    }
  };

  return (
    <div>
      <Section title="Data Subject Requests">
        <DSARForm onSubmit={handleDSAR} />
      </Section>

      <Section title="User Data Deletion">
        <UserSearch onSelect={(user) => handleDataDeletion(user.id)} />
      </Section>
    </div>
  );
}
```

### 10. Support & Help

Built-in support resources and contact options.

#### Knowledge Base Integration
```typescript
interface SupportFeatures {
  documentation: {
    articles: Article[];
    search: (query: string) => Article[];
  };
  ticketSystem: {
    createTicket: (issue: Ticket) => void;
    viewTickets: () => Ticket[];
  };
  chat: {
    enabled: boolean;
    online: boolean;
  };
  systemStatus: {
    status: 'operational' | 'degraded' | 'down';
    incidents: Incident[];
  };
}
```

## Security Considerations

### Access Control
- All admin endpoints protected by RLS
- Audit logging for all admin actions
- MFA required for sensitive operations
- Session timeout enforcement

### Data Protection
- Encrypt sensitive credentials (API keys, tokens)
- Mask displayed credentials
- Secure file upload validation
- Rate limiting on API endpoints

## Implementation Checklist

- [ ] Admin role implementation
- [ ] Branding customization UI
- [ ] User management interface
- [ ] Integration configuration forms
- [ ] Instance settings panel
- [ ] Billing dashboard
- [ ] Audit log viewer
- [ ] API key management
- [ ] Webhook configuration
- [ ] Data export tools
- [ ] GDPR compliance tools
- [ ] Support integration
- [ ] Mobile-responsive design
- [ ] Accessibility compliance (WCAG 2.1 AA)

## Future Enhancements

- Self-service instance provisioning
- Advanced analytics dashboard
- Custom role creation
- Workflow automation
- Scheduled reports
- Multi-language support
- White-label mobile app configuration
- Advanced security rules engine
