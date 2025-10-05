/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { globalLogger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Use the global logger instead of console.error
  globalLogger.error('API Error occurred', err, {
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip
  }, req as any);

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
}