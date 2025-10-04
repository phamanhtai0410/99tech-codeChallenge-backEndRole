/**
 * Resource model definition
 */

export interface Resource {
  id: number;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceRequest {
  name: string;
  description: string;
  type: string;
}

export interface UpdateResourceRequest {
  name?: string;
  description?: string;
  type?: string;
}

export interface ResourceFilters {
  type?: string;
  name?: string;
  limit?: number;
  offset?: number;
}