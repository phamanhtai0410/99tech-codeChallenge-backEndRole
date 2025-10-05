# Security & Authorization Specification

## Overview

This document outlines the comprehensive security architecture for the live scoreboard system, covering authentication, authorization, data protection, and security best practices.

## Authentication Architecture

### JWT Token Management

```typescript
// JWT Configuration
interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string; // '15m'
  refreshTokenExpiry: string; // '7d'
  issuer: string;
  audience: string;
}

// Token Structure
interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Token Service
class TokenService {
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: this.getUserPermissions(user.roles),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      iss: process.env.JWT_ISSUER!,
      aud: process.env.JWT_AUDIENCE!
    };
    
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
      algorithm: 'HS256'
    });
  }
  
  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d', algorithm: 'HS256' }
    );
  }
  
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }
}
```

### Authentication Middleware

```typescript
// Express Authentication Middleware
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }
    
    const decoded = tokenService.verifyAccessToken(token);
    
    // Check if user still exists and is active
    const user = await userService.getUserById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }
    
    // Check token blacklist (for logout functionality)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }
    
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles,
      permissions: decoded.permissions
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_ERROR'
    });
  }
};
```

## Authorization Framework

### Role-Based Access Control (RBAC)

```typescript
// Role and Permission Definitions
enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest'
}

enum Permission {
  // Score management
  UPDATE_SCORE = 'score:update',
  VIEW_SCORE = 'score:view',
  DELETE_SCORE = 'score:delete',
  
  // User management
  VIEW_USER = 'user:view',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',
  
  // Action management
  COMPLETE_ACTION = 'action:complete',
  VIEW_ACTION_HISTORY = 'action:view_history',
  MODERATE_ACTIONS = 'action:moderate',
  
  // System administration
  VIEW_ANALYTICS = 'system:analytics',
  MANAGE_SYSTEM = 'system:manage',
  VIEW_LOGS = 'system:logs'
}

// Role-Permission Mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.MODERATOR]: [
    Permission.VIEW_SCORE,
    Permission.VIEW_USER,
    Permission.VIEW_ACTION_HISTORY,
    Permission.MODERATE_ACTIONS,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.USER]: [
    Permission.VIEW_SCORE,
    Permission.UPDATE_SCORE,
    Permission.COMPLETE_ACTION,
    Permission.VIEW_ACTION_HISTORY,
    Permission.VIEW_USER
  ],
  [UserRole.GUEST]: [
    Permission.VIEW_SCORE,
    Permission.VIEW_USER
  ]
};

// Authorization Middleware
export const requirePermission = (permission: Permission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: permission
      });
    }
    
    next();
  };
};

// Resource-specific authorization
export const requireResourceOwnership = (resourceType: 'score' | 'action') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params.id;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
      
      const hasOwnership = await checkResourceOwnership(resourceType, resourceId, userId);
      
      if (!hasOwnership && !req.user.permissions.includes(Permission.MODERATE_ACTIONS)) {
        return res.status(403).json({
          error: 'Access denied to this resource',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTHZ_ERROR'
      });
    }
  };
};
```

## Input Validation & Sanitization

### Request Validation Schemas

```typescript
import Joi from 'joi';

// Validation Schemas
export const schemas = {
  // Authentication
  login: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).max(128).required()
  }),
  
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      })
  }),
  
  // Action completion
  completeAction: Joi.object({
    actionType: Joi.string().valid('TASK_COMPLETE', 'LEVEL_UP', 'ACHIEVEMENT', 'DAILY_LOGIN').required(),
    actionIdentifier: Joi.string().max(255).required(),
    metadata: Joi.object().optional()
  }),
  
  // Score updates
  updateScore: Joi.object({
    scoreChange: Joi.number().integer().min(-1000).max(1000).required(),
    reason: Joi.string().max(255).required()
  }),
  
  // Query parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  
  scoreboard: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })
};

// Validation Middleware
export const validateRequest = (schema: Joi.ObjectSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }
    
    req[target] = value;
    next();
  };
};
```

### SQL Injection Prevention

```typescript
// Parameterized Query Builder
class SecureQueryBuilder {
  private query: string = '';
  private params: any[] = [];
  
  select(columns: string[]): this {
    // Whitelist column names to prevent injection
    const allowedColumns = ['id', 'username', 'score', 'rank', 'created_at', 'updated_at'];
    const safeColumns = columns.filter(col => allowedColumns.includes(col));
    this.query += `SELECT ${safeColumns.join(', ')} `;
    return this;
  }
  
  from(table: string): this {
    // Whitelist table names
    const allowedTables = ['users', 'actions', 'scoreboard_snapshots'];
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name');
    }
    this.query += `FROM ${table} `;
    return this;
  }
  
  where(condition: string, value: any): this {
    this.query += `WHERE ${condition} `;
    this.params.push(value);
    return this;
  }
  
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    const allowedColumns = ['score', 'created_at', 'updated_at', 'username'];
    if (!allowedColumns.includes(column)) {
      throw new Error('Invalid order column');
    }
    this.query += `ORDER BY ${column} ${direction} `;
    return this;
  }
  
  limit(count: number): this {
    this.query += `LIMIT $${this.params.length + 1} `;
    this.params.push(count);
    return this;
  }
  
  build(): { query: string; params: any[] } {
    return { query: this.query.trim(), params: this.params };
  }
}
```

## Rate Limiting & DDoS Protection

### Multi-Layer Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Global rate limiter
export const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication rate limiter
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  }
});

// Action completion rate limiter
export const actionLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:action:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 actions per minute
  keyGenerator: (req: AuthenticatedRequest) => req.user?.id || req.ip,
  message: {
    error: 'Too many actions completed',
    code: 'ACTION_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  }
});

// Sliding window rate limiter for advanced protection
class SlidingWindowRateLimiter {
  constructor(
    private redis: Redis,
    private windowSize: number,
    private maxRequests: number
  ) {}
  
  async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    const pipe = this.redis.pipeline();
    
    // Remove old entries
    pipe.zremrangebyscore(`rate_limit:${key}`, '-inf', windowStart);
    
    // Count current requests
    pipe.zcard(`rate_limit:${key}`);
    
    // Add current request
    pipe.zadd(`rate_limit:${key}`, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipe.expire(`rate_limit:${key}`, Math.ceil(this.windowSize / 1000));
    
    const results = await pipe.exec();
    const currentCount = results?.[1]?.[1] as number || 0;
    
    return {
      allowed: currentCount < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - currentCount - 1),
      resetTime: now + this.windowSize
    };
  }
}
```

## Data Protection & Encryption

### Sensitive Data Encryption

```typescript
import crypto from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;
  
  constructor() {
    this.secretKey = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  }
  
  encrypt(text: string): { encrypted: string; authTag: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('scoreboard', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex')
    };
  }
  
  decrypt(encrypted: string, authTag: string, iv: string): string {
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAAD(Buffer.from('scoreboard', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
  
  verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

### Data Masking for Logs

```typescript
class LogSanitizer {
  private sensitiveFields = [
    'password',
    'token',
    'email',
    'phone',
    'ssn',
    'credit_card'
  ];
  
  sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskValue(value as string);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  private isSensitiveField(field: string): boolean {
    return this.sensitiveFields.some(sensitive => 
      field.toLowerCase().includes(sensitive)
    );
  }
  
  private maskValue(value: string): string {
    if (!value || value.length <= 4) {
      return '***';
    }
    
    const visibleChars = 2;
    const maskedLength = value.length - (visibleChars * 2);
    const mask = '*'.repeat(Math.max(3, maskedLength));
    
    return value.substring(0, visibleChars) + mask + value.substring(value.length - visibleChars);
  }
}
```

## Security Headers & CORS

### Security Middleware Configuration

```typescript
import helmet from 'helmet';
import cors from 'cors';

// Helmet configuration for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL!, process.env.WS_URL!],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};
```

## Audit Logging & Monitoring

### Security Event Logging

```typescript
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  TOKEN_REFRESH = 'token_refresh',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  SCORE_MANIPULATION_ATTEMPT = 'score_manipulation_attempt'
}

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
  private sanitizer = new LogSanitizer();
  
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const sanitizedEvent = this.sanitizer.sanitizeObject(event);
    
    // Log to database for persistence
    await this.saveToDatabase(sanitizedEvent);
    
    // Log to monitoring system
    await this.sendToMonitoring(sanitizedEvent);
    
    // Send alerts for high-severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      await this.sendAlert(sanitizedEvent);
    }
  }
  
  private async saveToDatabase(event: SecurityEvent): Promise<void> {
    await db.query(`
      INSERT INTO security_events (type, user_id, ip, user_agent, timestamp, details, severity)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      event.type,
      event.userId,
      event.ip,
      event.userAgent,
      event.timestamp,
      JSON.stringify(event.details),
      event.severity
    ]);
  }
  
  private async sendToMonitoring(event: SecurityEvent): Promise<void> {
    // Send to external monitoring service (e.g., Datadog, New Relic)
    await monitoringService.track('security.event', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip
    });
  }
  
  private async sendAlert(event: SecurityEvent): Promise<void> {
    // Send to alerting system (e.g., PagerDuty, Slack)
    await alertingService.send({
      title: `Security Alert: ${event.type}`,
      message: `High-severity security event detected`,
      severity: event.severity,
      details: event
    });
  }
}
```

### Suspicious Activity Detection

```typescript
class ThreatDetector {
  async detectSuspiciousActivity(req: AuthenticatedRequest): Promise<void> {
    const userId = req.user?.id;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');
    
    // Check for multiple failed login attempts
    await this.checkFailedLogins(ip);
    
    // Check for unusual score patterns
    if (userId) {
      await this.checkScorePatterns(userId);
    }
    
    // Check for bot-like behavior
    await this.checkBotBehavior(ip, userAgent);
    
    // Check for impossible travel
    if (userId) {
      await this.checkImpossibleTravel(userId, ip);
    }
  }
  
  private async checkFailedLogins(ip: string): Promise<void> {
    const failedAttempts = await redis.get(`failed_logins:${ip}`);
    
    if (failedAttempts && parseInt(failedAttempts) > 10) {
      await securityLogger.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        ip,
        userAgent: '',
        timestamp: new Date(),
        details: { reason: 'Multiple failed login attempts', count: failedAttempts },
        severity: 'high'
      });
    }
  }
  
  private async checkScorePatterns(userId: string): Promise<void> {
    const recentActions = await db.query(`
      SELECT COUNT(*), MAX(score_earned), AVG(score_earned)
      FROM actions 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
    `, [userId]);
    
    const { count, max, avg } = recentActions.rows[0];
    
    if (count > 100 || max > 1000 || avg > 100) {
      await securityLogger.logSecurityEvent({
        type: SecurityEventType.SCORE_MANIPULATION_ATTEMPT,
        userId,
        ip: '',
        userAgent: '',
        timestamp: new Date(),
        details: { actionCount: count, maxScore: max, avgScore: avg },
        severity: 'critical'
      });
    }
  }
}
```

## Compliance & Data Privacy

### GDPR Compliance

```typescript
class DataPrivacyService {
  async handleDataRequest(userId: string, requestType: 'export' | 'delete'): Promise<void> {
    switch (requestType) {
      case 'export':
        await this.exportUserData(userId);
        break;
      case 'delete':
        await this.deleteUserData(userId);
        break;
    }
  }
  
  private async exportUserData(userId: string): Promise<UserDataExport> {
    const userData = await db.query(`
      SELECT id, username, email, current_score, created_at, updated_at
      FROM users WHERE id = $1
    `, [userId]);
    
    const actionHistory = await db.query(`
      SELECT action_type, score_earned, created_at
      FROM actions WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    return {
      user: userData.rows[0],
      actions: actionHistory.rows,
      exportedAt: new Date().toISOString()
    };
  }
  
  private async deleteUserData(userId: string): Promise<void> {
    // Anonymize instead of hard delete to maintain data integrity
    await db.transaction(async (trx) => {
      await trx.query(`
        UPDATE users 
        SET username = 'deleted_user_' || id,
            email = 'deleted_' || id || '@example.com',
            password_hash = null,
            is_deleted = true
        WHERE id = $1
      `, [userId]);
      
      await trx.query(`
        UPDATE actions 
        SET metadata = null
        WHERE user_id = $1
      `, [userId]);
    });
  }
}
```

This comprehensive security specification covers all major aspects of securing your live scoreboard system, from authentication and authorization to data protection and compliance, providing a enterprise-grade security foundation for your interview assessment.