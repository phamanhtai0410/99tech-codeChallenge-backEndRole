# System Architecture & Flow

## High-Level Architecture

```mermaid
graph TB
    Client[Web Client] --> LB[Load Balancer]
    LB --> API1[API Server 1]
    LB --> API2[API Server 2]
    LB --> API3[API Server N]
    
    API1 --> Redis[(Redis Cache)]
    API2 --> Redis
    API3 --> Redis
    
    API1 --> DB[(PostgreSQL)]
    API2 --> DB
    API3 --> DB
    
    API1 --> WS[WebSocket Server]
    API2 --> WS
    API3 --> WS
    
    WS --> Client
    
    subgraph "Monitoring"
        Metrics[Prometheus]
        Logs[ELK Stack]
        Alerts[AlertManager]
    end
    
    API1 --> Metrics
    API2 --> Metrics
    API3 --> Metrics
```

## Action Completion Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant Auth as Auth Service
    participant DB as Database
    participant Cache as Redis Cache
    participant WS as WebSocket Server
    participant Board as Scoreboard

    C->>API: POST /api/actions/complete
    API->>Auth: Validate JWT Token
    Auth-->>API: Token Valid + User Info
    
    API->>DB: Verify Action Eligibility
    DB-->>API: Action Valid
    
    API->>DB: Record Action + Update Score
    DB-->>API: New Score & Rank
    
    API->>Cache: Update Cached User Score
    API->>Cache: Invalidate Scoreboard Cache
    
    API-->>C: Response with New Score
    
    API->>WS: Broadcast Score Update
    WS->>Board: Real-time Update
    
    opt If User Enters Top 10
        API->>WS: Broadcast Scoreboard Update
        WS->>Board: Update Top 10 Display
    end
```

## Real-time Communication Flow

```mermaid
graph LR
    subgraph "Client Side"
        WebApp[Web Application]
        WSClient[WebSocket Client]
        UI[UI Components]
    end
    
    subgraph "Server Side"
        WSServer[WebSocket Server]
        EventBus[Event Bus]
        ScoreService[Score Service]
    end
    
    subgraph "Data Layer"
        RedisPS[Redis Pub/Sub]
        Database[PostgreSQL]
    end
    
    WebApp --> WSClient
    WSClient <--> WSServer
    WSServer --> EventBus
    EventBus --> ScoreService
    ScoreService --> RedisPS
    ScoreService --> Database
    RedisPS --> WSServer
    WSServer --> UI
```

## Database Schema Design

```mermaid
erDiagram
    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        int current_score
        int rank
        datetime created_at
        datetime updated_at
    }
    
    ACTIONS {
        int id PK
        int user_id FK
        string action_type
        string action_identifier UK
        int score_earned
        json metadata
        datetime completed_at
        datetime created_at
    }
    
    ACTION_TYPES {
        int id PK
        string name UK
        string description
        int base_score
        json scoring_rules
        boolean is_active
    }
    
    SCOREBOARD_SNAPSHOTS {
        int id PK
        json top_scores
        datetime snapshot_time
        int total_users
    }
    
    USERS ||--o{ ACTIONS : completes
    ACTION_TYPES ||--o{ ACTIONS : defines
```

## Caching Strategy

```mermaid
graph TB
    Request[API Request] --> Cache{Cache Hit?}
    
    Cache -->|Yes| Return[Return Cached Data]
    Cache -->|No| DB[Query Database]
    
    DB --> Update[Update Cache]
    Update --> Return
    
    subgraph "Cache Layers"
        L1[User Scores - 5min TTL]
        L2[Scoreboard - 1min TTL]
        L3[Action Types - 1hr TTL]
    end
    
    subgraph "Cache Invalidation"
        ScoreUpdate[Score Update] --> InvalidateUser[Invalidate User Cache]
        ScoreUpdate --> InvalidateBoard[Invalidate Scoreboard]
        RankChange[Rank Change] --> InvalidateBoard
    end
```

## Scalability Considerations

### Horizontal Scaling
- **API Servers**: Stateless design allows easy horizontal scaling
- **Database**: Read replicas for improved performance
- **WebSocket Servers**: Sticky sessions or Redis adapter for Socket.IO

### Performance Optimizations
- **Connection Pooling**: Database connection pools per server instance
- **Query Optimization**: Indexed queries for scoreboard and user lookups
- **Batch Processing**: Bulk score updates for high-frequency events

### High Availability
- **Load Balancing**: Multiple API server instances
- **Database Clustering**: Master-slave PostgreSQL setup
- **Redis Clustering**: Redis Sentinel for cache high availability
- **Graceful Degradation**: Fallback to database queries if cache fails

## Security Architecture

```mermaid
graph TB
    Internet[Internet] --> WAF[Web Application Firewall]
    WAF --> LB[Load Balancer - HTTPS Only]
    LB --> API[API Gateway]
    
    API --> Auth[JWT Validation]
    Auth --> RateLimit[Rate Limiting]
    RateLimit --> Validation[Input Validation]
    Validation --> Business[Business Logic]
    
    subgraph "Security Layers"
        HTTPS[HTTPS/TLS 1.3]
        JWT[JWT Authentication]
        CORS[CORS Configuration]
        Helmet[Security Headers]
        Validation2[Input Sanitization]
    end
```