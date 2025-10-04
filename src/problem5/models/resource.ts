/**
 * Resource model definition with TypeORM
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ResourceType {
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other'
}

export enum ResourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ARCHIVED = 'archived'
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ 
    type: 'enum', 
    enum: ResourceType,
    default: ResourceType.OTHER
  })
  type!: ResourceType;

  @Column({ 
    type: 'enum', 
    enum: ResourceStatus,
    default: ResourceStatus.ACTIVE
  })
  status!: ResourceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Metadata field for additional properties
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  // Computed properties
  get age(): number {
    return Date.now() - this.createdAt.getTime();
  }
}

// DTO interfaces for API
export interface CreateResourceRequest {
  name: string;
  description?: string;
  type?: ResourceType;
  status?: ResourceStatus;
  value: number;
  metadata?: Record<string, any>;
}

export interface UpdateResourceRequest {
  name?: string;
  description?: string;
  type?: ResourceType;
  status?: ResourceStatus;
  value?: number;
  metadata?: Record<string, any>;
}

export interface ResourceFilters {
  type?: ResourceType;
  status?: ResourceStatus;
  name?: string;
  minValue?: number;
  maxValue?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'type' | 'status' | 'value';
  sortOrder?: 'ASC' | 'DESC';
  search?: string; // Full-text search
}

export interface ResourceResponse {
  id: number;
  name: string;
  description: string | null;
  type: ResourceType;
  status: ResourceStatus;
  value: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any> | null;
  age?: number;
}