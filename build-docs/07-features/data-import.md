# Data Import Framework

## Overview

The Data Import Framework enables users to bring external data into Project Gimbal from various sources including databases, analytics platforms, APIs, and files. Data can be imported manually or on a recurring schedule with automatic data cleaning and transformation.

## Key Features

- **Multi-Source Support**: Connect to PostgreSQL, MySQL, SQL Server, Redshift, BigQuery, Snowflake, GA4, Meta Pixel, REST APIs, CSV/Excel files
- **Test Connection & Preview**: View top 10 rows before committing to import
- **Dynamic Tables**: Each import creates its own dedicated table with user-defined schema
- **Column Configuration**: Include/exclude columns, rename, set data types
- **Data Cleaning**: Trim, case normalization, type parsing, validation, transformations
- **Row Filtering**: Include/exclude rows based on conditions
- **Duplicate Handling**: Keep first, keep last, skip all duplicates
- **Flexible Scheduling**: Manual, hourly, daily, weekly, monthly, or custom cron
- **Incremental Sync**: Only fetch new/updated rows for large datasets

## Supported Data Sources

### Database Connections

| Database | Connection Method | Features |
|----------|-------------------|----------|
| **PostgreSQL** | Connection string | SSL, read replicas, IAM auth |
| **MySQL** | Connection string | SSL, version 5.7+ |
| **Microsoft SQL Server** | Connection string | Windows/SQL auth, Azure SQL |
| **Amazon Redshift** | Connection string | Via PostgreSQL driver, IAM auth |
| **Google BigQuery** | Service account JSON | OAuth or service account |
| **Snowflake** | Account identifier | OAuth or key-pair auth |

### File-Based Sources

| Source | Method | Limits |
|--------|--------|--------|
| **CSV Upload** | Direct upload | Max 50MB, 100k rows |
| **CSV from URL** | HTTP(S) fetch | Supports auth headers |
| **Google Sheets** | OAuth + Sheet ID | Specific sheet/range |
| **Excel (XLSX)** | Direct upload | Max 10MB, sheet selection |

### Analytics Platforms

| Platform | Authentication | Data Available |
|----------|----------------|----------------|
| **Google Analytics 4** | OAuth 2.0 | Traffic, behavior, conversions |
| **Meta Pixel / Ads** | OAuth 2.0 | Ad performance, conversions |
| **REST API (Generic)** | API Key / OAuth | Custom endpoints |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Data Source   │────▶│  Edge Function   │────▶│  Dynamic Table  │
│  (DB, API,      │     │  (sync-*)        │     │  import_*       │
│   File)         │     └──────────────────┘     └─────────────────┘
└─────────────────┘              │
         │                       ▼
         │              ┌──────────────────┐
         │              │   sync_logs      │
         │              │  (audit trail)   │
         │              └──────────────────┘
         ▼
┌─────────────────┐
│  Data Cleaning  │
│  (trim, parse,  │
│   validate)     │
└─────────────────┘
```

## Database Schema

### data_sources
Stores connection configurations for external data sources.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner reference |
| name | VARCHAR(255) | Display name (becomes table name) |
| type | VARCHAR(50) | Source type |
| credentials | JSONB | Encrypted connection credentials |
| config | JSONB | Source-specific configuration |
| column_config | JSONB | Column mappings and cleaning rules |
| schedule_config | JSONB | Schedule timing and retry settings |
| sync_schedule | VARCHAR(50) | manual, hourly, daily, weekly, monthly, cron |
| last_sync_at | TIMESTAMPTZ | Last successful sync |
| next_sync_at | TIMESTAMPTZ | Next scheduled sync |
| last_sync_value | TEXT | For incremental syncs |
| sync_status | VARCHAR(50) | idle, syncing, success, failed |
| table_name | VARCHAR(255) | Dynamic table name |

### import_tables
Registry of dynamically created tables.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| data_source_id | UUID | Source reference |
| table_name | VARCHAR(255) | Actual table name |
| column_definitions | JSONB | Column schema |
| row_count | INTEGER | Number of rows |

### sync_logs
Tracks sync history for debugging and auditing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| data_source_id | UUID | Source reference |
| started_at | TIMESTAMPTZ | Sync start time |
| completed_at | TIMESTAMPTZ | Sync completion time |
| status | VARCHAR(50) | running, success, failed, cancelled |
| records_imported | INTEGER | Rows imported |
| records_skipped | INTEGER | Rows skipped (cleaning/filter) |
| preview_data | JSONB | Top 10 rows for preview |
| error_message | TEXT | Error details |

## User Interface

### Data Import Wizard (7 Steps)

#### Step 1: Select Source Type
- Choose from database, file, or API sources
- Enter connection credentials or upload file

#### Step 2: Test Connection & Preview
- **Test Connection**: Validates credentials without importing
- **Preview Data**: Shows top 10 rows with:
  - Auto-detected column types
  - Sample values per column
  - Null count and unique count
  - Total row count

#### Step 3: Configure Columns
For each column:
- **Include/Exclude**: Checkbox to include in import
- **Rename**: Change column name (snake_case suggested)
- **Type Override**: Override detected type (text, number, integer, boolean, date, timestamp)
- **Cleaning Rules**: Add data cleaning rules

#### Step 4: Row Filtering (Optional)
Define conditions to include/exclude rows:
- Equals / Not equals
- Contains / Not contains
- Is empty / Is not empty
- Greater than / Less than

#### Step 5: Duplicate Handling (Optional)
- Select key columns for duplicate detection
- Choose strategy: Keep all | Keep first | Keep last | Skip all

#### Step 6: Name & Schedule
- **Import Name**: Becomes the table name (`import_{name}_{uuid}`)
- **Schedule**: Manual, Hourly, Daily, Weekly, Monthly, Custom Cron
- **Time & Timezone**: For scheduled imports
- **Incremental Sync**: Enable for large tables (only fetch new rows)

#### Step 7: Review & Import
- Summary of all settings
- Estimated final row count
- **[Import Now]** or **[Save as Draft]**

## Data Cleaning Rules

### Whitespace

| Rule | Description | Example |
|------|-------------|---------|
| `trim` | Remove leading/trailing spaces | `"  hello  "` → `"hello"` |
| `collapse_whitespace` | Multiple spaces → single | `"a    b"` → `"a b"` |

### Case Normalization

| Rule | Description | Example |
|------|-------------|---------|
| `lowercase` | Convert to lowercase | `"HELLO"` → `"hello"` |
| `uppercase` | Convert to uppercase | `"hello"` → `"HELLO"` |
| `title_case` | Capitalize each word | `"john doe"` → `"John Doe"` |

### Null Handling

| Rule | Description | Example |
|------|-------------|---------|
| `null_to_default` | Replace null with value | `null` → `"N/A"` |
| `empty_to_null` | Empty string → null | `""` → `null` |
| `skip_if_empty` | Skip entire row if empty | Row excluded |

### Type Parsing

| Rule | Description | Example |
|------|-------------|---------|
| `parse_number` | Remove non-numeric chars | `"$1,234.56"` → `1234.56` |
| `parse_percentage` | Handle percentages | `"50%"` → `0.5` or `50` |
| `parse_boolean` | Map custom values | `"Yes"` → `true` |
| `parse_date` | Parse date formats | `"01/15/2024"` → `2024-01-15` |

### Validation

| Rule | Action on Invalid | Description |
|------|-------------------|-------------|
| `validate_email` | skip / null / keep | Check email format |
| `validate_phone` | skip / null / keep | Normalize to E.164 |
| `validate_url` | skip / null / keep | Check URL format |

### Transformations

| Rule | Description | Example |
|------|-------------|---------|
| `find_replace` | Find and replace text | `"NY"` → `"New York"` |
| `split` | Split and take part | `"John Doe"` split by space, take [0] → `"John"` |
| `prefix` | Add text before | `"123"` → `"ID-123"` |
| `suffix` | Add text after | `"123"` → `"123-USD"` |

## Scheduling

### Schedule Options

| Frequency | Description | Use Case |
|-----------|-------------|----------|
| **Manual** | User triggers sync | One-time imports, testing |
| **Hourly** | Every hour at :00 | Real-time dashboards |
| **Daily** | Configurable time | Standard reporting |
| **Weekly** | Configurable day/time | Summary reports |
| **Monthly** | First of month | Month-end reports |
| **Custom Cron** | Any cron expression | Advanced scheduling |

### Timezone Support
All scheduled imports respect user's configured timezone.

### Retry Logic
- **Automatic retry**: Up to 3 times on failure (configurable)
- **Exponential backoff**: 1 min, 4 min, 16 min
- **Notification**: Alert user after final failure

### Incremental Sync
For large database tables:
1. Select an incremental column (e.g., `updated_at`, `id`)
2. On first sync: Import all rows
3. On subsequent syncs: Only fetch rows where `column > last_sync_value`

## Dynamic Tables

Each data import creates its own dedicated PostgreSQL table:

- **Naming**: `import_{sanitized_name}_{uuid_short}`
- **Schema**: Matches user's column configuration
- **RLS**: Automatically enabled, tied to data source ownership
- **Lifecycle**: Dropped when data source is deleted

### Benefits
- Query data using familiar SQL
- Join with other tables
- Use in custom dashboards
- Export to other systems

## API Endpoints

### List Data Sources
```
GET /data-sources
```

### Create Data Source
```
POST /data-sources
{
  "name": "Sales Database",
  "type": "postgres",
  "credentials": { "connection_string": "..." },
  "config": { "query_type": "table", "table_name": "orders" },
  "column_config": { "columns": [...], "row_filters": [...] },
  "schedule_config": { "frequency": "daily", "time": "09:00", "timezone": "America/New_York" },
  "sync_schedule": "daily"
}
```

### Test Connection
```
POST /data-sources/test
{
  "type": "postgres",
  "credentials": { "connection_string": "..." }
}
```

### Preview Data
```
POST /data-sources/preview
{
  "type": "postgres",
  "credentials": { "connection_string": "..." },
  "config": { "query_type": "custom_query", "custom_query": "SELECT * FROM orders LIMIT 10" }
}
```

### Trigger Sync
```
POST /data-sources/:id/sync
```

### Get Sync History
```
GET /data-sources/:id/sync-logs
```

## Security

### Credential Storage
- All credentials encrypted at rest using pgcrypto
- OAuth tokens stored with refresh capability
- Connection strings never exposed to client

### Access Control
- RLS policies enforce user ownership
- Users can only access their own data sources
- Admins can view sync status across all users

### Data Validation
- Column names sanitized to prevent SQL injection
- File uploads scanned for malicious content
- Query execution sandboxed with read-only permissions

## Best Practices

1. **Use Read-Only Database Users**: Create dedicated users with SELECT-only permissions
2. **Start with Manual Syncs**: Test before enabling scheduled syncs
3. **Use Incremental for Large Tables**: Avoid re-importing millions of rows
4. **Monitor Sync Logs**: Set up alerts for failures
5. **Clean Data at Source**: If possible, clean data before import
6. **Test Column Config**: Use preview to verify cleaning rules

## Troubleshooting

### Sync Fails with CONNECTION_FAILED
1. Verify connection string format
2. Check firewall/security group rules
3. Confirm database is accessible from Supabase
4. Test credentials manually

### AUTH_EXPIRED (OAuth)
1. Go to Data Sources
2. Click "Reconnect" on the affected source
3. Complete OAuth flow again

### Partial Import (Some Rows Skipped)
1. Check sync log for error details
2. Review cleaning rules (especially `skip_if_empty` and validation rules)
3. Check row filters for unexpected exclusions

### Rate Limiting
1. Reduce sync frequency
2. Use incremental sync
3. Contact API provider for quota increase

### Large Import Timeout
1. Enable incremental sync
2. Reduce date range
3. Select fewer columns
4. Increase Edge Function timeout (contact support)
