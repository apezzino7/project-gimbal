/**
 * Audit Logging for Security Events
 * Logs authentication and security-related events to both server and localStorage
 */

import { STORAGE_KEYS, AUDIT_CONFIG } from '../constants/app';
import { supabase } from '../lib/supabase';

export const AuditEventType = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  ACCOUNT_LOCKED: 'account_locked',
  PASSWORD_CHANGED: 'password_changed',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
} as const;

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

export interface AuditLogEntry {
  timestamp: number;
  eventType: AuditEventType;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private pendingServerLogs: AuditLogEntry[] = [];

  constructor() {
    this.loadLogs();
    // Attempt to flush any pending server logs
    this.flushPendingLogs();
  }

  /**
   * Load logs from localStorage
   */
  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (stored) {
        this.logs = JSON.parse(stored);
      }

      // Load pending server logs
      const pending = localStorage.getItem(`${STORAGE_KEYS.AUDIT_LOGS}-pending`);
      if (pending) {
        this.pendingServerLogs = JSON.parse(pending);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveLogs(): void {
    try {
      // Keep only the most recent logs
      if (this.logs.length > AUDIT_CONFIG.MAX_LOGS) {
        this.logs = this.logs.slice(-AUDIT_CONFIG.MAX_LOGS);
      }
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save audit logs:', error);
    }
  }

  /**
   * Save pending server logs for retry
   */
  private savePendingLogs(): void {
    try {
      localStorage.setItem(
        `${STORAGE_KEYS.AUDIT_LOGS}-pending`,
        JSON.stringify(this.pendingServerLogs)
      );
    } catch (error) {
      console.error('Failed to save pending logs:', error);
    }
  }

  /**
   * Send log to server (Supabase)
   */
  private async sendToServer(entry: AuditLogEntry): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('log_audit_event', {
        p_event_type: entry.eventType,
        p_email: entry.email ?? null,
        p_user_agent: entry.userAgent ?? null,
        p_metadata: entry.metadata ?? {},
      });

      if (error) {
        console.error('Failed to send audit log to server:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send audit log to server:', error);
      return false;
    }
  }

  /**
   * Flush pending logs to server
   */
  private async flushPendingLogs(): Promise<void> {
    if (this.pendingServerLogs.length === 0) return;

    const toFlush = [...this.pendingServerLogs];
    this.pendingServerLogs = [];

    for (const entry of toFlush) {
      const success = await this.sendToServer(entry);
      if (!success) {
        // Re-add to pending if failed
        this.pendingServerLogs.push(entry);
      }
    }

    this.savePendingLogs();
  }

  /**
   * Log an audit event
   * Saves to both localStorage (immediate) and server (async)
   */
  log(
    eventType: AuditEventType,
    email?: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry: AuditLogEntry = {
      timestamp: Date.now(),
      eventType,
      email,
      userAgent: navigator.userAgent,
      metadata,
    };

    // Always save to localStorage immediately
    this.logs.push(entry);
    this.saveLogs();

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Audit Log]', {
        event: eventType,
        email,
        time: new Date(entry.timestamp).toISOString(),
        ...metadata,
      });
    }

    // Send to server asynchronously (non-blocking)
    this.sendToServer(entry).then((success) => {
      if (!success) {
        // Add to pending queue for retry
        this.pendingServerLogs.push(entry);
        this.savePendingLogs();
      }
    });
  }

  /**
   * Get recent logs from localStorage
   */
  getRecentLogs(limit: number = 50): AuditLogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Get logs by event type
   */
  getLogsByType(eventType: AuditEventType): AuditLogEntry[] {
    return this.logs.filter((log) => log.eventType === eventType);
  }

  /**
   * Get logs by email
   */
  getLogsByEmail(email: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.email === email);
  }

  /**
   * Clear all local logs
   */
  clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    } catch (error) {
      console.error('Failed to clear audit logs:', error);
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Retry sending pending logs (call on app startup or network recovery)
   */
  retryPendingLogs(): void {
    this.flushPendingLogs();
  }
}

export const auditLogger = new AuditLogger();
