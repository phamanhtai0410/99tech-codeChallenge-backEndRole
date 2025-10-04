/**
 * Advanced Logging Middleware with Request Tracking
 * Demonstrates enterprise-level observability and monitoring
 */

import { Request, Response, NextFunction } from 'express';

// Extended Request interface with tracking
interface TrackedRequest extends Request {
  requestId: string;
  startTime: number;
  user?: {
    id: string;
    username: string;
  };
}

// Log levels
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  method: string;
  url: string;
  userAgent: string | undefined;
  ip: string;
  userId: string | undefined;
  statusCode: number | undefined;
  responseTime: number | undefined;
  message: string;
  metadata: any;
}

/**
 * Advanced Logger Class with structured logging
 */
class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(
    req: TrackedRequest,
    level: LogLevel,
    message: string,
    metadata?: any,
    statusCode?: number,
    responseTime?: number
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userId: req.user?.id,
      statusCode,
      responseTime,
      message,
      metadata
    };
  }

  debug(req: TrackedRequest, message: string, metadata?: any): void {
    const entry = this.createLogEntry(req, LogLevel.DEBUG, message, metadata);
    this.logs.push(entry);
    console.debug('[DEBUG]', JSON.stringify(entry));
  }

  info(req: TrackedRequest, message: string, metadata?: any): void {
    const entry = this.createLogEntry(req, LogLevel.INFO, message, metadata);
    this.logs.push(entry);
    console.info('[INFO]', JSON.stringify(entry));
  }

  warn(req: TrackedRequest, message: string, metadata?: any): void {
    const entry = this.createLogEntry(req, LogLevel.WARN, message, metadata);
    this.logs.push(entry);
    console.warn('[WARN]', JSON.stringify(entry));
  }

  error(req: TrackedRequest, message: string, error?: Error, metadata?: any): void {
    const entry = this.createLogEntry(req, LogLevel.ERROR, message, {
      ...metadata,
      error: error?.message,
      stack: error?.stack
    });
    this.logs.push(entry);
    console.error('[ERROR]', JSON.stringify(entry));
  }

  logRequest(req: TrackedRequest, res: Response): void {
    const responseTime = Date.now() - req.startTime;
    const entry = this.createLogEntry(
      req,
      LogLevel.INFO,
      'Request completed',
      {
        bodySize: JSON.stringify(req.body || {}).length,
        queryParams: req.query
      },
      res.statusCode,
      responseTime
    );
    this.logs.push(entry);
    console.info('[REQUEST]', JSON.stringify(entry));
  }

  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Request tracking middleware - adds unique ID and timing
 */
export function requestTracker(req: Request, res: Response, next: NextFunction): void {
  const trackedReq = req as TrackedRequest;
  
  // Generate unique request ID
  trackedReq.requestId = generateRequestId();
  trackedReq.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', trackedReq.requestId);
  
  const logger = Logger.getInstance();
  logger.info(trackedReq, 'Request started');
  
  // Log when response finishes
  res.on('finish', () => {
    logger.logRequest(trackedReq, res);
  });
  
  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const trackedReq = req as TrackedRequest;
  const logger = Logger.getInstance();
  
  // Track slow requests
  const slowRequestThreshold = 1000; // 1 second
  
  res.on('finish', () => {
    const responseTime = Date.now() - trackedReq.startTime;
    
    if (responseTime > slowRequestThreshold) {
      logger.warn(trackedReq, 'Slow request detected', {
        responseTime,
        threshold: slowRequestThreshold
      });
    }
  });
  
  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(error: Error, req: Request, res: Response, next: NextFunction): void {
  const trackedReq = req as TrackedRequest;
  const logger = Logger.getInstance();
  
  logger.error(trackedReq, 'Request error occurred', error, {
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(error);
}

/**
 * Rate limiting with logging
 */
export function rateLimiter(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const trackedReq = req as TrackedRequest;
    const logger = Logger.getInstance();
    const clientId = trackedReq.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    // Get or create rate limit entry
    let requestInfo = requests.get(clientId);
    if (!requestInfo || now > requestInfo.resetTime) {
      requestInfo = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(clientId, requestInfo);
    }
    
    requestInfo.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestInfo.count));
    res.setHeader('X-RateLimit-Reset', new Date(requestInfo.resetTime).toISOString());
    
    if (requestInfo.count > maxRequests) {
      logger.warn(trackedReq, 'Rate limit exceeded', {
        clientId,
        requestCount: requestInfo.count,
        limit: maxRequests
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((requestInfo.resetTime - now) / 1000)
      });
      return;
    }
    
    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Health check middleware
 */
export function healthCheck(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/health-check') {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(healthData);
    return;
  }
  
  next();
}

// Export logger instance for use in other modules
export const logger = Logger.getInstance();