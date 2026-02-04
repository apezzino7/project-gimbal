---
description: Campaign management development rules (SMS/Email)
globs:
  - src/**/campaign*/**/*
  - src/**/sms*/**/*
  - src/**/email*/**/*
---

# Campaign Management Rules

## Campaign States
```
DRAFT → SCHEDULED → SENDING → SENT → FAILED
```

## Message States
```
queued → sent → delivered → opened → clicked → bounced → failed
```

## SMS Campaigns (Twilio)

### Template Syntax
Use `{{variable}}` placeholders:
```
Hi {{firstName}}, your appointment is on {{date}} at {{time}}.
Reply STOP to unsubscribe.
```

### Required Fields
- recipientPhone (E.164 format: +1XXXXXXXXXX)
- messageBody (max 160 chars for single SMS)
- consentTimestamp (TCPA requirement)
- campaignId (for tracking)

### TCPA Compliance Checklist
- [ ] Prior express written consent obtained
- [ ] Consent timestamp recorded
- [ ] Opt-out honored immediately (STOP keyword)
- [ ] Delivery time: 8 AM - 9 PM recipient's local timezone
- [ ] Identification included (company name)
- [ ] Record keeping (4 years minimum)

### Rate Limiting
- Default: 10 messages/second
- Configurable per instance
- Exponential backoff on failures

### Error Handling
```tsx
try {
  await smsService.send(message);
  await auditLogger.log('SMS_SENT', { messageId, recipient });
} catch (error) {
  await auditLogger.log('SMS_FAILED', { messageId, error: error.message });
  // Retry logic or mark as failed
}
```

## Email Campaigns (SendGrid)

### Template Format (MJML)
```html
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hi {{firstName}},</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Required Fields
- recipientEmail (validated format)
- fromEmail (verified domain)
- subject (max 78 chars recommended)
- unsubscribeUrl (CAN-SPAM requirement)
- physicalAddress (CAN-SPAM requirement)

### CAN-SPAM Compliance Checklist
- [ ] Clear identification (From name/email)
- [ ] Honest subject line (no deception)
- [ ] Physical postal address included
- [ ] Clear unsubscribe mechanism
- [ ] Honor unsubscribe within 10 business days
- [ ] Monitor third-party sending

### Domain Authentication
Required for deliverability:
- SPF record configured
- DKIM signing enabled
- DMARC policy set

### Tracking Events
```tsx
interface EmailEvent {
  messageId: string;
  event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  timestamp: Date;
  metadata?: {
    linkUrl?: string;  // For clicks
    bounceType?: 'hard' | 'soft';
    userAgent?: string;
  };
}
```

## Campaign Builder UI

### Form Validation (Zod)
```tsx
const campaignSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['sms', 'email']),
  content: z.string().min(1),
  scheduledAt: z.date().optional(),
  audienceId: z.string().uuid(),
});
```

### Preview Mode
- Show rendered template with sample data
- Display character count for SMS
- Test send to single recipient
- Spam score check for email

### Scheduling
- Support immediate and scheduled sending
- Timezone-aware scheduling
- Quiet hours enforcement (SMS)
- Send time optimization (email)

## Analytics

### SMS Metrics
- Total sent, delivered, failed
- Delivery rate percentage
- Opt-out rate
- Cost per message

### Email Metrics
- Sent, delivered, opened, clicked, bounced
- Open rate, click rate, click-to-open rate
- Unsubscribe rate
- Bounce rate (hard vs soft)

## Audit Requirements
Log all campaign events:
- CAMPAIGN_CREATED
- CAMPAIGN_SCHEDULED
- CAMPAIGN_STARTED
- CAMPAIGN_COMPLETED
- CAMPAIGN_FAILED
- MESSAGE_SENT
- MESSAGE_DELIVERED
- MESSAGE_FAILED
- RECIPIENT_OPTED_OUT
