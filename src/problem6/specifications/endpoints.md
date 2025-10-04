# API Endpoints Specification

## Authentication Endpoints

### POST /api/auth/login
**Description**: Authenticate user and receive JWT token

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": 123,
    "username": "user123",
    "currentScore": 1500
  }
}
```

### POST /api/auth/refresh
**Description**: Refresh expired JWT token

**Headers**: `Authorization: Bearer <refresh_token>`

**Response**:
```json
{
  "token": "new_jwt_token",
  "expiresIn": 3600
}
```

## Score Management

### GET /api/scoreboard
**Description**: Get top 10 users with highest scores

**Response**:
```json
{
  "topScores": [
    {
      "rank": 1,
      "userId": 123,
      "username": "player1",
      "score": 2500,
      "lastUpdated": "2023-10-03T12:00:00Z"
    }
  ],
  "totalUsers": 1500,
  "lastRefresh": "2023-10-03T12:00:00Z"
}
```

### GET /api/users/{userId}/score
**Description**: Get specific user's current score and rank

**Parameters**:
- `userId` (path): User ID

**Response**:
```json
{
  "userId": 123,
  "username": "player1",
  "currentScore": 1800,
  "rank": 15,
  "totalActions": 45,
  "lastAction": "2023-10-03T11:30:00Z"
}
```

## Action Management

### POST /api/actions/complete
**Description**: Complete an action and update user score

**Headers**: `Authorization: Bearer <jwt_token>`

**Request Body**:
```json
{
  "actionType": "puzzle_solved",
  "actionId": "puzzle_123",
  "metadata": {
    "difficulty": "hard",
    "timeTaken": 120
  }
}
```

**Response**:
```json
{
  "success": true,
  "scoreAdded": 150,
  "newTotalScore": 1950,
  "newRank": 12,
  "actionId": "action_456"
}
```

### GET /api/users/{userId}/actions
**Description**: Get user's action history

**Parameters**:
- `userId` (path): User ID
- `limit` (query, optional): Number of actions to return (default: 20)
- `offset` (query, optional): Pagination offset (default: 0)

**Response**:
```json
{
  "actions": [
    {
      "id": "action_456",
      "type": "puzzle_solved",
      "scoreEarned": 150,
      "timestamp": "2023-10-03T12:00:00Z",
      "metadata": {
        "difficulty": "hard",
        "timeTaken": 120
      }
    }
  ],
  "total": 45,
  "hasMore": true
}
```

## Real-time Events

### GET /api/events/stream
**Description**: Server-Sent Events endpoint for real-time updates

**Headers**: `Authorization: Bearer <jwt_token>`

**Events**:
```javascript
// Scoreboard update
event: scoreboard_update
data: {
  "topScores": [...],
  "timestamp": "2023-10-03T12:00:00Z"
}

// User rank change
event: rank_change
data: {
  "userId": 123,
  "oldRank": 15,
  "newRank": 12,
  "scoreChange": 150
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": {
    "code": "INVALID_ACTION",
    "message": "Action has already been completed",
    "timestamp": "2023-10-03T12:00:00Z",
    "requestId": "req_123456"
  }
}
```

### Common Error Codes

- `401 UNAUTHORIZED`: Invalid or expired token
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `429 RATE_LIMITED`: Too many requests
- `400 INVALID_REQUEST`: Invalid request format
- `500 INTERNAL_ERROR`: Server error

## Rate Limiting

- **Authentication**: 5 requests per minute per IP
- **Score Updates**: 10 requests per minute per user
- **Scoreboard**: 60 requests per minute per user
- **Actions**: 30 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1633363200
```