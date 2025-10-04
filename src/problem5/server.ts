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
import { DatabaseManager } from './database/typeorm';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

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
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize TypeORM database connection
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoints: http://localhost:${PORT}/api/resources`);
      console.log(`📈 Statistics: http://localhost:${PORT}/api/resources/statistics`);
      console.log(`📚 Bulk operations: http://localhost:${PORT}/api/resources/bulk`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
if (require.main === module) {
  startServer();
}

export { app };