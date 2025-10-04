/**
 * Advanced Input Validation Middleware
 * Demonstrates enterprise-level validation patterns using a validation library pattern
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../models/errors';

// Custom validation rules interface
interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enumValues?: string[];
  customValidator?: (value: any) => boolean | string;
}

interface ValidationSchema {
  [key: string]: ValidationRule[];
}

/**
 * Advanced validation middleware factory
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    
    // Determine which schema to use based on request method and route
    const method = req.method.toLowerCase();
    const schemaKey = getSchemaKey(method, req.route?.path);
    const rules = schema[schemaKey];
    
    if (!rules) {
      return next();
    }
    
    // Validate each field according to its rules
    for (const rule of rules) {
      const value = getFieldValue(req, rule.field);
      const fieldErrors = validateField(rule.field, value, rule);
      errors.push(...fieldErrors);
    }
    
    if (errors.length > 0) {
      const error = new ValidationError('Validation failed', errors);
      return next(error);
    }
    
    next();
  };
}

/**
 * Get schema key based on HTTP method and route
 */
function getSchemaKey(method: string, routePath?: string): string {
  if (method === 'post') return 'create';
  if (method === 'put' || method === 'patch') return 'update';
  if (method === 'get') return 'query';
  return 'default';
}

/**
 * Extract field value from request (body, params, query)
 */
function getFieldValue(req: Request, field: string): any {
  // Check body first, then params, then query
  if (req.body && req.body[field] !== undefined) {
    return req.body[field];
  }
  if (req.params && req.params[field] !== undefined) {
    return req.params[field];
  }
  if (req.query && req.query[field] !== undefined) {
    return req.query[field];
  }
  return undefined;
}

/**
 * Validate individual field against its rules
 */
function validateField(fieldName: string, value: any, rule: ValidationRule): string[] {
  const errors: string[] = [];
  
  // Check if required field is present
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  // If field is not required and not present, skip validation
  if (!rule.required && (value === undefined || value === null)) {
    return errors;
  }
  
  // Type validation
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${fieldName} must be a string`);
      } else {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${fieldName} must be no more than ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${fieldName} format is invalid`);
        }
      }
      break;
      
    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${fieldName} must be a number`);
      } else {
        if (rule.min !== undefined && numValue < rule.min) {
          errors.push(`${fieldName} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && numValue > rule.max) {
          errors.push(`${fieldName} must be no more than ${rule.max}`);
        }
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== 'string' || !emailRegex.test(value)) {
        errors.push(`${fieldName} must be a valid email address`);
      }
      break;
      
    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof value !== 'string' || !uuidRegex.test(value)) {
        errors.push(`${fieldName} must be a valid UUID`);
      }
      break;
      
    case 'enum':
      if (rule.enumValues && !rule.enumValues.includes(value)) {
        errors.push(`${fieldName} must be one of: ${rule.enumValues.join(', ')}`);
      }
      break;
  }
  
  // Custom validation
  if (rule.customValidator) {
    const customResult = rule.customValidator(value);
    if (customResult !== true) {
      errors.push(typeof customResult === 'string' ? customResult : `${fieldName} is invalid`);
    }
  }
  
  return errors;
}

// Pre-defined validation schemas for common use cases
export const resourceValidationSchema: ValidationSchema = {
  create: [
    {
      field: 'name',
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/
    },
    {
      field: 'description',
      type: 'string',
      required: false,
      maxLength: 500
    },
    {
      field: 'type',
      type: 'enum',
      required: true,
      enumValues: ['document', 'image', 'video', 'audio', 'other']
    }
  ],
  update: [
    {
      field: 'id',
      type: 'number',
      required: true,
      min: 1
    },
    {
      field: 'name',
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/
    },
    {
      field: 'description',
      type: 'string',
      required: false,
      maxLength: 500
    },
    {
      field: 'type',
      type: 'enum',
      required: false,
      enumValues: ['document', 'image', 'video', 'audio', 'other']
    }
  ],
  query: [
    {
      field: 'type',
      type: 'enum',
      required: false,
      enumValues: ['document', 'image', 'video', 'audio', 'other']
    },
    {
      field: 'limit',
      type: 'number',
      required: false,
      min: 1,
      max: 100
    },
    {
      field: 'offset',
      type: 'number',
      required: false,
      min: 0
    }
  ]
};

/**
 * Sanitization middleware to clean input data
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip potentially dangerous keys
    if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
}

/**
 * Sanitize individual values
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove potentially dangerous characters and trim
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
  
  return value;
}