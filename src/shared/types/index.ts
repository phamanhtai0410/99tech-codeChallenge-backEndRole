/**
 * Shared TypeScript types and interfaces
 */

// Common API response structure
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

// Error structure
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  currentScore: number;
  rank?: number;
  createdAt: string;
  updatedAt: string;
}

// Score and ranking
export interface ScoreEntry {
  userId: number;
  username: string;
  score: number;
  rank: number;
  lastUpdated: string;
}

export interface ActionType {
  id: number;
  name: string;
  description: string;
  baseScore: number;
  scoringRules: Record<string, any>;
  isActive: boolean;
}