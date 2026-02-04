---
description: Service layer development rules
globs: src/services/**/*
---

# Service Layer Rules

## Naming Convention
- File: `camelCaseService.ts` (e.g., `smsService.ts`)
- Functions: `verbNoun` pattern (e.g., `sendMessage`, `getCampaigns`)

## Structure Template
```tsx
import { supabase } from '@/lib/supabase';
import type { Campaign, CreateCampaignInput } from '@/types';

/**
 * Campaign service for CRUD operations
 */
export const campaignService = {
  async getAll(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new ServiceError('Failed to fetch campaigns', error);
    return data;
  },

  async create(input: CreateCampaignInput): Promise<Campaign> {
    // Implementation
  },
};
```

## Error Handling
```tsx
import { AppError } from '@/utils/errors';

class ServiceError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'SERVICE_ERROR', 500);
    this.cause = cause;
  }
}

// Always wrap Supabase errors
const { data, error } = await supabase.from('table').select();
if (error) {
  throw new ServiceError(`Failed to fetch: ${error.message}`, error);
}
```

## Retry Logic
For external services (Twilio, SendGrid):
```tsx
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, attempt)); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

## API Service Structure
```
src/services/
├── api/
│   ├── supabaseClient.ts    # Base client
│   ├── queryKeys.ts         # React Query keys
│   └── endpoints.ts         # Endpoint constants
├── campaigns/
│   ├── campaignService.ts   # Campaign CRUD
│   ├── smsService.ts        # SMS via Twilio
│   └── emailService.ts      # Email via SendGrid
└── analytics/
    └── analyticsService.ts  # Dashboard data
```

## SMS Service Requirements
- Validate phone number format before sending
- Check TCPA consent before any message
- Respect quiet hours (8 AM - 9 PM recipient timezone)
- Rate limit: 10 messages/second
- Log all send attempts to audit

## Email Service Requirements
- Validate email format
- Check unsubscribe status before sending
- Include physical address (CAN-SPAM)
- Handle bounces and complaints
- Track opens/clicks

## Audit Logging
All service operations must log to audit:
```tsx
import { auditLogger } from '@/utils/auditLog';

await auditLogger.log('CAMPAIGN_CREATED', {
  campaignId: campaign.id,
  type: campaign.type,
});
```
