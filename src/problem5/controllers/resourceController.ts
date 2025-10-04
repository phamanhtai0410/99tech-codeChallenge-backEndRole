/**
 * Resource controller with TypeORM
 */

import { Request, Response, NextFunction } from 'express';
import { ResourceRepository, ResourceFilters } from '../repositories/resourceRepository';
import { CreateResourceRequest, UpdateResourceRequest, ResourceResponse, ResourceType, ResourceStatus } from '../models/resource';

/**
 * Enterprise-grade Resource Controller
 * Implements RESTful API with comprehensive error handling and validation
 */
export class ResourceController {
  private resourceRepository: ResourceRepository;

  constructor() {
    this.resourceRepository = new ResourceRepository();
  }

  /**
   * GET /resources - Retrieve all resources with filtering and pagination
   */
  async getAllResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        type,
        minValue,
        maxValue,
        createdAfter,
        createdBefore,
        page = '1',
        limit = '20'
      } = req.query;

      // Build filters from query parameters
      const filters: ResourceFilters = {};
      
      if (status && Object.values(ResourceStatus).includes(status as ResourceStatus)) {
        filters.status = status as ResourceStatus;
      }
      
      if (type && Object.values(ResourceType).includes(type as ResourceType)) {
        filters.type = type as ResourceType;
      }
      
      if (minValue && !isNaN(Number(minValue))) {
        filters.minValue = Number(minValue);
      }
      
      if (maxValue && !isNaN(Number(maxValue))) {
        filters.maxValue = Number(maxValue);
      }
      
      if (createdAfter) {
        const date = new Date(createdAfter as string);
        if (!isNaN(date.getTime())) {
          filters.createdAfter = date;
        }
      }
      
      if (createdBefore) {
        const date = new Date(createdBefore as string);
        if (!isNaN(date.getTime())) {
          filters.createdBefore = date;
        }
      }

      // Parse pagination parameters
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

      const result = await this.resourceRepository.findAll(filters, pageNum, limitNum);

      // Transform to response format
      const response = {
        data: result.resources.map(resource => this.toResourceResponse(resource)),
        pagination: {
          page: result.page,
          limit: limitNum,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /resources/:id - Retrieve a specific resource by ID
   */
  async getResourceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'Resource ID is required' });
        return;
      }

      const resourceId = parseInt(id, 10);
      if (isNaN(resourceId)) {
        res.status(400).json({ error: 'Invalid resource ID format' });
        return;
      }

      const resource = await this.resourceRepository.findById(resourceId);
      
      if (!resource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      res.json({ data: this.toResourceResponse(resource) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /resources - Create a new resource
   */
  async createResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createData: CreateResourceRequest = req.body;

      // Additional validation
      if (!createData.name?.trim()) {
        res.status(400).json({ error: 'Resource name is required' });
        return;
      }

      if (typeof createData.value !== 'number' || createData.value < 0) {
        res.status(400).json({ error: 'Resource value must be a non-negative number' });
        return;
      }

      const resource = await this.resourceRepository.create({
        name: createData.name.trim(),
        value: createData.value,
        status: createData.status || ResourceStatus.ACTIVE,
        type: createData.type || ResourceType.OTHER
      });

      res.status(201).json({ 
        message: 'Resource created successfully',
        data: this.toResourceResponse(resource) 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /resources/:id - Update an existing resource
   */
  async updateResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateResourceRequest = req.body;

      if (!id) {
        res.status(400).json({ error: 'Resource ID is required' });
        return;
      }

      const resourceId = parseInt(id, 10);
      if (isNaN(resourceId)) {
        res.status(400).json({ error: 'Invalid resource ID format' });
        return;
      }

      // Validate update data
      if (updateData.name !== undefined && !updateData.name.trim()) {
        res.status(400).json({ error: 'Resource name cannot be empty' });
        return;
      }

      if (updateData.value !== undefined && (typeof updateData.value !== 'number' || updateData.value < 0)) {
        res.status(400).json({ error: 'Resource value must be a non-negative number' });
        return;
      }

      const updatedResource = await this.resourceRepository.update(resourceId, updateData);
      
      if (!updatedResource) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      res.json({ 
        message: 'Resource updated successfully',
        data: this.toResourceResponse(updatedResource) 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /resources/:id - Delete a resource
   */
  async deleteResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Resource ID is required' });
        return;
      }

      const resourceId = parseInt(id, 10);
      if (isNaN(resourceId)) {
        res.status(400).json({ error: 'Invalid resource ID format' });
        return;
      }

      const deleted = await this.resourceRepository.delete(resourceId);
      
      if (!deleted) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /resources/bulk - Create multiple resources
   */
  async bulkCreateResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resources } = req.body;

      if (!Array.isArray(resources) || resources.length === 0) {
        res.status(400).json({ error: 'Resources array is required and cannot be empty' });
        return;
      }

      // Validate each resource
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        if (!resource.name?.trim()) {
          res.status(400).json({ error: `Resource at index ${i} must have a valid name` });
          return;
        }
        if (typeof resource.value !== 'number' || resource.value < 0) {
          res.status(400).json({ error: `Resource at index ${i} must have a valid non-negative value` });
          return;
        }
      }

      const createData = resources.map(resource => ({
        name: resource.name.trim(),
        value: resource.value,
        status: resource.status || ResourceStatus.ACTIVE,
        type: resource.type || ResourceType.OTHER
      }));

      const createdResources = await this.resourceRepository.bulkCreate(createData);

      res.status(201).json({
        message: `Successfully created ${createdResources.length} resources`,
        data: createdResources.map(resource => this.toResourceResponse(resource))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /resources/statistics - Get resource statistics
   */
  async getResourceStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await this.resourceRepository.getStatistics();
      res.json({ data: statistics });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transform Resource entity to API response format
   */
  private toResourceResponse(resource: any): ResourceResponse {
    return {
      id: resource.id,
      name: resource.name,
      description: resource.description,
      type: resource.type,
      status: resource.status,
      value: parseFloat(resource.value),
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      metadata: resource.metadata,
      age: resource.age
    };
  }
}