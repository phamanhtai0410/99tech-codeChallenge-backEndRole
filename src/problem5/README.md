# Problem 5 - Enterprise CRUD API with TypeORM

This module provides an enterprise-grade REST API with TypeORM and PostgreSQL, demonstrating advanced backend architecture patterns.

## Installation

```bash
yarn install
```

## Quick Setup

```bash
# Run setup script (Linux/Mac)
yarn setup
```

## Usage

```bash
# Start development server
yarn dev

# Start production server
yarn start

# Run tests
yarn test

# Database migrations
yarn migration:run
yarn migration:generate
yarn migration:revert

# Database setup (Docker)
yarn docker:db
```

## Features

- **TypeORM Integration**: Full ORM with PostgreSQL
- **Enterprise Patterns**: Repository pattern, singleton database manager
- **Advanced Features**: Pagination, filtering, bulk operations, statistics
- **Type Safety**: Full TypeScript integration with decorators
- **Production Ready**: Connection pooling, health monitoring, migrations
- **Comprehensive Testing**: Unit and integration tests

## API Endpoints

- `GET /api/resources` - List resources with pagination and filtering
- `GET /api/resources/:id` - Get specific resource
- `POST /api/resources` - Create new resource
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource
- `POST /api/resources/bulk` - Bulk create resources
- `GET /api/resources/statistics` - Resource statistics
- `GET /health` - Health check with database status

## Environment Setup

Copy `.env.example` to `.env` and configure:

```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=99tech_challenge
```

> **Security Note:** Using port 5433 instead of the default 5432 to avoid automated port scanners targeting standard PostgreSQL installations.

## Files Structure

```
problem5/
├── package.json          # Module dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── jest.config.json      # Testing configuration
├── .eslintrc.json       # Code linting rules
├── .env.example         # Environment template
├── server.ts            # Main server entry point
├── controllers/         # Request handlers
├── models/             # TypeORM entities
├── repositories/       # Data access layer
├── routes/             # API routes
├── database/           # Database connection and migrations
├── middleware/         # Express middleware
├── shared/             # Shared utilities and types
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
└── tests/              # Test files
```

## Documentation

See `TYPEORM_MIGRATION.md` for detailed migration guide and architecture explanation.