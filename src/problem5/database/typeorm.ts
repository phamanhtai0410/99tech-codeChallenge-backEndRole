/**
 * TypeORM Database Configuration and Connection Manager
 * Enterprise-grade database setup with PostgreSQL
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { Resource } from '../models/resource';

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl?: boolean;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || '99tech_challenge',
    synchronize: process.env.NODE_ENV !== 'production', // Only sync in development
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production',
    retryAttempts: 3,
    retryDelay: 3000
  };
}

/**
 * Create TypeORM DataSource configuration
 */
function createDataSourceOptions(): DataSourceOptions {
  const config = getDatabaseConfig();
  
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    synchronize: config.synchronize,
    logging: config.logging,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    entities: [Resource],
    migrations: ['src/problem5/database/migrations/*.ts'],
    subscribers: ['src/problem5/subscribers/*.ts'],
    
    // Connection pool settings for production
    extra: {
      connectionLimit: 20,
      acquireTimeout: 30000,
      timeout: 30000,
      reconnect: true,
    }
  };
}

// Create the DataSource instance
export const AppDataSource = new DataSource(createDataSourceOptions());

/**
 * Database connection manager
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private dataSource: DataSource;
  private isConnected: boolean = false;

  private constructor() {
    this.dataSource = AppDataSource;
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.dataSource.initialize();
        this.isConnected = true;
        console.log('✅ Database connection established successfully');
        
        // Log connection details in development
        if (process.env.NODE_ENV === 'development') {
          const pgOptions = this.dataSource.options as any;
          console.log(`📊 Connected to PostgreSQL at ${pgOptions.host}:${pgOptions.port}`);
          console.log(`🗄️  Database: ${pgOptions.database}`);
        }
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Get the DataSource instance
   */
  getDataSource(): DataSource {
    if (!this.isConnected) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.isConnected) {
      await this.dataSource.destroy();
      this.isConnected = false;
      console.log('🔒 Database connection closed');
    }
  }

  /**
   * Check if database is connected
   */
  isReady(): boolean {
    return this.isConnected && this.dataSource.isInitialized;
  }

  /**
   * Get connection health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      database: string;
      host: string;
      port: number;
      entities: number;
    }
  }> {
    try {
      const isHealthy = this.isReady();
      const pgOptions = this.dataSource.options as any;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          connected: this.isConnected,
          database: pgOptions.database || 'unknown',
          host: pgOptions.host || 'unknown',
          port: pgOptions.port || 0,
          entities: this.dataSource.entityMetadatas.length
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          database: 'unknown',
          host: 'unknown',
          port: 0,
          entities: 0
        }
      };
    }
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Export the DataSource for direct access when needed
export { AppDataSource as dataSource };