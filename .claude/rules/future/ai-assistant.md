# AI Assistant Rules (Future Feature)

> **Note**: These rules apply to Phase C development (post-MVP). The MVP focuses on Data Import and Campaign Management.

---

## BYOK (Bring Your Own Key) Model

Users provide their own AI API keys. Project Gimbal does NOT provide AI services directly.

## Supported Providers

| Provider | API Type | Models | Endpoint |
|----------|----------|--------|----------|
| OpenAI | Chat Completions | GPT-4, GPT-4 Turbo, GPT-3.5 Turbo | api.openai.com |
| Anthropic | Messages | Claude 3 Opus, Sonnet, Haiku | api.anthropic.com |
| Ollama | Chat | Llama 3, Mistral, Mixtral | localhost:11434 |
| Azure OpenAI | Chat Completions | Same as OpenAI | *.openai.azure.com |
| Custom | OpenAI-compatible | Any | User-provided |

## Database Tables

- `ai_providers` - User's AI provider configurations
- `ai_conversations` - Conversation threads
- `ai_messages` - Individual messages
- `ai_token_usage` - Daily usage tracking
- `ai_suggestions` - Actionable AI outputs
- `ai_usage_limits` - Role-based limits

## File Structure
```
src/
├── components/ai/
│   ├── AIProviderSetup.tsx
│   ├── AIProviderList.tsx
│   ├── AIChat.tsx
│   ├── AIChatMessage.tsx
│   ├── AIContextPanel.tsx
│   ├── AISuggestionCard.tsx
│   ├── AIApplyButton.tsx
│   ├── AITokenUsage.tsx
│   └── AIConversationHistory.tsx
├── services/ai/
│   ├── aiProviderService.ts
│   ├── aiChatService.ts
│   ├── aiContextService.ts
│   ├── aiSuggestionService.ts
│   ├── aiTokenService.ts
│   └── providers/
│       ├── types.ts
│       ├── openaiProvider.ts
│       ├── anthropicProvider.ts
│       ├── ollamaProvider.ts
│       └── customProvider.ts
└── stores/
    └── aiStore.ts
```

## Provider Interface

```typescript
interface AIProvider {
  // Send chat message and get response
  chat(messages: Message[], options: ChatOptions): Promise<ChatResponse>;

  // Validate API key is working
  validateKey(): Promise<boolean>;

  // Get available models for this provider
  getModels(): Promise<string[]>;

  // Estimate cost based on token counts
  estimateCost(inputTokens: number, outputTokens: number): number;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatOptions {
  model: string;
  temperature?: number;    // 0-2, default 0.7
  maxTokens?: number;      // Max response tokens
  systemPrompt?: string;   // Prepended system message
}

interface ChatResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
}
```

## Security Requirements

### API Key Storage
- Encrypt API keys at rest using pgcrypto
- Never expose keys to client-side code
- Proxy all AI requests through Edge Functions

### Key Validation
```typescript
async function validateAndSaveProvider(config: ProviderConfig) {
  // Validate key works before saving
  const provider = createProvider(config);
  const isValid = await provider.validateKey();

  if (!isValid) {
    throw new Error('Invalid API key');
  }

  // Encrypt and save
  await saveProvider(config);
}
```

### Request Proxying
All AI requests go through Supabase Edge Functions:
```typescript
// Client calls Edge Function
const response = await supabase.functions.invoke('ai-chat', {
  body: { conversationId, message }
});

// Edge Function retrieves encrypted key and calls AI API
async function handleAIChat(req: Request) {
  const { conversationId, message } = await req.json();
  const provider = await getProviderWithDecryptedKey(conversationId);
  const response = await provider.chat([...messages, message]);
  await trackTokenUsage(response);
  return response;
}
```

## Token Usage Tracking

### Usage Table
Track daily usage per user per provider:
```typescript
interface TokenUsage {
  userId: string;
  providerId: string;
  date: string;           // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  estimatedCost: number;  // USD
}
```

### Tracking Pattern
```typescript
async function trackTokenUsage(
  userId: string,
  providerId: string,
  inputTokens: number,
  outputTokens: number
) {
  const today = new Date().toISOString().split('T')[0];
  const cost = estimateCost(providerId, inputTokens, outputTokens);

  await supabase.rpc('increment_token_usage', {
    p_user_id: userId,
    p_provider_id: providerId,
    p_date: today,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_cost: cost
  });
}
```

### Usage Limits
Role-based daily/monthly limits:
| Role | Daily Tokens | Monthly Tokens | Daily Requests |
|------|--------------|----------------|----------------|
| Viewer | 0 | 0 | 0 |
| User | 10,000 | 100,000 | 50 |
| Support | 25,000 | 250,000 | 100 |
| Manager | 50,000 | 500,000 | 200 |
| Admin | 100,000 | 1,000,000 | 500 |
| Owner | Unlimited | Unlimited | Unlimited |

### Limit Enforcement
```typescript
async function checkUsageLimits(userId: string): Promise<boolean> {
  const { dailyUsage, monthlyUsage } = await getUserUsage(userId);
  const limits = await getUserLimits(userId);

  if (limits.dailyTokenLimit && dailyUsage >= limits.dailyTokenLimit) {
    throw new Error('Daily token limit exceeded');
  }

  if (limits.monthlyTokenLimit && monthlyUsage >= limits.monthlyTokenLimit) {
    throw new Error('Monthly token limit exceeded');
  }

  return true;
}
```

## Context Types

### Campaign Assistant
```typescript
const campaignContext = {
  type: 'campaign',
  data: {
    campaign: currentCampaign,
    audience: segmentData,
    pastPerformance: historicalMetrics
  }
};
```

### Analytics Insights
```typescript
const analyticsContext = {
  type: 'analytics',
  data: {
    metrics: dashboardMetrics,
    trends: trendData,
    dateRange: selectedDateRange
  }
};
```

### Strategy Generator
```typescript
const strategyContext = {
  type: 'strategy',
  data: {
    goals: businessGoals,
    history: campaignHistory,
    channels: availableChannels
  }
};
```

## Suggestion Output Format

```typescript
interface AISuggestion {
  type: SuggestionType;
  title: string;
  content: SuggestionContent;
  reasoning: string;
  confidence?: number;  // 0-1
}

type SuggestionType =
  | 'campaign'
  | 'email_content'
  | 'sms_content'
  | 'social_post'
  | 'audience_segment'
  | 'strategy'
  | 'subject_line'
  | 'hashtags';

// Content varies by type
interface EmailContentSuggestion {
  subject: string;
  preheader?: string;
  body: string;
  cta_text?: string;
}

interface SMSContentSuggestion {
  message: string;  // Max 160 chars
}

interface SocialPostSuggestion {
  text: string;
  hashtags: string[];
  platform: string;
}

interface StrategySuggestion {
  steps: Array<{
    action: string;
    timeline: string;
    channel: string;
    rationale: string;
  }>;
}
```

## One-Click Apply

Suggestions can be applied directly to modules:
```typescript
async function applySuggestion(suggestionId: string) {
  const suggestion = await getSuggestion(suggestionId);

  switch (suggestion.type) {
    case 'email_content':
      await applyToEmailTemplate(suggestion.content);
      break;
    case 'sms_content':
      await applyToSMSTemplate(suggestion.content);
      break;
    case 'social_post':
      await applyToSocialComposer(suggestion.content);
      break;
    // ... other types
  }

  await markSuggestionApplied(suggestionId);
  await auditLogger.log('AI_SUGGESTION_APPLIED', { suggestionId });
}
```

## GDPR Compliance

### Data Export
```typescript
async function exportAIData(userId: string): Promise<AIExport> {
  const conversations = await getConversations(userId);
  const messages = await getMessages(userId);
  const suggestions = await getSuggestions(userId);
  const usage = await getUsageHistory(userId);

  return { conversations, messages, suggestions, usage };
}
```

### Data Deletion
```typescript
async function deleteAIData(userId: string): Promise<void> {
  await supabase.from('ai_suggestions').delete().eq('user_id', userId);
  await supabase.from('ai_messages').delete().eq('user_id', userId);
  await supabase.from('ai_conversations').delete().eq('user_id', userId);
  await supabase.from('ai_token_usage').delete().eq('user_id', userId);
  await supabase.from('ai_providers').delete().eq('user_id', userId);

  await auditLogger.log('AI_DATA_DELETED', { userId });
}
```

## Audit Logging

Log all AI operations:
```typescript
await auditLogger.log('AI_PROVIDER_ADDED', { provider, model });
await auditLogger.log('AI_CONVERSATION_STARTED', { conversationId, contextType });
await auditLogger.log('AI_MESSAGE_SENT', { conversationId, tokensUsed });
await auditLogger.log('AI_SUGGESTION_GENERATED', { suggestionId, type });
await auditLogger.log('AI_SUGGESTION_APPLIED', { suggestionId, appliedTo });
await auditLogger.log('AI_DATA_EXPORTED', { userId });
await auditLogger.log('AI_DATA_DELETED', { userId });
```

## Error Handling

### Provider Errors
| Error | Cause | Action |
|-------|-------|--------|
| `invalid_api_key` | Bad or revoked key | Prompt re-configuration |
| `rate_limit_exceeded` | Too many requests | Queue and retry |
| `context_length_exceeded` | Input too long | Truncate context |
| `content_filter` | Content blocked | Notify user |
| `service_unavailable` | Provider down | Show error, don't retry |

### Graceful Degradation
```typescript
async function chatWithFallback(messages: Message[]) {
  try {
    return await primaryProvider.chat(messages);
  } catch (error) {
    if (error.code === 'service_unavailable' && fallbackProvider) {
      return await fallbackProvider.chat(messages);
    }
    throw error;
  }
}
```

## Testing

### Unit Tests
```typescript
describe('aiProviderService', () => {
  it('should validate API key', async () => {
    // Mock provider validation
  });

  it('should track token usage', async () => {
    // Test usage tracking
  });

  it('should enforce usage limits', async () => {
    // Test limit enforcement
  });
});
```

### Integration Tests
- Use test API keys with low quotas
- Mock AI responses in CI/CD
- Test error handling for each provider
