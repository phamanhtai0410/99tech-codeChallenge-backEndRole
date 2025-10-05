/**
 * Logger utility that works both with request context and standalone
 * This extends the existing logging middleware to support global application logging
 */

import { Request } from 'express';
import { logger as requestLogger } from '../middleware/logging';

// Import the TrackedRequest interface from the logging middleware
interface TrackedRequest extends Request {
  requestId: string;
  startTime: number;
  user?: {
    id: string;
    username: string;
  };
}

interface LogMetadata {
  [key: string]: any;
}

/**
 * Global Logger Class that can work with or without request context
 */
class GlobalLogger {
  private static instance: GlobalLogger;

  static getInstance(): GlobalLogger {
    if (!GlobalLogger.instance) {
      GlobalLogger.instance = new GlobalLogger();
    }
    return GlobalLogger.instance;
  }

  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      ...(metadata && { metadata })
    };
    return JSON.stringify(entry);
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: LogMetadata, req?: TrackedRequest): void {
    if (req) {
      requestLogger.debug(req as any, message, metadata);
    } else {
      console.debug('[DEBUG]', this.formatMessage('debug', message, metadata));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: LogMetadata, req?: TrackedRequest): void {
    if (req) {
      requestLogger.info(req as any, message, metadata);
    } else {
      console.info('[INFO]', this.formatMessage('info', message, metadata));
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: LogMetadata, req?: TrackedRequest): void {
    if (req) {
      requestLogger.warn(req as any, message, metadata);
    } else {
      console.warn('[WARN]', this.formatMessage('warn', message, metadata));
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, metadata?: LogMetadata, req?: TrackedRequest): void {
    const errorMetadata = {
      ...metadata,
      ...(error && {
        error: error.message,
        stack: error.stack
      })
    };

    if (req) {
      requestLogger.error(req as any, message, error, metadata);
    } else {
      console.error('[ERROR]', this.formatMessage('error', message, errorMetadata));
    }
  }

  /**
   * Database-specific logging with consistent formatting
   */
  database = {
    info: (message: string, metadata?: LogMetadata) => {
      this.info(`[DATABASE] ${message}`, metadata);
    },
    error: (message: string, error?: Error, metadata?: LogMetadata) => {
      this.error(`[DATABASE] ${message}`, error, metadata);
    },
    warn: (message: string, metadata?: LogMetadata) => {
      this.warn(`[DATABASE] ${message}`, metadata);
    }
  };

  /**
   * Server-specific logging with consistent formatting
   */
  server = {
    info: (message: string, metadata?: LogMetadata) => {
      this.info(`[SERVER] ${message}`, metadata);
    },
    error: (message: string, error?: Error, metadata?: LogMetadata) => {
      this.error(`[SERVER] ${message}`, error, metadata);
    },
    warn: (message: string, metadata?: LogMetadata) => {
      this.warn(`[SERVER] ${message}`, metadata);
    }
  };

  /**
   * Application-specific logging with consistent formatting
   */
  app = {
    info: (message: string, metadata?: LogMetadata) => {
      this.info(`[APP] ${message}`, metadata);
    },
    error: (message: string, error?: Error, metadata?: LogMetadata) => {
      this.error(`[APP] ${message}`, error, metadata);
    },
    warn: (message: string, metadata?: LogMetadata) => {
      this.warn(`[APP] ${message}`, metadata);
    }
  };
}

// Export the global logger instance
export const globalLogger = GlobalLogger.getInstance();

// Export specific loggers for easy access
export const dbLogger = globalLogger.database;
export const serverLogger = globalLogger.server;
export const appLogger = globalLogger.app;

// Re-export the request logger for middleware usage
export { requestLogger };