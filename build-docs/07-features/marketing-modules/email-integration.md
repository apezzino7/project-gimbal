# Email Integration

## Overview

Project Gimbal integrates with email service providers (ESPs) to enable email marketing campaign functionality. The primary provider is SendGrid, with support for alternatives like AWS SES and Mailgun.

## Supported Providers

### Primary: SendGrid
- **Pros**: Excellent deliverability, robust analytics, template system, webhooks
- **Cons**: Higher cost for large volumes
- **Use Case**: Marketing campaigns, transactional emails

### Alternative: AWS SES
- **Pros**: Cost-effective, reliable, AWS ecosystem
- **Cons**: Requires domain verification, limited UI
- **Use Case**: High-volume transactional emails

### Alternative: Mailgun
- **Pros**: Good deliverability, detailed logs
- **Cons**: Pricing can scale quickly
- **Use Case**: Developer-focused implementations

## SendGrid Integration

### Account Setup

#### 1. Create SendGrid Account
```bash
1. Sign up at https://sendgrid.com
2. Verify email address
3. Complete sender identity verification
4. Upgrade to appropriate plan
```

#### 2. Domain Authentication

```bash
# DNS Records for yourdomain.com
# Add these records to your DNS provider

# CNAME for email links
em1234.yourdomain.com → u1234.wl.sendgrid.net

# CNAME records for DKIM
s1._domainkey.yourdomain.com → s1.domainkey.u1234.wl.sendgrid.net
s2._domainkey.yourdomain.com → s2.domainkey.u1234.wl.sendgrid.net

# Verification typically takes 24-48 hours
```

#### 3. API Key Generation
```typescript
// Create API key in SendGrid Dashboard
// Settings > API Keys > Create API Key

interface SendGridCredentials {
  apiKey: string;           // Full access or restricted
  fromEmail: string;        // Verified sender email
  fromName: string;         // Sender display name
  replyTo?: string;         // Optional reply-to address
}

const credentials = {
  apiKey: 'SG.xxxxxxxxxxxxxxxxxxxxxxx',
  fromEmail: 'noreply@yourdomain.com',
  fromName: 'Your Company Name',
  replyTo: 'support@yourdomain.com'
};
```

### Configuration in Gimbal

```typescript
// Store in instance_config table
const emailConfig = {
  provider: 'sendgrid',
  credentials: {
    apiKey: encrypt(process.env.SENDGRID_API_KEY),
    fromEmail: 'noreply@yourdomain.com',
    fromName: 'Company Name'
  },
  settings: {
    enableTracking: true,
    enableClickTracking: true,
    customDomain: 'yourdomain.com',
    unsubscribeGroup: 12345,
    webhookUrl: 'https://your-instance.gimbal.app/webhooks/sendgrid'
  }
};
```

## Email Sending Implementation

### Edge Function: Send Email

```typescript
// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import sgMail from 'https://esm.sh/@sendgrid/mail@7.7.0';

sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  campaignId?: string;
  templateId?: string;
  dynamicData?: Record<string, any>;
}

serve(async (req) => {
  try {
    const emailData: EmailRequest = await req.json();

    // Validate email addresses
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    for (const email of recipients) {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid email: ${email}`);
      }
    }

    // Build message
    const msg = {
      to: emailData.to,
      from: {
        email: Deno.env.get('SENDGRID_FROM_EMAIL')!,
        name: Deno.env.get('SENDGRID_FROM_NAME')!
      },
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || stripHTML(emailData.html),
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      customArgs: {
        campaign_id: emailData.campaignId
      }
    };

    // Send via SendGrid
    const [response] = await sgMail.send(msg);

    // Log to database
    await logEmailDelivery({
      campaignId: emailData.campaignId,
      recipient: emailData.to,
      messageId: response.headers['x-message-id'],
      status: 'sent',
      sentAt: new Date()
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: response.headers['x-message-id']
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Email sending error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
```

### Bulk Email Sending

```typescript
interface EmailCampaign {
  id: string;
  subject: string;
  html: string;
  recipients: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    customData?: Record<string, any>;
  }>;
  scheduledFor?: Date;
  throttle?: {
    emailsPerSecond: number;
  };
}

async function processEmailCampaign(campaign: EmailCampaign) {
  const throttle = campaign.throttle || { emailsPerSecond: 100 };
  const batches = chunk(campaign.recipients, throttle.emailsPerSecond);

  for (const batch of batches) {
    // Send batch
    const promises = batch.map(recipient =>
      sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: personalizeEmail(campaign.html, recipient),
        campaignId: campaign.id
      })
    );

    await Promise.all(promises);

    // Wait before next batch
    await delay(1000);
  }

  await updateCampaignStatus(campaign.id, 'sent');
}

function personalizeEmail(
  template: string,
  recipient: { firstName?: string; lastName?: string; customData?: Record<string, any> }
): string {
  let personalized = template;

  // Replace common variables
  personalized = personalized
    .replace(/\{\{first_name\}\}/g, recipient.firstName || '')
    .replace(/\{\{last_name\}\}/g, recipient.lastName || '')
    .replace(/\{\{email\}\}/g, recipient.email || '');

  // Replace custom data
  if (recipient.customData) {
    Object.entries(recipient.customData).forEach(([key, value]) => {
      personalized = personalized.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        String(value)
      );
    });
  }

  return personalized;
}
```

## Email Templates

### Template System

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  category: 'promotional' | 'transactional' | 'newsletter';
  previewText?: string;
}

// Example templates
const templates = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Welcome {{first_name}}!</h1>
            <p>We're excited to have you on board at {{company_name}}.</p>
            <p>Get started by exploring our features:</p>
            <ul>
              <li>Create your first campaign</li>
              <li>Import your contacts</li>
              <li>Customize your templates</li>
            </ul>
            <a href="{{dashboard_url}}" style="display: inline-block; background: #0353A4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Go to Dashboard
            </a>
          </div>
        </body>
      </html>
    `,
    variables: ['first_name', 'company_name', 'dashboard_url']
  },

  promotional: {
    name: 'Promotional Email',
    subject: '{{discount_percent}}% Off - Limited Time!',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h1>Special Offer for {{first_name}}</h1>
            <p>Get {{discount_percent}}% off your next purchase!</p>
            <p>Use code: <strong>{{promo_code}}</strong></p>
            <p>Offer expires: {{expiry_date}}</p>
            <a href="{{shop_url}}?code={{promo_code}}" style="display: inline-block; background: #0353A4; color: white; padding: 12px 24px; text-decoration: none;">
              Shop Now
            </a>
          </div>
        </body>
      </html>
    `,
    variables: ['first_name', 'discount_percent', 'promo_code', 'expiry_date', 'shop_url']
  }
};
```

### MJML Templates (Recommended)

```xml
<!-- template.mjml -->
<mjml>
  <mj-head>
    <mj-title>{{campaign_name}}</mj-title>
    <mj-preview>{{preview_text}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body>
    <mj-section background-color="#f4f4f4">
      <mj-column>
        <mj-image src="{{logo_url}}" alt="{{company_name}}" width="150px" />
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold">
          Hello {{first_name}}!
        </mj-text>
        <mj-text>
          {{email_content}}
        </mj-text>
        <mj-button background-color="#0353A4" href="{{cta_url}}">
          {{cta_text}}
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f4f4f4">
      <mj-column>
        <mj-text font-size="12px" color="#666">
          <a href="{{unsubscribe_url}}">Unsubscribe</a> |
          <a href="{{preferences_url}}">Email Preferences</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

```typescript
// Convert MJML to HTML
import mjml2html from 'https://esm.sh/mjml@4.14.1';

function compileMJMLTemplate(mjml: string, variables: Record<string, any>): string {
  // Replace variables
  let processedMJML = mjml;
  Object.entries(variables).forEach(([key, value]) => {
    processedMJML = processedMJML.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      String(value)
    );
  });

  // Compile to HTML
  const { html, errors } = mjml2html(processedMJML);

  if (errors.length > 0) {
    throw new Error(`MJML compilation errors: ${JSON.stringify(errors)}`);
  }

  return html;
}
```

## Unsubscribe Management

### Database Schema

```sql
CREATE TABLE email_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed BOOLEAN DEFAULT TRUE,
    subscription_types JSONB DEFAULT '["marketing", "newsletter"]'::jsonb,
    subscribed_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    unsubscribe_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX idx_email_subscriptions_status ON email_subscriptions(subscribed);
```

### Unsubscribe Implementation

```typescript
// One-click unsubscribe link
function generateUnsubscribeLink(email: string, campaignId: string): string {
  const token = generateSecureToken({ email, campaignId });
  return `https://your-instance.gimbal.app/unsubscribe?token=${token}`;
}

// Unsubscribe handler
async function handleUnsubscribe(token: string, reason?: string) {
  const { email } = verifyToken(token);

  await supabase
    .from('email_subscriptions')
    .update({
      subscribed: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason
    })
    .eq('email', email);

  // Send confirmation email
  await sendEmail({
    to: email,
    subject: 'You have been unsubscribed',
    html: 'You have been successfully unsubscribed from our mailing list.'
  });
}

// Preference center
async function updateEmailPreferences(
  email: string,
  preferences: {
    marketing?: boolean;
    newsletter?: boolean;
    transactional?: boolean;
  }
) {
  const subscriptionTypes: string[] = [];

  if (preferences.marketing) subscriptionTypes.push('marketing');
  if (preferences.newsletter) subscriptionTypes.push('newsletter');
  if (preferences.transactional) subscriptionTypes.push('transactional');

  await supabase
    .from('email_subscriptions')
    .upsert({
      email,
      subscribed: subscriptionTypes.length > 0,
      subscription_types: subscriptionTypes
    });
}
```

### Add Unsubscribe to Emails

```typescript
function addUnsubscribeFooter(html: string, email: string, campaignId: string): string {
  const unsubscribeLink = generateUnsubscribeLink(email, campaignId);
  const preferencesLink = `https://your-instance.gimbal.app/preferences?email=${encodeURIComponent(email)}`;

  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
      <p>
        <a href="${unsubscribeLink}" style="color: #666;">Unsubscribe</a> |
        <a href="${preferencesLink}" style="color: #666;">Update Preferences</a>
      </p>
      <p>Company Name | 123 Main St, City, State 12345</p>
    </div>
  `;

  // Insert before closing body tag
  return html.replace('</body>', `${footer}</body>`);
}
```

## Deliverability Best Practices

### SPF, DKIM, DMARC Setup

```bash
# SPF Record (TXT)
v=spf1 include:sendgrid.net ~all

# DKIM Records (Added by SendGrid automatically)
s1._domainkey.yourdomain.com → CNAME
s2._domainkey.yourdomain.com → CNAME

# DMARC Record (TXT)
_dmarc.yourdomain.com
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; fo=1
```

### Content Best Practices

```typescript
const deliverabilityChecks = {
  // Spam score checks
  checkSpamTriggers(html: string, subject: string): string[] {
    const triggers: string[] = [];
    const content = `${subject} ${stripHTML(html)}`.toLowerCase();

    const spamWords = [
      'free money', 'act now', 'click here', 'guarantee',
      'no risk', 'winner', '100% free', 'credit card'
    ];

    spamWords.forEach(word => {
      if (content.includes(word)) {
        triggers.push(word);
      }
    });

    return triggers;
  },

  // Image/text ratio
  checkImageTextRatio(html: string): number {
    const imageCount = (html.match(/<img/g) || []).length;
    const textLength = stripHTML(html).length;

    return imageCount / (textLength / 100); // images per 100 chars
  },

  // Link quality
  checkLinks(html: string): { broken: string[]; suspicious: string[] } {
    const links = extractLinks(html);

    return {
      broken: links.filter(link => !isValidURL(link)),
      suspicious: links.filter(link => isShortenedURL(link))
    };
  },

  // Subject line
  checkSubject(subject: string): { length: boolean; caps: boolean } {
    return {
      length: subject.length >= 30 && subject.length <= 50,
      caps: !(subject === subject.toUpperCase())
    };
  }
};
```

## Tracking & Analytics

### Webhook Configuration

```typescript
// supabase/functions/sendgrid-webhook/index.ts
serve(async (req) => {
  const events = await req.json();

  for (const event of events) {
    switch (event.event) {
      case 'delivered':
        await updateEmailStatus(event.sg_message_id, 'delivered');
        break;

      case 'open':
        await trackEmailOpen(event.sg_message_id, event.timestamp);
        break;

      case 'click':
        await trackEmailClick(event.sg_message_id, event.url, event.timestamp);
        break;

      case 'bounce':
        await handleBounce(event);
        break;

      case 'spam_report':
        await handleSpamReport(event);
        break;

      case 'unsubscribe':
        await handleUnsubscribe(event.email);
        break;
    }
  }

  return new Response('OK', { status: 200 });
});
```

### Analytics Schema

```sql
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    message_id VARCHAR(255) UNIQUE,
    status VARCHAR(50), -- sent, delivered, bounced, opened, clicked
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_type VARCHAR(50), -- hard, soft
    bounce_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES email_messages(id),
    url TEXT NOT NULL,
    clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_messages_campaign ON email_messages(campaign_id);
CREATE INDEX idx_email_messages_status ON email_messages(status);
CREATE INDEX idx_email_messages_message_id ON email_messages(message_id);
```

### Analytics Dashboard

```typescript
interface EmailAnalytics {
  campaignId: string;
  metrics: {
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
  };
  topLinks: Array<{ url: string; clicks: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  geographicBreakdown: Record<string, number>;
}

async function getEmailAnalytics(campaignId: string): Promise<EmailAnalytics> {
  const { data: messages } = await supabase
    .from('email_messages')
    .select('*')
    .eq('campaign_id', campaignId);

  const sent = messages.length;
  const delivered = messages.filter(m => m.status === 'delivered').length;
  const opened = messages.filter(m => m.opened_at).length;
  const clicked = messages.filter(m => m.clicked_at).length;

  return {
    campaignId,
    metrics: {
      sent,
      delivered,
      bounced: messages.filter(m => m.bounced_at).length,
      opened,
      clicked,
      unsubscribed: messages.filter(m => m.status === 'unsubscribed').length,
      deliveryRate: delivered / sent,
      openRate: opened / delivered,
      clickRate: clicked / delivered,
      clickToOpenRate: clicked / opened
    },
    topLinks: await getTopClickedLinks(campaignId),
    deviceBreakdown: await getDeviceBreakdown(campaignId),
    geographicBreakdown: await getGeographicBreakdown(campaignId)
  };
}
```

## Testing

### Email Preview & Testing

```typescript
// Send test email
async function sendTestEmail(
  template: EmailTemplate,
  testEmails: string[],
  variables: Record<string, any>
) {
  const html = compileMJMLTemplate(template.html, variables);

  for (const email of testEmails) {
    await sendEmail({
      to: email,
      subject: `[TEST] ${template.subject}`,
      html: `
        <div style="background: #fff3cd; padding: 10px; margin-bottom: 20px; border: 1px solid #ffc107;">
          <strong>This is a test email</strong>
        </div>
        ${html}
      `
    });
  }
}

// Inbox testing
async function testInboxRendering(html: string): Promise<InboxTestResults> {
  // Use service like Litmus or Email on Acid
  // Or manual testing across email clients
  return {
    gmail: { rendered: true, issues: [] },
    outlook: { rendered: true, issues: ['Image blocked'] },
    appleMail: { rendered: true, issues: [] },
    yahooMail: { rendered: true, issues: [] }
  };
}
```

### Spam Testing

```typescript
// Use SpamAssassin or similar
async function checkSpamScore(html: string, subject: string): Promise<number> {
  // Simplified spam score calculation
  let score = 0;

  const triggers = deliverabilityChecks.checkSpamTriggers(html, subject);
  score += triggers.length * 1.5;

  const imageTextRatio = deliverabilityChecks.checkImageTextRatio(html);
  if (imageTextRatio > 0.5) score += 2;

  if (!deliverabilityChecks.checkSubject(subject).length) score += 1;
  if (!deliverabilityChecks.checkSubject(subject).caps) score += 2;

  return score; // < 5 is good, > 10 is likely spam
}
```

## Compliance

### CAN-SPAM Act

```typescript
const canSpamRequirements = {
  // 1. Clear identification as advertisement (if applicable)
  isAdvertisement: (subject: string) => subject.includes('[AD]'),

  // 2. Valid physical address
  hasPhysicalAddress: (html: string) => {
    const addressPattern = /\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s+\d{5}/;
    return addressPattern.test(html);
  },

  // 3. Clear opt-out mechanism
  hasUnsubscribeLink: (html: string) => {
    return html.toLowerCase().includes('unsubscribe');
  },

  // 4. Honor opt-outs within 10 days
  processOptOutsWithin10Days: true,

  // 5. Monitor third-party senders
  monitorThirdParties: true
};

function ensureCANSPAMCompliance(html: string): string {
  let compliantHTML = html;

  // Add physical address if missing
  if (!canSpamRequirements.hasPhysicalAddress(html)) {
    compliantHTML += `
      <p style="font-size: 12px; color: #666;">
        Company Name<br>
        123 Main Street<br>
        City, ST 12345
      </p>
    `;
  }

  return compliantHTML;
}
```

### GDPR

```typescript
// Right to access
async function exportEmailData(email: string) {
  const subscriptions = await supabase
    .from('email_subscriptions')
    .select('*')
    .eq('email', email);

  const messages = await supabase
    .from('email_messages')
    .select('*')
    .eq('recipient', email);

  return {
    subscriptions: subscriptions.data,
    messages: messages.data,
    exportedAt: new Date()
  };
}

// Right to erasure
async function deleteEmailData(email: string) {
  // Anonymize messages (keep for analytics)
  await supabase
    .from('email_messages')
    .update({ recipient: 'REDACTED' })
    .eq('recipient', email);

  // Delete subscription
  await supabase
    .from('email_subscriptions')
    .delete()
    .eq('email', email);
}
```

## Best Practices

1. **Always get explicit consent** before adding to mailing list
2. **Double opt-in** for new subscribers (recommended)
3. **Segment your audience** for targeted campaigns
4. **Personalize content** beyond just first name
5. **A/B test** subject lines and content
6. **Monitor deliverability** metrics closely
7. **Clean your list** regularly (remove bounces)
8. **Respect unsubscribes** immediately
9. **Test across email clients** before sending
10. **Include plain text** version of emails
11. **Optimize for mobile** (60%+ opens on mobile)
12. **Send from consistent** sender name/address
13. **Avoid spam triggers** in subject and content
14. **Maintain engagement** - don't email too frequently
15. **Keep audit logs** for compliance
