# Data Import Rules

## Supported Data Sources

### Database Connections

| Database | Connection Method | Notes |
|----------|-------------------|-------|
| PostgreSQL | Connection string | SSL support, read-only user recommended |
| MySQL | Connection string | SSL support, version 5.7+ |
| Microsoft SQL Server | Connection string | Windows/SQL auth, Azure SQL supported |
| Amazon Redshift | Connection string | Via PostgreSQL driver, IAM auth supported |
| Google BigQuery | Service account JSON | OAuth or service account |
| Snowflake | Account identifier | OAuth or key-pair auth |

### File-Based Sources

| Source | Method | Notes |
|--------|--------|-------|
| CSV Upload | Direct upload | Max 50MB, 100k rows |
| CSV from URL | HTTP(S) fetch | Supports auth headers |
| Google Sheets | OAuth + Sheet ID | Specific sheet/range selection |
| Excel (XLSX) | Direct upload | Sheet selection, max 10MB |

### API Sources

| Source | Auth Method | Sync Types |
|--------|-------------|------------|
| Google Analytics 4 | OAuth2 | Manual, Scheduled |
| Meta Pixel | OAuth2 | Manual, Scheduled |
| REST API | API Key/OAuth/Basic | Manual, Scheduled |

## Database Tables

- `data_sources` - Connection configurations
- `import_tables` - Registry of dynamic tables
- `imported_data` - Normalized imported metrics (for GA4/Meta)
- `sync_logs` - Sync history and debugging

## File Structure
```
src/
├── components/data-sources/
│   ├── DataSourceList.tsx
│   ├── DataSourceCard.tsx
│   ├── DataSourceWizard.tsx
│   ├── DataPreviewModal.tsx      # NEW: Preview top 10 rows
│   ├── ColumnConfigurator.tsx    # NEW: Column settings
│   ├── CleaningRuleEditor.tsx    # NEW: Cleaning rules per column
│   ├── RowFilterBuilder.tsx      # NEW: Row filtering
│   ├── DuplicateHandling.tsx     # NEW: Duplicate detection
│   ├── ScheduleConfigurator.tsx  # NEW: Advanced scheduling
│   ├── DatabaseConnector.tsx     # NEW: Unified DB connection
│   ├── QueryBuilder.tsx          # NEW: Table/SQL selector
│   ├── GoogleAnalyticsConnect.tsx
│   ├── MetaPixelConnect.tsx
│   ├── CsvUploader.tsx
│   ├── ColumnMapper.tsx
│   └── SyncHistory.tsx
├── services/data-sources/
│   ├── dataSourceService.ts
│   ├── syncService.ts
│   ├── cleaningService.ts        # NEW: Data cleaning logic
│   ├── importTableService.ts     # NEW: Dynamic table management
│   ├── scheduleService.ts        # NEW: Scheduling logic
│   ├── ga4Service.ts
│   ├── metaService.ts
│   └── etlService.ts
├── types/
│   └── dataImport.ts             # NEW: Import type definitions
└── stores/
    └── dataSourceStore.ts
```

## Data Cleaning Rules

### Cleaning Rule Types

```typescript
type CleaningRule =
  // Whitespace
  | { type: 'trim' }
  | { type: 'collapse_whitespace' }

  // Case
  | { type: 'lowercase' }
  | { type: 'uppercase' }
  | { type: 'title_case' }

  // Null handling
  | { type: 'null_to_default'; default_value: string }
  | { type: 'empty_to_null' }
  | { type: 'skip_if_empty' }

  // Type coercion
  | { type: 'parse_number'; remove_chars?: string }
  | { type: 'parse_boolean'; true_values: string[]; false_values: string[] }
  | { type: 'parse_date'; format: string }
  | { type: 'parse_percentage'; as_decimal: boolean }

  // Validation
  | { type: 'validate_email'; on_invalid: 'skip' | 'null' | 'keep' }
  | { type: 'validate_phone'; format: 'e164' | 'national'; on_invalid: 'skip' | 'null' | 'keep' }
  | { type: 'validate_url'; on_invalid: 'skip' | 'null' | 'keep' }

  // Transformations
  | { type: 'find_replace'; find: string; replace: string; regex?: boolean }
  | { type: 'split'; delimiter: string; take_index: number }
  | { type: 'prefix'; value: string }
  | { type: 'suffix'; value: string };
```

### Column Configuration

```typescript
interface ColumnConfig {
  source_name: string;           // Original column name
  target_name: string;           // Renamed column (snake_case)
  type: 'text' | 'number' | 'integer' | 'boolean' | 'date' | 'timestamp';
  included: boolean;             // false = exclude from import
  cleaning_rules: CleaningRule[];
}
```

### Row Filtering

```typescript
interface RowFilter {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' |
            'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';
  value?: string | number;
  action: 'include' | 'exclude';
}
```

### Duplicate Handling

```typescript
type DuplicateStrategy = 'keep_all' | 'keep_first' | 'keep_last' | 'skip_all';
```

## Schedule Configuration

### Schedule Types

```typescript
interface SyncSchedule {
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';
  time?: string;                  // "09:00" for daily/weekly/monthly
  timezone?: string;              // "America/New_York"
  day_of_week?: number;           // 0=Sunday for weekly
  day_of_month?: number;          // 1-28 for monthly
  cron_expression?: string;       // For custom cron

  // Retry behavior
  retry_on_failure: boolean;
  max_retries: number;
  retry_delay_minutes: number;
}
```

### Incremental Sync

```typescript
interface IncrementalConfig {
  incremental_column: string;     // e.g., "updated_at" or "id"
  incremental_strategy: 'full' | 'incremental';
}
```

## Security Requirements

### Credential Storage
- Encrypt API keys and tokens at rest (use Supabase Vault or pgcrypto)
- Never expose credentials in client-side code
- Refresh OAuth tokens before expiration
- Use read-only database users where possible

### Validation
- Validate all imported data before storage
- Sanitize column names and values
- Check file size limits before upload (max 50MB for CSV)
- Validate SQL queries for injection attempts
- Scan for malicious content in uploaded files

### Audit Logging
Log all import operations:
```tsx
await auditLogger.log('DATA_SOURCE_CONNECTED', { sourceType, sourceName });
await auditLogger.log('SYNC_STARTED', { dataSourceId });
await auditLogger.log('SYNC_COMPLETED', { dataSourceId, recordsImported, recordsSkipped });
await auditLogger.log('SYNC_FAILED', { dataSourceId, error });
await auditLogger.log('IMPORT_TABLE_CREATED', { tableName, columns });
await auditLogger.log('IMPORT_TABLE_DROPPED', { tableName });
```

## Dynamic Table Creation

Each data import creates its own table:
- Table name format: `import_{sanitized_name}_{uuid_short}`
- RLS enabled automatically
- Schema matches user's column configuration
- Dropped when data source is deleted

```tsx
// Create dynamic table
const tableName = await importTableService.createTable(userId, sourceName, columns);

// Query imported data
const data = await importTableService.query(tableName, { limit: 100, offset: 0 });
```

## Data Preview

Before committing an import, show preview:
```tsx
interface PreviewResponse {
  columns: Array<{
    name: string;
    detected_type: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'url';
    sample_values: string[];
    null_count: number;
    unique_count: number;
  }>;
  rows: Record<string, unknown>[];  // Top 10 rows
  total_rows: number;
}
```

## Error Handling

### Error States
- `connection_failed` - Could not connect to source
- `auth_expired` - OAuth token expired, needs re-auth
- `rate_limited` - API rate limit hit, retry later
- `validation_failed` - Data validation errors
- `partial_success` - Some records imported, some failed
- `query_error` - SQL query failed
- `timeout` - Operation timed out

### Retry Logic
- Retry failed syncs up to 3 times (configurable)
- Exponential backoff: 1s, 4s, 16s
- After max retries, mark sync as failed and notify user

## Testing

### Unit Tests
```tsx
describe('cleaningService', () => {
  it('should trim whitespace', () => {
    expect(applyRule('  hello  ', { type: 'trim' })).toBe('hello');
  });

  it('should parse boolean with custom values', () => {
    const rule = { type: 'parse_boolean', true_values: ['yes', 'y'], false_values: ['no', 'n'] };
    expect(applyRule('yes', rule)).toBe(true);
    expect(applyRule('no', rule)).toBe(false);
  });

  it('should validate email and skip invalid', () => {
    const rule = { type: 'validate_email', on_invalid: 'skip' };
    expect(applyRule('test@example.com', rule)).toEqual({ value: 'test@example.com', skip: false });
    expect(applyRule('not-an-email', rule)).toEqual({ value: null, skip: true });
  });
});
```

### Integration Tests
- Test database connections with mock credentials
- Test sync execution with sample data
- Test error handling and retries
- Test dynamic table creation and deletion
