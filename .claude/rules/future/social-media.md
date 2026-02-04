# Social Media Integration Rules (Future Feature)

> **Note**: These rules apply to Phase B development (post-MVP). The MVP focuses on Data Import and Campaign Management.

---

## Supported Platforms

| Platform | API | OAuth Version | Key Features |
|----------|-----|---------------|--------------|
| Facebook | Graph API | OAuth 2.0 | Pages, Posts, Insights |
| Instagram | Graph API (via Facebook) | OAuth 2.0 | Business accounts, Media |
| LinkedIn | Marketing API | OAuth 2.0 | Company pages, Posts |
| X/Twitter | V2 API | OAuth 2.0 | Tweets, Media |

## Database Tables

- `social_accounts` - Connected platform accounts
- `social_posts` - Published and scheduled posts
- `social_engagement` - Engagement metrics

## File Structure
```
src/
├── components/social/
│   ├── SocialAccountList.tsx
│   ├── SocialAccountCard.tsx
│   ├── SocialAccountConnect.tsx
│   ├── SocialPostComposer.tsx
│   ├── PlatformPreview.tsx
│   ├── MediaUploader.tsx
│   ├── SocialCalendar.tsx
│   └── EngagementMetrics.tsx
├── services/social/
│   ├── socialAccountService.ts
│   ├── socialPostService.ts
│   ├── socialPublisher.ts
│   ├── engagementService.ts
│   └── platformValidators.ts
└── stores/
    └── socialStore.ts
```

## OAuth Configuration

### Facebook/Instagram
```typescript
const FACEBOOK_CONFIG = {
  clientId: process.env.FACEBOOK_APP_ID,
  redirectUri: `${window.location.origin}/oauth/facebook/callback`,
  scopes: [
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish'
  ]
};
```

### LinkedIn
```typescript
const LINKEDIN_CONFIG = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  redirectUri: `${window.location.origin}/oauth/linkedin/callback`,
  scopes: ['w_member_social', 'r_organization_social']
};
```

### Twitter/X
```typescript
const TWITTER_CONFIG = {
  clientId: process.env.TWITTER_CLIENT_ID,
  redirectUri: `${window.location.origin}/oauth/twitter/callback`,
  scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
};
```

## Token Management

### Storage
- Store tokens encrypted in `social_accounts.access_token`
- Never expose tokens to client-side code
- Track expiration in `social_accounts.token_expires_at`

### Refresh Pattern
```typescript
async function ensureValidToken(accountId: string): Promise<string> {
  const account = await getSocialAccount(accountId);

  if (isTokenExpired(account.token_expires_at)) {
    const newTokens = await refreshToken(account);
    await updateSocialAccount(accountId, newTokens);
    return newTokens.access_token;
  }

  return account.access_token;
}
```

### Automatic Refresh
- Schedule token refresh 24 hours before expiration
- Use Supabase pg_cron for scheduling
- Log token refresh events to audit log

## Content Limits

| Platform | Text Limit | Image Size | Video Size | Aspect Ratios |
|----------|------------|------------|------------|---------------|
| Facebook | 63,206 | 30MB | 4GB | Any |
| Instagram | 2,200 | 30MB | 100MB | 1:1, 4:5, 1.91:1 |
| LinkedIn | 3,000 | 8MB | 200MB | Any |
| Twitter | 280 | 5MB | 512MB | 16:9, 1:1 |

### Validation Pattern
```typescript
function validatePostContent(platform: Platform, content: PostContent): ValidationResult {
  const limits = PLATFORM_LIMITS[platform];
  const errors: string[] = [];

  if (content.text.length > limits.textLimit) {
    errors.push(`Text exceeds ${limits.textLimit} character limit`);
  }

  for (const media of content.media) {
    if (media.size > limits.mediaSize) {
      errors.push(`Media file exceeds ${limits.mediaSize / 1024 / 1024}MB limit`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

## Post States

```
draft → scheduled → publishing → published
                 ↘ failed
```

- `draft` - Created but not scheduled
- `scheduled` - Queued for future publishing
- `publishing` - Currently being published
- `published` - Successfully posted
- `failed` - Publishing failed (with error message)

## Multi-Platform Posting

### Composer Pattern
```typescript
interface MultiPlatformPost {
  content: {
    text: string;
    media?: MediaFile[];
    link?: string;
  };
  platforms: {
    platform: Platform;
    accountId: string;
    customText?: string;  // Platform-specific override
    scheduledAt?: Date;
  }[];
}
```

### Publishing Flow
1. Validate content for all selected platforms
2. Upload media to each platform's CDN
3. Create posts in parallel (or serial if rate limited)
4. Track results and update status

## Engagement Metrics

### Tracked Metrics
| Metric | Description |
|--------|-------------|
| likes | Total likes/reactions |
| comments | Total comments |
| shares | Total shares/retweets |
| clicks | Link clicks |
| impressions | Total views |
| reach | Unique viewers |
| engagement_rate | (likes + comments + shares) / reach |

### Fetch Schedule
- Pull metrics every 6 hours for posts < 7 days old
- Pull metrics daily for posts 7-30 days old
- Stop fetching after 30 days

## Error Handling

### Common Errors
| Error | Cause | Resolution |
|-------|-------|------------|
| `OAuthException` | Token expired | Refresh token or re-authenticate |
| `RateLimitExceeded` | Too many requests | Implement backoff, queue requests |
| `MediaTypeInvalid` | Unsupported format | Convert or reject media |
| `ContentPolicyViolation` | Platform policy | Notify user, don't retry |

### Retry Logic
```typescript
async function publishWithRetry(post: SocialPost, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await publishPost(post);
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Audit Logging

Log all social media operations:
```typescript
await auditLogger.log('SOCIAL_ACCOUNT_CONNECTED', { platform, accountName });
await auditLogger.log('SOCIAL_POST_PUBLISHED', { postId, platform, platformPostId });
await auditLogger.log('SOCIAL_POST_FAILED', { postId, platform, error });
await auditLogger.log('SOCIAL_ACCOUNT_DISCONNECTED', { platform, accountId });
```

## Security

### Token Storage
- Encrypt tokens using pgcrypto or Supabase Vault
- Never log access tokens
- Rotate encryption keys annually

### OAuth State
- Use cryptographically random state parameter
- Verify state on callback to prevent CSRF
- State should expire after 10 minutes

### Permissions
- Request only necessary permissions
- Re-request if permissions are revoked
- Show users what permissions are granted

## Testing

### Unit Tests
```typescript
describe('socialPublisher', () => {
  it('should publish to Facebook', async () => {
    // Mock Facebook API
  });

  it('should handle rate limiting', async () => {
    // Test backoff behavior
  });
});
```

### Integration Tests
- Use sandbox/test accounts where available
- Mock API responses for CI/CD
- Test OAuth flows with mock tokens

## Platform-Specific Notes

### Facebook
- Requires app review for `pages_manage_posts`
- Business verification required for some permissions
- Page access tokens don't expire (but can be invalidated)

### Instagram
- Must be a Business or Creator account
- Media must be uploaded to Facebook CDN first
- Carousel posts require specific API flow

### LinkedIn
- Marketing Developer Platform access required
- Company page posts need admin permissions
- Limited API rate limits

### Twitter
- Elevated access needed for higher rate limits
- V2 API is required (V1 deprecated)
- Media upload is a separate endpoint
