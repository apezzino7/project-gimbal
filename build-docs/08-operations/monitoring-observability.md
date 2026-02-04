# Monitoring & Observability

## Overview

Comprehensive monitoring and observability strategy for Project Gimbal ensures system health, performance optimization, and rapid incident response.

## Monitoring Stack

### Core Components

```
Application Layer:
  - Sentry (Error tracking & performance)
  - Vercel Analytics (Web vitals)
  - Custom metrics (Supabase)

Infrastructure Layer:
  - Supabase Dashboard (DB metrics)
  - Vercel Dashboard (Deployment & traffic)

External Services:
  - Twilio Console (SMS metrics)
  - SendGrid Dashboard (Email metrics)

Aggregation:
  - Custom dashboard (Gimbal Admin Portal)
```

## Error Tracking

### Sentry Integration

#### Setup

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
    }
    return event;
  },
});
```

#### Error Boundaries

```typescript
import { ErrorBoundary } from '@sentry/react';

function App() {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error} resetError={resetError} />
      )}
      showDialog
    >
      <Router />
    </ErrorBoundary>
  );
}

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="error-container">
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={resetError}>Try again</button>
    </div>
  );
}
```

#### Custom Error Tracking

```typescript
// Capture custom errors
try {
  await sendCampaign(campaignId);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'campaigns',
      campaignId
    },
    level: 'error',
    extra: {
      campaignData: campaign
    }
  });
  throw error;
}

// Capture messages
Sentry.captureMessage('User reached quota limit', {
  level: 'warning',
  tags: { userId: user.id },
  extra: { quota: user.quota, usage: user.usage }
});
```

## Performance Monitoring

### Web Vitals

```typescript
// src/utils/analytics.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to Sentry
  Sentry.setMeasurement(metric.name, metric.value, metric.unit);

  // Send to custom analytics
  supabase.from('web_vitals').insert({
    metric_name: metric.name,
    value: metric.value,
    timestamp: new Date().toISOString()
  });
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Performance Thresholds

```typescript
const performanceThresholds = {
  LCP: 2500,  // Largest Contentful Paint (ms)
  FID: 100,   // First Input Delay (ms)
  CLS: 0.1,   // Cumulative Layout Shift (score)
  TTFB: 800,  // Time to First Byte (ms)
  FCP: 1800,  // First Contentful Paint (ms)
};

function checkPerformance(metric: Metric) {
  const threshold = performanceThresholds[metric.name as keyof typeof performanceThresholds];

  if (metric.value > threshold) {
    Sentry.captureMessage(`Poor ${metric.name} performance`, {
      level: 'warning',
      tags: { metric: metric.name },
      extra: { value: metric.value, threshold }
    });
  }
}
```

## Application Monitoring

### Custom Metrics

```sql
-- Application metrics table
CREATE TABLE app_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    tags JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_app_metrics_name_time ON app_metrics(metric_name, timestamp DESC);
CREATE INDEX idx_app_metrics_tags ON app_metrics USING gin(tags);
```

```typescript
// Track custom metrics
async function trackMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  await supabase.from('app_metrics').insert({
    metric_name: name,
    metric_value: value,
    tags: tags || {},
    timestamp: new Date().toISOString()
  });
}

// Usage examples
await trackMetric('campaign.sent', 1, {
  campaign_id: campaign.id,
  type: 'sms'
});

await trackMetric('api.response_time', 245, {
  endpoint: '/campaigns',
  method: 'GET'
});

await trackMetric('user.login', 1, {
  user_id: user.id,
  method: 'email'
});
```

### Health Checks

```typescript
// Edge function: health check
export async function healthCheck() {
  const checks = {
    database: await checkDatabase(),
    auth: await checkAuth(),
    storage: await checkStorage(),
    external_services: await checkExternalServices()
  };

  const allHealthy = Object.values(checks).every(c => c.healthy);

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  };
}

async function checkDatabase() {
  try {
    const { error } = await supabase.from('users').select('count').single();
    return {
      healthy: !error,
      latency: Date.now() - start
    };
  } catch {
    return { healthy: false, error: 'Connection failed' };
  }
}

async function checkAuth() {
  try {
    const { data } = await supabase.auth.getSession();
    return { healthy: true };
  } catch {
    return { healthy: false };
  }
}

async function checkExternalServices() {
  const [twilio, sendgrid] = await Promise.all([
    checkTwilio(),
    checkSendGrid()
  ]);

  return {
    healthy: twilio.healthy && sendgrid.healthy,
    services: { twilio, sendgrid }
  };
}
```

## Database Monitoring

### Query Performance

```sql
-- Slow query tracking
CREATE TABLE slow_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    execution_time NUMERIC NOT NULL,
    user_id UUID,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Connection Pool Monitoring

```typescript
async function monitorConnectionPool() {
  const { data } = await supabase.rpc('get_connection_stats');

  const metrics = {
    total_connections: data.total,
    active_connections: data.active,
    idle_connections: data.idle,
    utilization: data.active / data.total
  };

  if (metrics.utilization > 0.8) {
    await sendAlert({
      severity: 'warning',
      message: `High connection pool utilization: ${(metrics.utilization * 100).toFixed(1)}%`,
      metric: 'db_connection_utilization',
      value: metrics.utilization
    });
  }

  return metrics;
}
```

### Storage Monitoring

```typescript
async function monitorStorage() {
  const { data: usage } = await supabase
    .rpc('get_storage_usage');

  const metrics = {
    total_size_gb: usage.total_size / (1024 ** 3),
    used_size_gb: usage.used_size / (1024 ** 3),
    utilization: usage.used_size / usage.total_size
  };

  if (metrics.utilization > 0.8) {
    await sendAlert({
      severity: 'warning',
      message: `Storage usage at ${(metrics.utilization * 100).toFixed(1)}%`,
      metric: 'storage_utilization',
      value: metrics.utilization
    });
  }

  return metrics;
}
```

## Logging Strategy

### Structured Logging

```typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

class Logger {
  private context: Record<string, any> = {};

  setContext(key: string, value: any) {
    this.context[key] = value;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...meta }
    };

    // Console output (development)
    if (import.meta.env.DEV) {
      console[level](entry);
    }

    // Send to logging service (production)
    if (import.meta.env.PROD) {
      this.sendToLoggingService(entry);
    }

    // Send errors to Sentry
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      Sentry.captureMessage(message, {
        level: level,
        extra: meta
      });
    }
  }

  info(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, meta);
  }

  private async sendToLoggingService(entry: LogEntry) {
    await supabase.from('application_logs').insert(entry);
  }
}

const logger = new Logger();

// Usage
logger.info('User logged in', { userId: user.id, method: 'email' });
logger.error('Campaign send failed', {
  campaignId: campaign.id,
  error: error.message
});
```

### Log Retention

```sql
-- Application logs with partitioning
CREATE TABLE application_logs (
    id UUID DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    user_id UUID,
    request_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE application_logs_2024_01 PARTITION OF application_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Retention policy: Delete logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM application_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (via pg_cron or external scheduler)
```

## Alerting

### Alert Configuration

```typescript
interface Alert {
  name: string;
  condition: () => Promise<boolean>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: Array<'email' | 'sms' | 'slack'>;
  throttle?: number; // minutes
}

const alerts: Alert[] = [
  {
    name: 'High Error Rate',
    condition: async () => {
      const errorRate = await getErrorRate(15); // last 15 min
      return errorRate > 0.05; // > 5%
    },
    severity: 'error',
    channels: ['email', 'slack']
  },
  {
    name: 'Database Connection Pool Exhausted',
    condition: async () => {
      const pool = await monitorConnectionPool();
      return pool.utilization > 0.9;
    },
    severity: 'critical',
    channels: ['email', 'sms', 'slack']
  },
  {
    name: 'Low SMS Quota',
    condition: async () => {
      const usage = await getSMSUsage();
      return usage.remaining < usage.total * 0.1; // < 10% remaining
    },
    severity: 'warning',
    channels: ['email']
  },
  {
    name: 'Poor Email Deliverability',
    condition: async () => {
      const deliveryRate = await getEmailDeliveryRate(24); // 24 hours
      return deliveryRate < 0.9; // < 90%
    },
    severity: 'warning',
    channels: ['email', 'slack']
  }
];
```

### Alert Manager

```typescript
class AlertManager {
  private lastAlertTime: Map<string, number> = new Map();

  async checkAlerts() {
    for (const alert of alerts) {
      try {
        const triggered = await alert.condition();

        if (triggered && this.shouldSendAlert(alert)) {
          await this.sendAlert(alert);
          this.lastAlertTime.set(alert.name, Date.now());
        }
      } catch (error) {
        logger.error('Alert check failed', {
          alert: alert.name,
          error: error.message
        });
      }
    }
  }

  private shouldSendAlert(alert: Alert): boolean {
    if (!alert.throttle) return true;

    const lastAlert = this.lastAlertTime.get(alert.name);
    if (!lastAlert) return true;

    const throttleMs = alert.throttle * 60 * 1000;
    return Date.now() - lastAlert > throttleMs;
  }

  private async sendAlert(alert: Alert) {
    const message = `[${alert.severity.toUpperCase()}] ${alert.name}`;

    for (const channel of alert.channels) {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert, message);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, message);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, message);
          break;
      }
    }

    // Log alert
    logger.warn('Alert triggered', {
      alert: alert.name,
      severity: alert.severity
    });
  }

  private async sendEmailAlert(alert: Alert, message: string) {
    await sendEmail({
      to: 'alerts@your-company.com',
      subject: message,
      html: `
        <h2>${message}</h2>
        <p>Severity: ${alert.severity}</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    });
  }

  private async sendSlackAlert(alert: Alert, message: string) {
    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        attachments: [{
          color: alert.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Time', value: new Date().toISOString(), short: true }
          ]
        }]
      })
    });
  }
}

// Run alert checks every 5 minutes
setInterval(async () => {
  const alertManager = new AlertManager();
  await alertManager.checkAlerts();
}, 5 * 60 * 1000);
```

## Dashboards

### Admin Monitoring Dashboard

```typescript
interface MonitoringDashboard {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastIncident?: Date;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  resources: {
    dbConnections: { used: number; total: number };
    storage: { used: number; total: number };
  };
  campaigns: {
    smsQuota: { used: number; total: number };
    emailQuota: { used: number; total: number };
  };
  recentErrors: ErrorSummary[];
  recentAlerts: Alert[];
}

function MonitoringDashboard() {
  const { data, loading } = useMonitoringData();

  return (
    <div className="monitoring-dashboard">
      <StatusOverview status={data.systemHealth.status} />

      <MetricsGrid>
        <MetricCard
          title="Avg Response Time"
          value={`${data.performance.avgResponseTime}ms`}
          trend={getTrend(data.performance.avgResponseTime, 200)}
        />
        <MetricCard
          title="Error Rate"
          value={`${(data.performance.errorRate * 100).toFixed(2)}%`}
          trend={data.performance.errorRate < 0.01 ? 'good' : 'warning'}
        />
        <MetricCard
          title="DB Connections"
          value={`${data.resources.dbConnections.used}/${data.resources.dbConnections.total}`}
          trend={getUtilizationTrend(data.resources.dbConnections)}
        />
      </MetricsGrid>

      <ErrorsTable errors={data.recentErrors} />
      <AlertsTable alerts={data.recentAlerts} />
    </div>
  );
}
```

## Incident Response

### Incident Management

```typescript
interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  startedAt: Date;
  resolvedAt?: Date;
  affectedSystems: string[];
  updates: IncidentUpdate[];
}

class IncidentManager {
  async createIncident(data: Partial<Incident>): Promise<Incident> {
    const incident = await supabase
      .from('incidents')
      .insert({
        ...data,
        status: 'investigating',
        started_at: new Date()
      })
      .select()
      .single();

    // Notify team
    await this.notifyTeam(incident.data);

    // Update status page
    await this.updateStatusPage(incident.data);

    return incident.data;
  }

  async updateIncident(id: string, update: IncidentUpdate) {
    await supabase
      .from('incident_updates')
      .insert({
        incident_id: id,
        message: update.message,
        status: update.status
      });

    // Notify subscribers
    await this.notifySubscribers(id, update);

    // Update status page
    await this.updateStatusPage(await this.getIncident(id));
  }

  async resolveIncident(id: string, resolution: string) {
    await supabase
      .from('incidents')
      .update({
        status: 'resolved',
        resolved_at: new Date(),
        resolution
      })
      .eq('id', id);

    // Conduct post-mortem
    await this.schedulePostMortem(id);
  }
}
```

### Runbooks

```typescript
const runbooks = {
  highErrorRate: {
    title: 'High Error Rate Response',
    steps: [
      '1. Check Sentry dashboard for error patterns',
      '2. Identify affected components',
      '3. Check recent deployments (potential rollback)',
      '4. Review infrastructure metrics',
      '5. Engage on-call engineer if needed',
      '6. Create incident if not resolved in 15 minutes'
    ]
  },
  databaseConnectionPoolExhausted: {
    title: 'Database Connection Pool Exhausted',
    steps: [
      '1. Check current connection count',
      '2. Identify queries holding connections',
      '3. Kill long-running queries if necessary',
      '4. Scale up connection pool limit',
      '5. Investigate application code for connection leaks',
      '6. Deploy fix and monitor'
    ]
  },
  highResponseTimes: {
    title: 'High Response Times',
    steps: [
      '1. Check database query performance',
      '2. Review slow query log',
      '3. Check API rate limits on external services',
      '4. Verify CDN is functioning',
      '5. Check for unusual traffic patterns',
      '6. Scale infrastructure if needed'
    ]
  }
};
```

## Observability Best Practices

1. **Instrument everything** - Metrics, logs, traces
2. **Use structured logging** - Makes searching easier
3. **Set meaningful alerts** - Actionable, not noisy
4. **Monitor user experience** - Web vitals, errors
5. **Track business metrics** - Campaign sends, conversions
6. **Regular reviews** - Weekly metrics review
7. **Test alerting** - Ensure alerts are received
8. **Document runbooks** - Standardize incident response
9. **Conduct post-mortems** - Learn from incidents
10. **Optimize continuously** - Act on monitoring insights

## Metrics to Track

### Application Metrics
- Request rate (req/min)
- Response time (p50, p95, p99)
- Error rate (%)
- Availability (uptime %)

### Business Metrics
- Active users (daily, monthly)
- Campaign sends (SMS, email)
- Delivery rates
- User engagement

### Infrastructure Metrics
- Database connections
- Storage usage
- Memory usage
- CPU usage

### External Services
- Twilio status & quota
- SendGrid status & quota
- API response times

## Tools Reference

- **Sentry**: https://sentry.io
- **Vercel Analytics**: https://vercel.com/analytics
- **Supabase Metrics**: Built-in dashboard
- **Lighthouse CI**: https://github.com/GoogleChrome/lighthouse-ci
- **Web Vitals**: https://web.dev/vitals/
