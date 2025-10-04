/**
 * Resource controller
 */

import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/connection';
import { Resource, CreateResourceRequest, UpdateResourceRequest, ResourceFilters } from '../models/resource';

export class ResourceController {
  async getAllResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDatabase();
      const filters: ResourceFilters = req.query;
      
      let sql = 'SELECT * FROM resources WHERE 1=1';
      const params: any[] = [];

      if (filters.type) {
        sql += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.name) {
        sql += ' AND name LIKE ?';
        params.push(`%${filters.name}%`);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit.toString()));
      }

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(filters.offset.toString()));
      }

      const resources = await db.all(sql, params);
      res.json(resources);
    } catch (error) {
      next(error);
    }
  }

  async getResourceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const resource = await db.get('SELECT * FROM resources WHERE id = ?', [id]);
      
      if (!resource) {
        const error = new Error('Resource not found') as any;
        error.statusCode = 404;
        throw error;
      }

      res.json(resource);
    } catch (error) {
      next(error);
    }
  }

  async createResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDatabase();
      const { name, description, type }: CreateResourceRequest = req.body;

      if (!name || !type) {
        const error = new Error('Name and type are required') as any;
        error.statusCode = 400;
        throw error;
      }

      const result = await db.run(
        'INSERT INTO resources (name, description, type) VALUES (?, ?, ?)',
        [name, description, type]
      );

      const newResource = await db.get('SELECT * FROM resources WHERE id = ?', [result.lastID]);
      res.status(201).json(newResource);
    } catch (error) {
      next(error);
    }
  }

  async updateResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const updates: UpdateResourceRequest = req.body;

      // Check if resource exists
      const existingResource = await db.get('SELECT * FROM resources WHERE id = ?', [id]);
      if (!existingResource) {
        const error = new Error('Resource not found') as any;
        error.statusCode = 404;
        throw error;
      }

      const updateFields: string[] = [];
      const params: any[] = [];

      if (updates.name) {
        updateFields.push('name = ?');
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        params.push(updates.description);
      }

      if (updates.type) {
        updateFields.push('type = ?');
        params.push(updates.type);
      }

      if (updateFields.length === 0) {
        const error = new Error('No valid fields to update') as any;
        error.statusCode = 400;
        throw error;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await db.run(
        `UPDATE resources SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      const updatedResource = await db.get('SELECT * FROM resources WHERE id = ?', [id]);
      res.json(updatedResource);
    } catch (error) {
      next(error);
    }
  }

  async deleteResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDatabase();
      const { id } = req.params;

      // Check if resource exists
      const existingResource = await db.get('SELECT * FROM resources WHERE id = ?', [id]);
      if (!existingResource) {
        const error = new Error('Resource not found') as any;
        error.statusCode = 404;
        throw error;
      }

      await db.run('DELETE FROM resources WHERE id = ?', [id]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}