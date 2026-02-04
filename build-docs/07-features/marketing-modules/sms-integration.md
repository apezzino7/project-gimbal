# SMS Integration

## Overview

Project Gimbal integrates with SMS providers to enable text message campaign functionality. The primary provider is Twilio, with support for alternative providers.

## Supported Providers

### Primary: Twilio
- **Pros**: Reliable, global coverage, robust API, webhook support
- **Cons**: Higher cost per message
- **Use Case**: Production deployments, international campaigns

### Alternative: AWS SNS
- **Pros**: Cost-effective, AWS ecosystem integration
- **Cons**: Limited international support, basic features
- **Use Case**: US-only campaigns, cost-sensitive deployments

### Custom Provider
- **Pros**: Flexibility, existing provider contracts
- **Cons**: Integration effort required
- **Use Case**: Enterprise customers with existing SMS infrastructure

## Twilio Integration

### Account Setup

#### 1. Create Twilio Account
```bash
1. Sign up at https://www.twilio.com
2. Verify your email and phone
3. Complete account setup
4. Upgrade to paid account (required for production)
```

#### 2. Get Credentials
```typescript
interface TwilioCredentials {
  accountSid: string;    // Found in Console Dashboard
  authToken: string;     // Found in Console Dashboard
  phoneNumber: string;   // Purchase or use existing
}

// Example
const credentials = {
  accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  authToken: 'your_auth_token_here',
  phoneNumber: '+11234567890'
};
```

#### 3. Purchase Phone Number
```bash
# Via Twilio Console
1. Navigate to Phone Numbers > Buy a Number
2. Select country and capabilities (SMS)
3. Search for number
4. Purchase number

# Via API
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers.json
Authorization: Basic {base64(AccountSid:AuthToken)}
Content-Type: application/x-www-form-urlencoded

PhoneNumber=+11234567890
SmsUrl=https://your-instance.gimbal.app/webhooks/twilio
```

### Configuration in Gimbal

#### Admin Portal Setup
```typescript
// Store in instance_config table
const smsConfig = {
  provider: 'twilio',
  credentials: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: encrypt(process.env.TWILIO_AUTH_TOKEN),
    phoneNumber: '+11234567890'
  },
  settings: {
    enableDeliveryTracking: true,
    webhookUrl: 'https://your-instance.gimbal.app/webhooks/twilio',
    maxRetries: 3,
    retryDelay: 300 // seconds
  }
};
```

#### Environment Variables
```bash
# .env.production
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+11234567890
TWILIO_WEBHOOK_SECRET=your_webhook_secret
```

## SMS Sending Implementation

### Edge Function: Send SMS

#### `supabase/functions/send-sms/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Twilio from 'https://esm.sh/twilio@4.19.0';

const twilioClient = Twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);

interface SMSRequest {
  to: string;
  message: string;
  campaignId?: string;
}

serve(async (req) => {
  try {
    const { to, message, campaignId }: SMSRequest = await req.json();

    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400 }
      );
    }

    // Send SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      to: to,
      from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      statusCallback: `${Deno.env.get('PUBLIC_URL')}/webhooks/twilio`,
    });

    // Log to database
    await logSMSDelivery({
      campaignId,
      recipient: to,
      messageSid: result.sid,
      status: result.status,
      sentAt: new Date()
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: result.sid,
        status: result.status
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('SMS sending error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});

function isValidPhoneNumber(phone: string): boolean {
  // E.164 format validation
  return /^\+[1-9]\d{1,14}$/.test(phone);
}
```

### Bulk SMS Sending

#### Campaign Processing
```typescript
interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];  // Phone numbers
  scheduledFor?: Date;
  throttle?: {
    messagesPerSecond: number;
    messagesPerMinute: number;
  };
}

async function processSMSCampaign(campaign: SMSCampaign) {
  const throttle = campaign.throttle || {
    messagesPerSecond: 10,
    messagesPerMinute: 100
  };

  // Batch processing to respect rate limits
  const batches = chunk(campaign.recipients, throttle.messagesPerSecond);

  for (const batch of batches) {
    // Send batch
    await Promise.all(
      batch.map(recipient =>
        sendSMS({
          to: recipient,
          message: personalizeMessage(campaign.message, recipient),
          campaignId: campaign.id
        })
      )
    );

    // Wait before next batch
    await delay(1000); // 1 second
  }

  // Update campaign status
  await updateCampaignStatus(campaign.id, 'sent');
}

function personalizeMessage(template: string, recipient: string): string {
  // Replace placeholders like {{first_name}}, {{company}}
  const user = getUserData(recipient);

  return template
    .replace(/\{\{first_name\}\}/g, user.firstName || '')
    .replace(/\{\{last_name\}\}/g, user.lastName || '')
    .replace(/\{\{company\}\}/g, user.company || '');
}
```

### Message Templates

#### Template System
```typescript
interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];  // [first_name, company, discount_code]
  category: 'promotional' | 'transactional' | 'notification';
}

// Example templates
const templates = {
  welcome: {
    name: 'Welcome Message',
    content: 'Hi {{first_name}}! Welcome to {{company}}. Your account is ready!',
    variables: ['first_name', 'company']
  },
  promotional: {
    name: 'Discount Offer',
    content: 'Hey {{first_name}}! Get {{discount}}% off with code {{code}}. Valid until {{expiry}}.',
    variables: ['first_name', 'discount', 'code', 'expiry']
  },
  reminder: {
    name: 'Appointment Reminder',
    content: 'Hi {{first_name}}, reminder: Your appointment is {{date}} at {{time}}. Reply YES to confirm.',
    variables: ['first_name', 'date', 'time']
  }
};
```

## Opt-In/Opt-Out Management

### Consent Tracking

```sql
-- SMS consent table
CREATE TABLE sms_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_source VARCHAR(50), -- web_form, api, manual
    consented_at TIMESTAMP,
    opt_out_at TIMESTAMP,
    opt_out_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_sms_consent_phone ON sms_consent(phone_number);
CREATE INDEX idx_sms_consent_status ON sms_consent(consent_given);
```

### Opt-Out Implementation

```typescript
// Webhook handler for incoming SMS
async function handleIncomingSMS(req: Request) {
  const { From, Body } = await req.formData();

  // Check for opt-out keywords
  const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];

  if (optOutKeywords.includes(Body.trim().toUpperCase())) {
    await optOutUser(From);

    // Send confirmation
    await sendSMS({
      to: From,
      message: 'You have been unsubscribed from our SMS list. Reply START to resubscribe.'
    });

    return new Response('OK', { status: 200 });
  }

  // Check for opt-in
  if (Body.trim().toUpperCase() === 'START') {
    await optInUser(From);

    await sendSMS({
      to: From,
      message: 'You are now subscribed to our SMS updates. Reply STOP to unsubscribe anytime.'
    });
  }

  return new Response('OK', { status: 200 });
}

async function optOutUser(phoneNumber: string) {
  await supabase
    .from('sms_consent')
    .update({
      consent_given: false,
      opt_out_at: new Date().toISOString()
    })
    .eq('phone_number', phoneNumber);
}

async function optInUser(phoneNumber: string) {
  await supabase
    .from('sms_consent')
    .upsert({
      phone_number: phoneNumber,
      consent_given: true,
      consented_at: new Date().toISOString(),
      opt_out_at: null
    });
}
```

### Pre-Send Consent Check

```typescript
async function canSendSMS(phoneNumber: string): Promise<boolean> {
  const { data } = await supabase
    .from('sms_consent')
    .select('consent_given')
    .eq('phone_number', phoneNumber)
    .single();

  return data?.consent_given === true;
}

// Use before sending
async function sendSMSWithConsent(to: string, message: string) {
  if (!await canSendSMS(to)) {
    throw new Error('User has not consented to SMS');
  }

  return await sendSMS({ to, message });
}
```

## Compliance

### TCPA (Telephone Consumer Protection Act)

#### Requirements
1. **Prior Express Written Consent**: Obtain consent before sending marketing SMS
2. **Identification**: Clearly identify sender
3. **Opt-Out**: Provide easy opt-out mechanism
4. **Timing**: No messages before 8 AM or after 9 PM (recipient's timezone)
5. **Record Keeping**: Maintain consent records for 4 years

#### Implementation
```typescript
const complianceRules = {
  // Quiet hours enforcement
  isWithinAllowedHours(timezone: string): boolean {
    const now = new Date();
    const recipientTime = utcToZonedTime(now, timezone);
    const hour = recipientTime.getHours();
    return hour >= 8 && hour < 21;
  },

  // Message compliance
  ensureCompliantMessage(message: string, companyName: string): string {
    let compliantMessage = message;

    // Add company identification if missing
    if (!message.includes(companyName)) {
      compliantMessage = `${companyName}: ${message}`;
    }

    // Add opt-out instruction
    if (!message.toLowerCase().includes('stop')) {
      compliantMessage += ' Reply STOP to unsubscribe.';
    }

    // Check message length (160 chars per SMS segment)
    if (compliantMessage.length > 160) {
      console.warn('Message exceeds 160 characters, will be sent as MMS or multiple segments');
    }

    return compliantMessage;
  }
};
```

### GDPR Compliance

```typescript
// Data subject access request
async function exportSMSData(phoneNumber: string) {
  const consent = await supabase
    .from('sms_consent')
    .select('*')
    .eq('phone_number', phoneNumber);

  const messages = await supabase
    .from('sms_messages')
    .select('*')
    .eq('recipient', phoneNumber);

  return {
    consent: consent.data,
    messages: messages.data,
    exportedAt: new Date()
  };
}

// Right to erasure
async function deleteSMSData(phoneNumber: string) {
  // Anonymize messages (keep for analytics)
  await supabase
    .from('sms_messages')
    .update({ recipient: 'REDACTED' })
    .eq('recipient', phoneNumber);

  // Delete consent record
  await supabase
    .from('sms_consent')
    .delete()
    .eq('phone_number', phoneNumber);
}
```

## Delivery Tracking

### Webhook Handler

```typescript
// supabase/functions/twilio-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const formData = await req.formData();

  const messageSid = formData.get('MessageSid');
  const status = formData.get('MessageStatus');
  const errorCode = formData.get('ErrorCode');

  // Update message status in database
  await supabase
    .from('sms_messages')
    .update({
      status: status,
      error_code: errorCode,
      updated_at: new Date().toISOString()
    })
    .eq('message_sid', messageSid);

  // Handle failures
  if (status === 'failed' || status === 'undelivered') {
    await handleDeliveryFailure(messageSid, errorCode);
  }

  return new Response('OK', { status: 200 });
});
```

### Status Tracking

```sql
-- SMS messages table
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    recipient VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_sid VARCHAR(100) UNIQUE,
    status VARCHAR(50), -- queued, sent, delivered, failed, undelivered
    error_code VARCHAR(10),
    segments INTEGER DEFAULT 1,
    cost DECIMAL(10, 4),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_messages_campaign ON sms_messages(campaign_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_sid ON sms_messages(message_sid);
```

## Analytics & Reporting

### Metrics Collection

```typescript
interface SMSAnalytics {
  campaignId: string;
  metrics: {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    avgDeliveryTime: number;  // seconds
    cost: number;
  };
  errorBreakdown: {
    [errorCode: string]: number;
  };
  hourlyBreakdown: {
    hour: number;
    sent: number;
    delivered: number;
  }[];
}

async function getSMSAnalytics(campaignId: string): Promise<SMSAnalytics> {
  const { data: messages } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('campaign_id', campaignId);

  const sent = messages.length;
  const delivered = messages.filter(m => m.status === 'delivered').length;
  const failed = messages.filter(m => m.status === 'failed').length;

  return {
    campaignId,
    metrics: {
      sent,
      delivered,
      failed,
      deliveryRate: delivered / sent,
      avgDeliveryTime: calculateAvgDeliveryTime(messages),
      cost: messages.reduce((sum, m) => sum + (m.cost || 0), 0)
    },
    errorBreakdown: groupErrorCodes(messages),
    hourlyBreakdown: groupByHour(messages)
  };
}
```

### Dashboard Widgets

```typescript
function SMSCampaignDashboard({ campaignId }: { campaignId: string }) {
  const { analytics, loading } = useSMSAnalytics(campaignId);

  if (loading) return <Spinner />;

  return (
    <div className="sms-dashboard">
      <MetricCard
        title="Delivery Rate"
        value={`${(analytics.metrics.deliveryRate * 100).toFixed(1)}%`}
        trend={analytics.metrics.deliveryRate >= 0.95 ? 'good' : 'warning'}
      />

      <MetricCard
        title="Total Sent"
        value={analytics.metrics.sent.toLocaleString()}
      />

      <MetricCard
        title="Total Cost"
        value={`$${analytics.metrics.cost.toFixed(2)}`}
      />

      <Chart
        type="line"
        data={analytics.hourlyBreakdown}
        xKey="hour"
        yKey="delivered"
        title="Delivery by Hour"
      />

      <ErrorBreakdownTable errors={analytics.errorBreakdown} />
    </div>
  );
}
```

## Error Handling

### Common Twilio Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 30001 | Queue overflow | Retry with backoff |
| 30003 | Unreachable destination | Mark as invalid number |
| 30004 | Message blocked | Remove from list |
| 30005 | Unknown destination | Verify number format |
| 30006 | Landline or unreachable | Remove or flag |
| 30007 | Carrier violation | Review content |
| 30008 | Unknown error | Retry once |

### Retry Logic

```typescript
async function sendSMSWithRetry(
  params: SMSRequest,
  maxRetries = 3
): Promise<SMSResult> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendSMS(params);
    } catch (error) {
      lastError = error;

      // Don't retry on permanent failures
      if (isPermanentError(error.code)) {
        throw error;
      }

      // Exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  throw lastError;
}

function isPermanentError(code: string): boolean {
  const permanentCodes = ['30003', '30004', '30006', '30007'];
  return permanentCodes.includes(code);
}
```

## Cost Optimization

### Strategies
1. **Segment Detection**: Twilio charges per 160-character segment
2. **Timing**: Off-peak rates (if applicable)
3. **Deduplication**: Avoid sending duplicates
4. **Number Validation**: Verify before sending
5. **Opt-Out Respect**: Don't send to opted-out users

### Cost Tracking

```typescript
async function estimateCampaignCost(campaign: SMSCampaign): Promise<number> {
  const baseRate = 0.0079; // USD per SMS (US rate)
  const segments = Math.ceil(campaign.message.length / 160);
  const recipients = campaign.recipients.length;

  return recipients * segments * baseRate;
}
```

## Testing

### Test Mode

```typescript
// Use Twilio test credentials for development
const testConfig = {
  accountSid: 'ACtest_credentials_sid',
  authToken: 'test_auth_token',
  phoneNumber: '+15005550006' // Twilio magic number
};

// Magic test numbers (don't send real SMS)
const testNumbers = {
  valid: '+15005550006',      // Success
  invalid: '+15005550001',    // Invalid
  unavailable: '+15005550007', // No SMS capability
  international: '+441134960000' // UK test number
};
```

### Unit Tests

```typescript
describe('SMS Service', () => {
  it('sends SMS successfully', async () => {
    const result = await sendSMS({
      to: '+15005550006',
      message: 'Test message'
    });

    expect(result.status).toBe('queued');
    expect(result.messageSid).toBeDefined();
  });

  it('validates phone number format', async () => {
    await expect(sendSMS({
      to: '1234567890',  // Missing +
      message: 'Test'
    })).rejects.toThrow('Invalid phone number');
  });

  it('respects opt-out', async () => {
    await optOutUser('+15005550006');

    await expect(sendSMSWithConsent(
      '+15005550006',
      'Test'
    )).rejects.toThrow('User has not consented');
  });
});
```

## Monitoring & Alerts

### Alert Conditions
- Delivery rate < 90%
- Error rate > 5%
- Quota nearing limit (>80%)
- Webhook failures
- Unusual spending patterns

### Implementation

```typescript
async function monitorSMSHealth() {
  const last24h = subHours(new Date(), 24);

  const { data: messages } = await supabase
    .from('sms_messages')
    .select('*')
    .gte('created_at', last24h.toISOString());

  const deliveryRate = messages.filter(m => m.status === 'delivered').length / messages.length;

  if (deliveryRate < 0.9) {
    await sendAlert({
      severity: 'warning',
      message: `SMS delivery rate dropped to ${(deliveryRate * 100).toFixed(1)}%`,
      metric: 'sms_delivery_rate',
      value: deliveryRate
    });
  }
}
```

## Best Practices

1. **Always get consent** before sending marketing SMS
2. **Respect opt-outs** immediately
3. **Honor quiet hours** (8 AM - 9 PM recipient timezone)
4. **Keep messages concise** (ideally under 160 characters)
5. **Include clear sender identification**
6. **Provide easy opt-out** (Reply STOP)
7. **Monitor delivery rates** and investigate drops
8. **Track costs** and set budgets
9. **Test thoroughly** before production campaigns
10. **Maintain audit logs** for compliance
