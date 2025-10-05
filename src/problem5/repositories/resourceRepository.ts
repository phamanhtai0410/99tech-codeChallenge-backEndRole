import { Repository } from 'typeorm';
import { Resource, ResourceType, ResourceStatus } from '../models/resource';
import { DatabaseManager } from '../database/typeorm';

export interface ResourceFilters {
  status?: ResourceStatus;
  type?: ResourceType;
  minValue?: number;
  maxValue?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ResourceUpdate {
  name?: string;
  value?: number;
  status?: ResourceStatus;
  type?: ResourceType;
}

export interface CreateResourceData {
  name: string;
  value: number;
  status?: ResourceStatus;
  type?: ResourceType;
}

/**
 * Enterprise-grade repository for Resource operations
 * Provides abstraction layer over TypeORM for testability and maintainability
 */
export class ResourceRepository {
  private repository: Repository<Resource> | null = null;

  /**
   * Get repository instance with lazy initialization
   */
  private getRepository(): Repository<Resource> {
    if (!this.repository) {
      const dataSource = DatabaseManager.getInstance().getDataSource();
      this.repository = dataSource.getRepository(Resource);
    }
    return this.repository;
  }

  /**
   * Create a new resource with validation
   */
  async create(resourceData: CreateResourceData): Promise<Resource> {
    // Validate required fields
    if (!resourceData.name?.trim()) {
      throw new Error('Resource name is required');
    }

    if (typeof resourceData.value !== 'number' || resourceData.value < 0) {
      throw new Error('Resource value must be a non-negative number');
    }

    const resource = this.getRepository().create({
      ...resourceData,
      name: resourceData.name.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      return await this.getRepository().save(resource);
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint error
        throw new Error('A resource with this name already exists');
      }
      throw new Error(`Failed to create resource: ${error.message}`);
    }
  }

  /**
   * Find resource by ID with error handling
   */
  async findById(id: number): Promise<Resource | null> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid resource ID');
    }

    try {
      return await this.getRepository().findOne({ where: { id } });
    } catch (error: any) {
      throw new Error(`Failed to find resource: ${error.message}`);
    }
  }

  /**
   * Find all resources with optional filtering and pagination
   */
  async findAll(
    filters: ResourceFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ resources: Resource[]; total: number; page: number; totalPages: number }> {
    // Validate pagination
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('Page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    try {
      const queryBuilder = this.getRepository().createQueryBuilder('resource');

      // Apply filters
      if (filters.status) {
        queryBuilder.andWhere('resource.status = :status', { status: filters.status });
      }
      if (filters.type) {
        queryBuilder.andWhere('resource.type = :type', { type: filters.type });
      }
      if (typeof filters.minValue === 'number') {
        queryBuilder.andWhere('resource.value >= :minValue', { minValue: filters.minValue });
      }
      if (typeof filters.maxValue === 'number') {
        queryBuilder.andWhere('resource.value <= :maxValue', { maxValue: filters.maxValue });
      }
      if (filters.createdAfter) {
        queryBuilder.andWhere('resource.createdAt >= :createdAfter', { 
          createdAfter: filters.createdAfter 
        });
      }
      if (filters.createdBefore) {
        queryBuilder.andWhere('resource.createdAt <= :createdBefore', { 
          createdBefore: filters.createdBefore 
        });
      }

      // Add pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // Add ordering
      queryBuilder.orderBy('resource.createdAt', 'DESC');

      const [resources, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        resources,
        total,
        page,
        totalPages
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }
  }

  /**
   * Update resource by ID
   */
  async update(id: number, updateData: ResourceUpdate): Promise<Resource | null> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid resource ID');
    }

    // Validate update data
    if (updateData.name !== undefined && !updateData.name.trim()) {
      throw new Error('Resource name cannot be empty');
    }
    if (updateData.value !== undefined && (typeof updateData.value !== 'number' || updateData.value < 0)) {
      throw new Error('Resource value must be a non-negative number');
    }

    try {
      const resource = await this.getRepository().findOne({ where: { id } });
      if (!resource) {
        return null;
      }

      // Prepare update data
      const sanitizedData: Partial<Resource> = {
        updatedAt: new Date()
      };

      if (updateData.name !== undefined) {
        sanitizedData.name = updateData.name.trim();
      }
      if (updateData.value !== undefined) {
        sanitizedData.value = updateData.value;
      }
      if (updateData.status !== undefined) {
        sanitizedData.status = updateData.status;
      }
      if (updateData.type !== undefined) {
        sanitizedData.type = updateData.type;
      }

      // Perform update
      await this.getRepository().update(id, sanitizedData);

      // Return updated resource
      return await this.getRepository().findOne({ where: { id } });
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint error
        throw new Error('A resource with this name already exists');
      }
      throw new Error(`Failed to update resource: ${error.message}`);
    }
  }

  /**
   * Delete resource by ID
   */
  async delete(id: number): Promise<boolean> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid resource ID');
    }

    try {
      const result = await this.getRepository().delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete resource: ${error.message}`);
    }
  }

  /**
   * Bulk operations for performance
   */
  async bulkCreate(resources: CreateResourceData[]): Promise<Resource[]> {
    if (!Array.isArray(resources) || resources.length === 0) {
      throw new Error('Resources array is required and cannot be empty');
    }

    // Validate all resources
    for (const resource of resources) {
      if (!resource.name?.trim()) {
        throw new Error('All resources must have a valid name');
      }
      if (typeof resource.value !== 'number' || resource.value < 0) {
        throw new Error('All resources must have a valid non-negative value');
      }
    }

    try {
      const entities = resources.map(resource => this.getRepository().create({
        ...resource,
        name: resource.name.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      return await this.getRepository().save(entities);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error('One or more resources have duplicate names');
      }
      throw new Error(`Failed to bulk create resources: ${error.message}`);
    }
  }

  /**
   * Get resource statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageValue: number;
    totalValue: number;
  }> {
    try {
      const [
        total,
        statusStats,
        typeStats,
        valueStats
      ] = await Promise.all([
        this.getRepository().count(),
        this.getRepository()
          .createQueryBuilder('resource')
          .select('resource.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('resource.status')
          .getRawMany(),
        this.getRepository()
          .createQueryBuilder('resource')
          .select('resource.type', 'type')
          .addSelect('COUNT(*)', 'count')
          .groupBy('resource.type')
          .getRawMany(),
        this.getRepository()
          .createQueryBuilder('resource')
          .select('AVG(resource.value)', 'average')
          .addSelect('SUM(resource.value)', 'total')
          .getRawOne()
      ]);

      const byStatus: Record<string, number> = {};
      statusStats.forEach((stat: any) => {
        byStatus[stat.status] = parseInt(stat.count, 10);
      });

      const byType: Record<string, number> = {};
      typeStats.forEach((stat: any) => {
        byType[stat.type] = parseInt(stat.count, 10);
      });

      return {
        total,
        byStatus,
        byType,
        averageValue: parseFloat(valueStats?.average || '0'),
        totalValue: parseFloat(valueStats?.total || '0')
      };
    } catch (error: any) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }
}