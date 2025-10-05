# Real-time Communication Specification

## Overview

This document details the real-time communication architecture for the live scoreboard system, including WebSocket implementation, event handling, and connection management strategies.

## WebSocket Implementation

### Connection Architecture

```typescript
// WebSocket Server Configuration
interface WebSocketConfig {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  transports: ['websocket', 'polling'];
  pingTimeout: number;
  pingInterval: number;
}

// Socket.IO Server Setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});
```

### Event Types & Data Structures

```typescript
// Client-to-Server Events
interface ClientEvents {
  'subscribe_scoreboard': () => void;
  'subscribe_user_score': (userId: string) => void;
  'unsubscribe_scoreboard': () => void;
  'ping': () => void;
}

// Server-to-Client Events
interface ServerEvents {
  'scoreboard_update': (data: ScoreboardUpdate) => void;
  'user_score_update': (data: UserScoreUpdate) => void;
  'leaderboard_refresh': (data: LeaderboardData) => void;
  'system_notification': (data: SystemNotification) => void;
  'pong': () => void;
}

// Data Structures
interface ScoreboardUpdate {
  type: 'SCORE_UPDATE' | 'RANK_CHANGE' | 'NEW_LEADER';
  userId: string;
  newScore: number;
  newRank?: number;
  oldRank?: number;
  timestamp: string;
}

interface UserScoreUpdate {
  userId: string;
  score: number;
  rank: number;
  actionType: string;
  scoreIncrease: number;
  timestamp: string;
}

interface LeaderboardData {
  topScores: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
    avatar?: string;
  }>;
  totalUsers: number;
  lastUpdated: string;
}

interface SystemNotification {
  type: 'MAINTENANCE' | 'ACHIEVEMENT' | 'SYSTEM_ALERT';
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  duration?: number;
}
```

## Connection Management

### Authentication & Authorization

```typescript
// WebSocket Middleware for Authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

### Connection Lifecycle

```typescript
io.on('connection', (socket) => {
  console.log(`User ${socket.username} connected: ${socket.id}`);
  
  // Join user-specific room
  socket.join(`user:${socket.userId}`);
  
  // Handle scoreboard subscription
  socket.on('subscribe_scoreboard', async () => {
    socket.join('scoreboard');
    
    // Send initial scoreboard data
    const initialData = await getTopScores(10);
    socket.emit('leaderboard_refresh', initialData);
  });
  
  // Handle user score subscription
  socket.on('subscribe_user_score', async (userId) => {
    if (socket.userId === userId) {
      socket.join(`score:${userId}`);
      
      // Send current user score
      const userScore = await getUserScore(userId);
      socket.emit('user_score_update', userScore);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.username} disconnected: ${reason}`);
    // Cleanup subscriptions automatically handled by Socket.IO
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.username}:`, error);
  });
});
```

## Event Broadcasting Strategy

### Score Update Broadcasting

```typescript
class ScoreUpdateBroadcaster {
  constructor(private io: Server, private redis: Redis) {}
  
  async broadcastScoreUpdate(userId: string, scoreData: UserScoreUpdate) {
    // Broadcast to user's personal channel
    this.io.to(`user:${userId}`).emit('user_score_update', scoreData);
    
    // Check if this affects the leaderboard
    const isTopScore = await this.checkIfTopScore(scoreData.score);
    
    if (isTopScore) {
      const updatedLeaderboard = await this.getUpdatedLeaderboard();
      this.io.to('scoreboard').emit('leaderboard_refresh', updatedLeaderboard);
    }
    
    // Broadcast rank changes to affected users
    await this.broadcastRankChanges(scoreData);
  }
  
  private async checkIfTopScore(score: number): Promise<boolean> {
    const topScores = await this.redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');
    const lowestTopScore = topScores.length >= 20 ? parseInt(topScores[19]) : 0;
    return score > lowestTopScore;
  }
  
  private async broadcastRankChanges(scoreData: UserScoreUpdate) {
    // Get users whose ranks were affected by this score update
    const affectedUsers = await this.getAffectedUsers(scoreData);
    
    for (const user of affectedUsers) {
      this.io.to(`user:${user.id}`).emit('user_score_update', {
        userId: user.id,
        score: user.score,
        rank: user.newRank,
        actionType: 'RANK_CHANGE',
        scoreIncrease: 0,
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

## Client-Side Implementation

### WebSocket Client Manager

```typescript
class ScoreboardWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor(
    private token: string,
    private onScoreboardUpdate: (data: LeaderboardData) => void,
    private onUserScoreUpdate: (data: UserScoreUpdate) => void,
    private onSystemNotification: (data: SystemNotification) => void
  ) {}
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(process.env.REACT_APP_WS_URL!, {
        auth: { token: this.token },
        transports: ['websocket', 'polling'],
        timeout: 20000
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to scoreboard websocket');
        this.reconnectAttempts = 0;
        resolve();
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from websocket:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, reconnect manually
          this.handleReconnection();
        }
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
      
      // Event listeners
      this.socket.on('leaderboard_refresh', this.onScoreboardUpdate);
      this.socket.on('user_score_update', this.onUserScoreUpdate);
      this.socket.on('system_notification', this.onSystemNotification);
    });
  }
  
  subscribeToScoreboard(): void {
    this.socket?.emit('subscribe_scoreboard');
  }
  
  subscribeToUserScore(userId: string): void {
    this.socket?.emit('subscribe_user_score', userId);
  }
  
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect().catch(() => this.handleReconnection());
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }
  
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
```

### React Hook for Real-time Updates

```typescript
// Custom React hook for scoreboard updates
export const useScoreboard = (token: string) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [userScore, setUserScore] = useState<UserScoreUpdate | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const wsRef = useRef<ScoreboardWebSocket | null>(null);
  
  useEffect(() => {
    if (!token) return;
    
    setConnectionStatus('connecting');
    
    wsRef.current = new ScoreboardWebSocket(
      token,
      (data) => setLeaderboard(data),
      (data) => setUserScore(data),
      (data) => setNotifications(prev => [...prev, data])
    );
    
    wsRef.current.connect()
      .then(() => {
        setConnectionStatus('connected');
        wsRef.current?.subscribeToScoreboard();
      })
      .catch(() => setConnectionStatus('disconnected'));
    
    return () => {
      wsRef.current?.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [token]);
  
  return {
    leaderboard,
    userScore,
    notifications,
    connectionStatus,
    subscribeToUserScore: (userId: string) => wsRef.current?.subscribeToUserScore(userId)
  };
};
```

## Performance Optimizations

### Message Batching

```typescript
class MessageBatcher {
  private batchQueue: Map<string, any[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 100; // ms
  
  addMessage(channel: string, message: any): void {
    if (!this.batchQueue.has(channel)) {
      this.batchQueue.set(channel, []);
    }
    
    this.batchQueue.get(channel)!.push(message);
    
    if (this.batchQueue.get(channel)!.length >= this.BATCH_SIZE) {
      this.flushBatch(channel);
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushAllBatches(), this.BATCH_DELAY);
    }
  }
  
  private flushBatch(channel: string): void {
    const messages = this.batchQueue.get(channel);
    if (messages && messages.length > 0) {
      this.io.to(channel).emit('batch_update', messages);
      this.batchQueue.set(channel, []);
    }
  }
  
  private flushAllBatches(): void {
    for (const channel of this.batchQueue.keys()) {
      this.flushBatch(channel);
    }
    this.batchTimeout = null;
  }
}
```

### Connection Scaling

```typescript
// Redis Adapter for multi-server deployment
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Sticky sessions for load balancing
app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'] || req.session.id;
  req.headers['x-forwarded-server'] = hashFunction(sessionId) % serverCount;
  next();
});
```

## Error Handling & Resilience

### Connection Recovery

```typescript
class ConnectionManager {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      io.emit('ping');
      
      // Check for inactive connections
      const now = Date.now();
      io.sockets.sockets.forEach((socket) => {
        if (now - socket.lastPingTime > 60000) {
          console.log(`Disconnecting inactive socket: ${socket.id}`);
          socket.disconnect(true);
        }
      });
    }, 30000);
  }
  
  handleServerRestart(): void {
    // Graceful shutdown notification
    io.emit('system_notification', {
      type: 'MAINTENANCE',
      message: 'Server maintenance starting in 30 seconds',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      duration: 30000
    });
    
    setTimeout(() => {
      io.disconnectSockets(true);
    }, 30000);
  }
}
```

## Security Considerations

### Rate Limiting

```typescript
const connectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 connections per windowMs
  message: 'Too many connection attempts from this IP'
});

const eventLimiter = new Map<string, number>();

io.use((socket, next) => {
  const userId = socket.userId;
  const now = Date.now();
  const userEvents = eventLimiter.get(userId) || 0;
  
  if (userEvents > 60) { // 60 events per minute
    return next(new Error('Rate limit exceeded'));
  }
  
  eventLimiter.set(userId, userEvents + 1);
  setTimeout(() => {
    eventLimiter.delete(userId);
  }, 60000);
  
  next();
});
```

### Message Validation

```typescript
const messageSchema = {
  subscribe_scoreboard: Joi.object({}),
  subscribe_user_score: Joi.object({
    userId: Joi.string().uuid().required()
  }),
  ping: Joi.object({})
};

io.on('connection', (socket) => {
  Object.keys(messageSchema).forEach(event => {
    socket.on(event, (data) => {
      const { error } = messageSchema[event].validate(data);
      if (error) {
        socket.emit('error', { message: 'Invalid message format' });
        return;
      }
      // Process valid message
    });
  });
});
```

## Testing Strategy

### Unit Tests for WebSocket Events

```typescript
describe('WebSocket Events', () => {
  let server: Server;
  let clientSocket: Socket;
  
  beforeEach(async () => {
    server = new Server(httpServer);
    clientSocket = Client(`http://localhost:${port}`);
    await new Promise(resolve => clientSocket.on('connect', resolve));
  });
  
  test('should broadcast scoreboard updates', (done) => {
    clientSocket.emit('subscribe_scoreboard');
    
    server.emit('scoreboard_update', mockScoreboardData);
    
    clientSocket.on('leaderboard_refresh', (data) => {
      expect(data.topScores).toHaveLength(10);
      done();
    });
  });
  
  test('should handle user score updates', (done) => {
    const userId = 'test-user-123';
    clientSocket.emit('subscribe_user_score', userId);
    
    server.to(`user:${userId}`).emit('user_score_update', mockUserScore);
    
    clientSocket.on('user_score_update', (data) => {
      expect(data.userId).toBe(userId);
      expect(data.score).toBeGreaterThan(0);
      done();
    });
  });
});
```

### Load Testing

```typescript
// Artillery.js load test configuration
module.exports = {
  config: {
    target: 'ws://localhost:3001',
    phases: [
      { duration: 60, arrivalRate: 10 }, // Ramp up
      { duration: 300, arrivalRate: 50 }, // Sustained load
      { duration: 60, arrivalRate: 100 } // Peak load
    ],
    socketio: {
      query: {
        token: '{{ $randomString() }}'
      }
    }
  },
  scenarios: [
    {
      name: 'Subscribe to scoreboard',
      weight: 80,
      engine: 'socketio',
      flow: [
        { emit: { channel: 'subscribe_scoreboard' } },
        { think: 5 },
        { emit: { channel: 'subscribe_user_score', data: { userId: '{{ $randomUUID() }}' } } }
      ]
    }
  ]
};
```

This real-time communication specification provides a comprehensive foundation for implementing WebSocket-based live updates in your scoreboard system, covering all aspects from basic connection handling to advanced scaling and security considerations.