# AI Assistant Module (Future Feature)

> **Note**: This document describes Phase C functionality (post-MVP). The MVP focuses on Data Import and Campaign Management. See [10-future/README.md](./README.md) for implementation timeline.

---

# AI Assistant Module

## Overview

The AI Assistant Module provides intelligent campaign suggestions, content generation, and analytics insights using a BYOK (Bring Your Own Key) model. Users connect their own AI provider (OpenAI, Anthropic, Ollama, etc.) and the system tracks token usage per user for accountability.

## Key Principles

1. **BYOK Model** - Users provide their own AI API keys
2. **Data Isolation** - AI conversations isolated per customer
3. **Token Tracking** - Usage tracked per user for accountability
4. **One-Click Apply** - Suggestions directly usable in modules
5. **Privacy First** - No customer data used for training

## Supported Providers

| Provider | API Type | Models | Endpoint |
|----------|----------|--------|----------|
| OpenAI | Chat Completions | GPT-4, GPT-4 Turbo, GPT-3.5 | api.openai.com |
| Anthropic | Messages | Claude 3 Opus, Sonnet, Haiku | api.anthropic.com |
| Ollama | Chat | Llama 3, Mistral, Mixtral | localhost:11434 |
| Azure OpenAI | Chat Completions | Same as OpenAI | *.openai.azure.com |
| Custom | OpenAI-compatible | Any | User-provided |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AI Chat UI     │────▶│  Edge Function   │────▶│  AI Provider    │
│  (Frontend)     │     │  (ai-chat)       │     │  (OpenAI, etc)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  ai_conversations│
                        │  ai_messages     │
                        │  ai_token_usage  │
                        └──────────────────┘
```

## Database Schema

### ai_providers
Stores user's AI provider configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner reference |
| name | VARCHAR(100) | Display name |
| provider_type | VARCHAR(50) | openai, anthropic, ollama, etc. |
| api_endpoint | TEXT | Custom endpoint URL |
| api_key | TEXT | Encrypted API key |
| model_name | VARCHAR(100) | Model identifier |
| config | JSONB | Model parameters |
| is_default | BOOLEAN | Default provider flag |
| is_active | BOOLEAN | Enabled status |

### ai_conversations
Stores conversation threads.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner reference |
| ai_provider_id | UUID | Provider reference |
| title | VARCHAR(255) | Conversation title |
| context_type | VARCHAR(50) | campaign, analytics, strategy, content |
| context_data | JSONB | Relevant context snapshot |
| is_archived | BOOLEAN | Archive status |

### ai_messages
Stores individual messages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Conversation reference |
| role | VARCHAR(20) | user, assistant, system |
| content | TEXT | Message content |
| tokens_input | INTEGER | Input tokens used |
| tokens_output | INTEGER | Output tokens used |
| model_used | VARCHAR(100) | Model that generated response |
| latency_ms | INTEGER | Response time |

### ai_token_usage
Tracks daily usage per user.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User reference |
| ai_provider_id | UUID | Provider reference |
| date | DATE | Usage date |
| input_tokens | INTEGER | Total input tokens |
| output_tokens | INTEGER | Total output tokens |
| request_count | INTEGER | Number of requests |
| estimated_cost | NUMERIC | Estimated cost in USD |

### ai_suggestions
Stores actionable AI outputs.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Conversation reference |
| user_id | UUID | User reference |
| suggestion_type | VARCHAR(50) | Type of suggestion |
| title | VARCHAR(255) | Suggestion title |
| content | JSONB | Structured suggestion data |
| reasoning | TEXT | AI's explanation |
| confidence | NUMERIC | Confidence score (0-1) |
| status | VARCHAR(50) | pending, accepted, rejected, applied |
| applied_to_id | UUID | Target entity reference |

## User Interface

### Provider Setup
```
┌─────────────────────────────────────────────────────────┐
│  AI Provider Setup                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Provider: [OpenAI           ▼]                        │
│                                                         │
│  API Key:  [sk-...                                   ]  │
│            Your key is encrypted and never shared       │
│                                                         │
│  Model:    [GPT-4 Turbo      ▼]                        │
│                                                         │
│  Advanced Settings                                      │
│  ├─ Temperature: [0.7        ]                         │
│  ├─ Max Tokens:  [2000       ]                         │
│  └─ Custom Endpoint: [                              ]   │
│                                                         │
│                    [Test Connection]  [Save Provider]   │
└─────────────────────────────────────────────────────────┘
```

### AI Chat Interface
```
┌─────────────────────────────────────────────────────────┐
│  AI Assistant                    Context: Analytics     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 Based on your analytics, I notice that:      │   │
│  │                                                  │   │
│  │ • Email open rates have increased 15% this week │   │
│  │ • SMS engagement is highest on Tuesdays        │   │
│  │ • Your top audience segment is "Active Buyers" │   │
│  │                                                  │   │
│  │ I recommend running a targeted SMS campaign     │   │
│  │ to Active Buyers on Tuesday afternoon.          │   │
│  │                                                  │   │
│  │ ┌────────────────────────────────────────────┐ │   │
│  │ │ 📋 Suggested: SMS Campaign                  │ │   │
│  │ │    Target: Active Buyers                    │ │   │
│  │ │    Time: Tuesday 2pm                        │ │   │
│  │ │    [View Details] [Apply to Campaign]       │ │   │
│  │ └────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Type your message...                            │   │
│  │                                         [Send]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Tokens used: 1,234 / 10,000 daily limit               │
└─────────────────────────────────────────────────────────┘
```

### Token Usage Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  AI Usage Dashboard                          This Month │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Total Tokens: 245,678 / 1,000,000                     │
│  [████████░░░░░░░░░░░░░░░░░░░░░░] 24.6%               │
│                                                         │
│  Estimated Cost: $12.45                                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Daily Usage                                      │   │
│  │ 40k │    ▄▄                                      │   │
│  │ 30k │ ▄▄ ██    ▄▄                               │   │
│  │ 20k │ ██ ██ ▄▄ ██ ▄▄ ▄▄                        │   │
│  │ 10k │ ██ ██ ██ ██ ██ ██ ▄▄                     │   │
│  │     └──────────────────────────                  │   │
│  │       Mon Tue Wed Thu Fri Sat Sun               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Top Users:                                             │
│  1. john@example.com - 85,432 tokens                   │
│  2. jane@example.com - 62,156 tokens                   │
│  3. bob@example.com  - 45,890 tokens                   │
└─────────────────────────────────────────────────────────┘
```

## AI Capabilities

### Campaign Content Generation
- Subject line variations
- Email body copy
- SMS messages (within character limits)
- Social media posts
- Call-to-action suggestions

### Analytics Insights
- Performance analysis
- Trend identification
- Anomaly detection
- Optimization recommendations
- Audience insights

### Strategy Generation
- Multi-channel campaign strategies
- Timing recommendations
- Audience targeting suggestions
- Budget allocation advice
- A/B test ideas

### Audience Suggestions
- Segment recommendations
- Lookalike audience criteria
- Re-engagement strategies
- Churn prediction insights

## Suggestion Types

### Email Content
```json
{
  "type": "email_content",
  "title": "Product Launch Email",
  "content": {
    "subject": "🚀 It's Here: Introducing Our New Product",
    "preheader": "Be the first to try our latest innovation",
    "body": "Dear {{first_name}},\n\nWe're excited to announce...",
    "cta_text": "Shop Now"
  },
  "reasoning": "Based on your audience's engagement with launch emails..."
}
```

### SMS Content
```json
{
  "type": "sms_content",
  "title": "Flash Sale SMS",
  "content": {
    "message": "🔥 FLASH SALE! 30% off everything today only. Shop now: example.com/sale Reply STOP to opt out"
  },
  "reasoning": "Short, urgent messaging performs well with your audience..."
}
```

### Social Post
```json
{
  "type": "social_post",
  "title": "Product Announcement",
  "content": {
    "text": "Big news! We just launched something amazing...",
    "hashtags": ["#newproduct", "#launch", "#innovation"],
    "platform": "instagram"
  },
  "reasoning": "Instagram performs best for your product announcements..."
}
```

### Strategy
```json
{
  "type": "strategy",
  "title": "Q1 Re-engagement Campaign",
  "content": {
    "steps": [
      {
        "action": "Send win-back email series",
        "timeline": "Week 1",
        "channel": "email",
        "rationale": "Re-engage dormant subscribers with compelling offers"
      },
      {
        "action": "Follow up with SMS to non-openers",
        "timeline": "Week 2",
        "channel": "sms",
        "rationale": "SMS has 98% open rate, ideal for re-engagement"
      }
    ]
  },
  "reasoning": "Historical data shows multi-channel approach increases..."
}
```

## Token Usage Limits

### Role-Based Limits
| Role | Daily Tokens | Monthly Tokens |
|------|--------------|----------------|
| Viewer | 0 | 0 |
| User | 10,000 | 100,000 |
| Support | 25,000 | 250,000 |
| Manager | 50,000 | 500,000 |
| Admin | 100,000 | 1,000,000 |
| Owner | Unlimited | Unlimited |

### Enforcement
- Check limits before each request
- Show remaining quota in UI
- Alert when approaching limit
- Prevent requests when exceeded

## Security

### API Key Storage
- Keys encrypted at rest using pgcrypto
- Keys never exposed to client code
- All AI requests proxied through Edge Functions

### Request Handling
- Validate user has access to context data
- Log all AI interactions for audit
- Rate limit requests per user

## GDPR Compliance

### Data Subject Rights
- **Export**: Download all AI conversations and suggestions
- **Delete**: Permanently delete all AI-related data
- **Portability**: Export in machine-readable format

### Data Handling
- AI data included in standard data exports
- 72-hour deletion upon request
- No cross-customer data sharing
- Clear disclosure of AI data handling

## Best Practices

1. **Start Small** - Begin with content generation, expand to strategy
2. **Provide Context** - Better context leads to better suggestions
3. **Review Suggestions** - Always review before applying
4. **Track Performance** - Monitor which suggestions work best
5. **Respect Limits** - Be mindful of token usage

## Troubleshooting

### Invalid API Key
1. Verify key is correct
2. Check key hasn't been revoked
3. Ensure sufficient API credits
4. Re-enter and save key

### Slow Responses
1. Check provider status
2. Try a faster model (GPT-3.5 vs GPT-4)
3. Reduce context size
4. Check network connectivity

### Poor Suggestions
1. Provide more specific context
2. Rephrase the question
3. Try a different model
4. Include relevant data
