# Social Media Integration (Future Feature)

> **Note**: This document describes Phase B functionality (post-MVP). The MVP focuses on Data Import and Campaign Management. See [10-future/README.md](./README.md) for implementation timeline.

---

# Social Media Integration

## Overview

The Social Media Integration module enables direct posting, scheduling, and analytics for major social media platforms. Users can manage multiple accounts, compose posts for multiple platforms simultaneously, and track engagement metrics.

## Supported Platforms

| Platform | API | Features |
|----------|-----|----------|
| Facebook | Graph API v18 | Pages, Posts, Insights, Media |
| Instagram | Graph API (via Facebook) | Business accounts, Media, Stories |
| LinkedIn | Marketing API v2 | Company pages, Posts, Analytics |
| X/Twitter | API v2 | Tweets, Media, Engagement |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Social         │────▶│  Edge Functions  │────▶│  Platform APIs  │
│  Composer UI    │     │  (publish-*)     │     │  (FB, IG, etc)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  social_posts    │
                        │  social_accounts │
                        └──────────────────┘
```

## Database Schema

### social_accounts
Stores OAuth credentials and account information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner reference |
| platform | VARCHAR(50) | facebook, instagram, linkedin, twitter |
| account_name | VARCHAR(255) | Display name |
| account_id | VARCHAR(255) | Platform account ID |
| page_id | VARCHAR(255) | Page ID (Facebook/Instagram) |
| access_token | TEXT | Encrypted OAuth token |
| refresh_token | TEXT | Encrypted refresh token |
| token_expires_at | TIMESTAMPTZ | Token expiration |
| permissions | JSONB | Granted permissions |
| is_active | BOOLEAN | Account status |

### social_posts
Stores published and scheduled posts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner reference |
| campaign_id | UUID | Optional campaign reference |
| social_account_id | UUID | Target account |
| content | TEXT | Post text content |
| media_urls | TEXT[] | Media file URLs |
| link_url | TEXT | Optional link |
| hashtags | TEXT[] | Hashtags |
| platform_post_id | VARCHAR(255) | Platform's post ID |
| status | VARCHAR(50) | draft, scheduled, publishing, published, failed |
| scheduled_at | TIMESTAMPTZ | Scheduled publish time |
| published_at | TIMESTAMPTZ | Actual publish time |
| error_message | TEXT | Error details if failed |

### social_engagement
Stores engagement metrics for posts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| post_id | UUID | Post reference |
| likes | INTEGER | Like/reaction count |
| comments | INTEGER | Comment count |
| shares | INTEGER | Share/retweet count |
| clicks | INTEGER | Link clicks |
| impressions | INTEGER | Total views |
| reach | INTEGER | Unique viewers |
| engagement_rate | NUMERIC | Calculated rate |
| fetched_at | TIMESTAMPTZ | Metrics fetch time |

## OAuth Setup

### Facebook/Instagram

**Prerequisites:**
- Facebook Developer App
- Business verification (for some permissions)

**Required Permissions:**
- `pages_manage_posts` - Publish to pages
- `pages_read_engagement` - Read insights
- `instagram_basic` - Instagram connection
- `instagram_content_publish` - Instagram posting

**Setup Flow:**
1. Create Facebook App at developers.facebook.com
2. Add Facebook Login product
3. Configure OAuth redirect URI
4. Request app review for permissions
5. Store App ID and Secret in environment

### LinkedIn

**Prerequisites:**
- LinkedIn Developer App
- Marketing Developer Platform access

**Required Scopes:**
- `w_member_social` - Post as member
- `r_organization_social` - Read company data
- `w_organization_social` - Post as company

### Twitter/X

**Prerequisites:**
- Twitter Developer Account
- API v2 access (free tier available)

**Required Scopes:**
- `tweet.read` - Read tweets
- `tweet.write` - Post tweets
- `users.read` - Read user info
- `offline.access` - Refresh tokens

## Content Limits

| Platform | Text | Image | Video | Link |
|----------|------|-------|-------|------|
| Facebook | 63,206 chars | 30MB, JPG/PNG/GIF | 4GB, up to 240min | Yes |
| Instagram | 2,200 chars | 30MB, JPG/PNG | 100MB, 3-60s | In bio only |
| LinkedIn | 3,000 chars | 8MB, JPG/PNG/GIF | 200MB, up to 10min | Yes |
| Twitter | 280 chars | 5MB, JPG/PNG/GIF | 512MB, up to 140s | Yes |

## User Interface

### Account Management
```
┌─────────────────────────────────────────────────────────┐
│  Connected Accounts                      [+ Connect]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📘 Acme Corp Page                    [Disconnect]│   │
│  │    Facebook Page • Connected                     │   │
│  │    Last posted: 2 days ago                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📸 @acmecorp                        [Disconnect]│   │
│  │    Instagram Business • Connected                │   │
│  │    Last posted: 5 days ago                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔗 Acme Corporation                 [Disconnect]│   │
│  │    LinkedIn Page • Connected                     │   │
│  │    Last posted: 1 week ago                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Post Composer
```
┌─────────────────────────────────────────────────────────┐
│  Create Post                              [Schedule ▼]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Post to: ☑ Facebook  ☑ Instagram  ☑ LinkedIn  ☐ X    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Write your post...                               │   │
│  │                                                   │   │
│  │ We're excited to announce our new product! 🎉   │   │
│  │                                                   │   │
│  │ Check it out at example.com/new                  │   │
│  │                                                   │   │
│  │ #newproduct #launch #excited                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📎 Add Media   🔗 Add Link   #️⃣ Add Hashtags          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Platform Previews                                │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐         │   │
│  │ │ Facebook │ │Instagram │ │ LinkedIn │         │   │
│  │ │ preview  │ │ preview  │ │ preview  │         │   │
│  │ └──────────┘ └──────────┘ └──────────┘         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Save Draft]  [Publish]    │
└─────────────────────────────────────────────────────────┘
```

### Calendar View
```
┌─────────────────────────────────────────────────────────┐
│  Social Calendar                     February 2026      │
├─────────────────────────────────────────────────────────┤
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat         │
├─────────────────────────────────────────────────────────┤
│   26     27     28     29     30     31      1         │
│                              ┌──┐                       │
│                              │📘│                       │
│   2      3      4      5     └──┘6      7      8       │
│  ┌──┐                       ┌──┐                        │
│  │📘│                       │📸│                        │
│  │🔗│                       │📘│                        │
│  └──┘                       └──┘                        │
│   9     10     11     12     13     14     15          │
│                ┌──┐                                     │
│                │🐦│                                     │
│                └──┘                                     │
└─────────────────────────────────────────────────────────┘
```

## Engagement Analytics

### Metrics Tracked
- **Likes/Reactions** - User likes and reactions
- **Comments** - User comments
- **Shares/Retweets** - Content shares
- **Clicks** - Link clicks
- **Impressions** - Total views
- **Reach** - Unique viewers
- **Engagement Rate** - (Likes + Comments + Shares) / Reach

### Analytics Dashboard
- Performance over time charts
- Top performing posts
- Best posting times
- Audience growth
- Platform comparison

## Scheduling

### Best Time to Post
AI-powered recommendations based on:
- Historical engagement data
- Industry benchmarks
- Audience timezone distribution

### Queue Management
- Drag-and-drop rescheduling
- Bulk scheduling
- Recurring post schedules
- Time zone handling

## Multi-Platform Posting

### Workflow
1. Compose base content
2. Select target platforms
3. Customize per platform (optional)
4. Preview each platform
5. Schedule or publish immediately

### Platform-Specific Customization
- Adjust text length per platform
- Select different media per platform
- Platform-specific hashtag strategies
- Link handling (Instagram bio vs inline)

## Error Handling

### Common Errors
| Error | Cause | Resolution |
|-------|-------|------------|
| Token Expired | OAuth token expired | Reconnect account |
| Rate Limited | Too many requests | Wait and retry |
| Media Invalid | Wrong format/size | Resize or reformat |
| Content Blocked | Policy violation | Edit content |
| Account Restricted | Platform restriction | Contact platform |

### Retry Logic
- Automatic retry for transient errors
- Exponential backoff
- Notify user after 3 failures
- Keep post in draft status

## Security

### Token Storage
- All tokens encrypted at rest
- Tokens proxied through Edge Functions
- Never exposed to client-side code

### Permission Scoping
- Request minimum necessary permissions
- Clear disclosure of data access
- Easy account disconnection

## Compliance

### Platform Policies
- Adhere to each platform's terms of service
- No automated engagement (likes, follows)
- Respect rate limits
- Handle user data per platform guidelines

### Content Guidelines
- Clear advertising disclosure
- Honest claims
- Copyright compliance
- Age-appropriate content

## Best Practices

1. **Diversify Content** - Don't post identical content everywhere
2. **Optimize Timing** - Use analytics to find best posting times
3. **Engage Authentically** - Respond to comments and messages
4. **Monitor Performance** - Track what works and iterate
5. **Stay Compliant** - Follow platform rules and guidelines
