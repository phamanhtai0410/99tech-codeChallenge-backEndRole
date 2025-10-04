# Problem 5: CRUD Server

## Overview

A RESTful API server built with Express.js and TypeScript that provides CRUD (Create, Read, Update, Delete) operations for resources. The server includes data persistence with SQLite database, input validation, error handling, and basic filtering capabilities.

## Features

- ✅ **Full CRUD Operations**: Create, Read, Update, Delete resources
- ✅ **Data Persistence**: SQLite database with automatic initialization
- ✅ **Input Validation**: Request validation and sanitization
- ✅ **Error Handling**: Centralized error handling with proper HTTP status codes
- ✅ **Filtering**: Basic filtering by resource type and name
- ✅ **Pagination**: Limit and offset support
- ✅ **Security**: Helmet.js for security headers, CORS enabled
- ✅ **TypeScript**: Full TypeScript support with proper types

## Project Structure

```
src/problem5/
├── server.ts              # Main Express server
├── routes/
│   └── resources.ts       # API routes definition
├── controllers/
│   └── resourceController.ts  # Business logic
├── models/
│   └── resource.ts        # Data models and interfaces
├── database/
│   └── connection.ts      # SQLite database setup
├── middleware/
│   ├── errorHandler.ts    # Error handling middleware
│   └── validation.ts      # Request validation
├── tests/
│   └── api.test.ts        # API integration tests
└── README.md             # This file
```

## API Endpoints

### Base URL
```
http://localhost:3000/api/resources
```

### Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/api/resources` | List all resources with optional filters | - |
| GET | `/api/resources/:id` | Get a specific resource | - |
| POST | `/api/resources` | Create a new resource | `{ name, description, type }` |
| PUT | `/api/resources/:id` | Update a resource | `{ name?, description?, type? }` |
| DELETE | `/api/resources/:id` | Delete a resource | - |

### Query Parameters (GET /api/resources)

- `type` - Filter by resource type
- `name` - Filter by resource name (partial match)
- `limit` - Limit number of results (default: no limit)
- `offset` - Pagination offset (default: 0)

## Data Model

### Resource Schema

```typescript
interface Resource {
  id: number;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}
```

### Database Schema

```sql
CREATE TABLE resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Setup and Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

### Running the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
```

## API Usage Examples

### Create a Resource
```bash
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Resource",
    "description": "This is a sample resource",
    "type": "document"
  }'
```

### Get All Resources
```bash
curl http://localhost:3000/api/resources
```

### Get Resources with Filters
```bash
curl "http://localhost:3000/api/resources?type=document&limit=10"
```

### Get Specific Resource
```bash
curl http://localhost:3000/api/resources/1
```

### Update a Resource
```bash
curl -X PUT http://localhost:3000/api/resources/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Resource Name",
    "description": "Updated description"
  }'
```

### Delete a Resource
```bash
curl -X DELETE http://localhost:3000/api/resources/1
```

## Response Format

### Success Response
```json
{
  "id": 1,
  "name": "Sample Resource",
  "description": "This is a sample resource",
  "type": "document",
  "created_at": "2023-10-03T12:00:00Z",
  "updated_at": "2023-10-03T12:00:00Z"
}
```

### Error Response
```json
{
  "error": {
    "message": "Resource not found",
    "statusCode": 404,
    "timestamp": "2023-10-03T12:00:00Z"
  }
}
```

## Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Configuration

### Database
- SQLite database file: `database.db`
- Test environment uses in-memory database
- Database is automatically initialized on server start

### Security
- Helmet.js for security headers
- CORS enabled for all origins
- Input validation on all endpoints

### Error Handling
- Centralized error handling middleware
- Proper HTTP status codes
- Structured error responses
- Request ID tracking for debugging

## Architecture Decisions

### MVC Pattern
- **Models**: Data structures and interfaces
- **Views**: JSON API responses
- **Controllers**: Business logic and request handling

### Database Choice
- SQLite for simplicity and zero-configuration
- Easy to deploy and test
- Suitable for development and small-scale production

### Error Handling Strategy
- Custom error classes with status codes
- Centralized error middleware
- Consistent error response format

### Validation Approach
- TypeScript interfaces for compile-time checking
- Runtime validation in controllers
- Sanitization of user inputs

## Performance Considerations

- Connection pooling for database connections
- Proper indexing on frequently queried columns
- Pagination support to handle large datasets
- Efficient SQL queries with proper WHERE clauses

## Future Enhancements

- [ ] Authentication and authorization
- [ ] Request rate limiting
- [ ] Advanced filtering and sorting
- [ ] Full-text search capabilities
- [ ] Database migrations system
- [ ] API documentation with Swagger
- [ ] Caching layer (Redis)
- [ ] Logging and monitoring
- [ ] Database connection pooling
- [ ] Input validation with Joi or similar