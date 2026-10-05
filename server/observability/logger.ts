export interface StructuredLogEntry {
  timestamp: string;
  requestId: string;
  userId?: string;
  operation: string;
  status: 'info' | 'success' | 'warn' | 'error';
  durationMs?: number;
  errorCode?: string;
  component?: string;
  message?: string;
  metadata?: Record<string, any>;
}

// In-memory circular buffer for observability dashboard inspection
const MAX_LOG_HISTORY = 200;
const logHistory: StructuredLogEntry[] = [];

// Scrub sensitive keywords from any object before logging
function sanitize(obj: any): any {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  const forbiddenKeys = ['password', 'token', 'jwt', 'secret', 'apikey', 'key', 'auth', 'authorization', 'cookie'];

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (forbiddenKeys.some((f) => k.toLowerCase().includes(f))) {
      cleaned[k] = '[REDACTED]';
    } else if (typeof v === 'object') {
      cleaned[k] = sanitize(v);
    } else if (typeof v === 'string' && v.length > 500) {
      cleaned[k] = `${v.slice(0, 500)}... [truncated ${v.length} chars]`;
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export const logger = {
  log(entry: Omit<StructuredLogEntry, 'timestamp'>) {
    const fullEntry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
      metadata: entry.metadata ? sanitize(entry.metadata) : undefined,
    };

    // Store in circular buffer
    logHistory.unshift(fullEntry);
    if (logHistory.length > MAX_LOG_HISTORY) {
      logHistory.pop();
    }

    // Output formatted JSON in production or clean string in dev
    const output = JSON.stringify(fullEntry);
    if (fullEntry.status === 'error') {
      console.error(`[DevFix Log:ERROR] ${output}`);
    } else if (fullEntry.status === 'warn') {
      console.warn(`[DevFix Log:WARN] ${output}`);
    } else {
      console.log(`[DevFix Log:${fullEntry.status.toUpperCase()}] ${output}`);
    }
  },

  info(operation: string, requestId: string, metadata?: Record<string, any>) {
    this.log({ operation, requestId, status: 'info', metadata });
  },

  success(operation: string, requestId: string, durationMs?: number, metadata?: Record<string, any>) {
    this.log({ operation, requestId, status: 'success', durationMs, metadata });
  },

  warn(operation: string, requestId: string, message: string, metadata?: Record<string, any>) {
    this.log({ operation, requestId, status: 'warn', message, metadata });
  },

  error(
    operation: string,
    requestId: string,
    errorCode: string,
    message: string,
    component?: string,
    durationMs?: number,
    metadata?: Record<string, any>
  ) {
    this.log({
      operation,
      requestId,
      status: 'error',
      errorCode,
      message,
      component,
      durationMs,
      metadata,
    });
  },

  getRecentLogs(limit: number = 50, filterComponent?: string): StructuredLogEntry[] {
    let result = logHistory;
    if (filterComponent) {
      result = result.filter((l) => l.component === filterComponent || l.operation.includes(filterComponent));
    }
    return result.slice(0, limit);
  },

  clearLogs() {
    logHistory.length = 0;
  },
};
