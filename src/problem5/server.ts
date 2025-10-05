/**
 * Problem 5: CRUD Server with Express.js and TypeORM
 * Main server entry point
 */

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { resourceRoutes } from './routes/resources';
import { errorHandler } from './middleware/errorHandler';
import { requestTracker, performanceMonitor, errorLogger } from './middleware/logging';
import { DatabaseManager } from './database/typeorm';
import { serverLogger, appLogger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Add logging middleware
app.use(requestTracker); // Track requests with unique IDs
app.use(performanceMonitor); // Monitor slow requests

// Routes
app.use('/api/resources', resourceRoutes);

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    const healthCheck = await dbManager.getHealthStatus();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: healthCheck
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'Service Unavailable', 
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Error handling middleware (must be last)
app.use(errorLogger); // Log errors before handling them
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize TypeORM database connection
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    serverLogger.info('Database connected successfully');

    app.listen(PORT, () => {
      serverLogger.info(`Server is running on port ${PORT}`, { port: PORT });
      appLogger.info(`Health check: http://localhost:${PORT}/health`);
      appLogger.info(`API endpoints: http://localhost:${PORT}/api/resources`);
      appLogger.info(`Statistics: http://localhost:${PORT}/api/resources/statistics`);
      appLogger.info(`Bulk operations: http://localhost:${PORT}/api/resources/bulk`);
    });
  } catch (error) {
    serverLogger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  serverLogger.info('Shutting down gracefully...');
  try {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.close();
    serverLogger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    serverLogger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
});

// Start the server
if (require.main === module) {
  startServer();
}

export { app };