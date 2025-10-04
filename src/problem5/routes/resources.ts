/**
 * Resource routes
 */

import { Router } from 'express';
import { ResourceController } from '../controllers/resourceController';

const router = Router();
const resourceController = new ResourceController();

// GET /api/resources - List all resources with optional filters and pagination
router.get('/', resourceController.getAllResources.bind(resourceController));

// GET /api/resources/statistics - Get resource statistics
router.get('/statistics', resourceController.getResourceStatistics.bind(resourceController));

// GET /api/resources/:id - Get a specific resource
router.get('/:id', resourceController.getResourceById.bind(resourceController));

// POST /api/resources - Create a new resource
router.post('/', resourceController.createResource.bind(resourceController));

// POST /api/resources/bulk - Create multiple resources
router.post('/bulk', resourceController.bulkCreateResources.bind(resourceController));

// PUT /api/resources/:id - Update a resource
router.put('/:id', resourceController.updateResource.bind(resourceController));

// DELETE /api/resources/:id - Delete a resource
router.delete('/:id', resourceController.deleteResource.bind(resourceController));

export { router as resourceRoutes };