# Database Design & API Structure

## Overview

This document outlines the comprehensive database schema design and API data structures for the live scoreboard system, optimized for performance, scalability, and data integrity.

## Database Schema Design

### Core Tables

```sql
-- Users table with optimized indexing for leaderboard queries
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Score fields (denormalized for performance)
    current_score INTEGER DEFAULT 0 NOT NULL,
    total_score INTEGER DEFAULT 0 NOT NULL, -- Lifetime score including resets
    current_rank INTEGER,
    
    -- Profile information
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    
    -- Account status
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    
    -- Role and permissions
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_score_update_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT users_username_length CHECK (length(username) >= 3),
    CONSTRAINT users_score_positive CHECK (current_score >= 0),
    CONSTRAINT users_role_valid CHECK (role IN ('admin', 'moderator', 'user', 'guest'))
);

-- Indexes for optimal query performance
CREATE INDEX idx_users_current_score_desc ON users(current_score DESC) WHERE is_active = true AND is_deleted = false;
CREATE INDEX idx_users_username_lower ON users(LOWER(username));
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at);
CREATE INDEX idx_users_role ON users(role);

-- Unique partial index for active usernames (case-insensitive)
CREATE UNIQUE INDEX idx_users_username_active ON users(LOWER(username)) 
WHERE is_active = true AND is_deleted = false;
```

```sql
-- Action types definition table
CREATE TABLE action_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Scoring configuration
    base_score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER,
    scoring_formula JSONB, -- Complex scoring rules
    
    -- Rate limiting
    max_completions_per_day INTEGER,
    max_completions_per_hour INTEGER,
    cooldown_minutes INTEGER DEFAULT 0,
    
    -- Validation rules
    requires_verification BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_repeatable BOOLEAN DEFAULT true NOT NULL,
    
    -- Metadata
    category VARCHAR(50),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for action types
CREATE INDEX idx_action_types_active ON action_types(is_active);
CREATE INDEX idx_action_types_category ON action_types(category);
CREATE INDEX idx_action_types_difficulty ON action_types(difficulty_level);
```

```sql
-- User actions table (partitioned by date for performance)
CREATE TABLE user_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type_id INTEGER NOT NULL REFERENCES action_types(id),
    
    -- Action identification
    action_identifier VARCHAR(255) NOT NULL, -- Unique per action type
    external_reference VARCHAR(255), -- Reference to external system
    
    -- Scoring
    score_earned INTEGER NOT NULL DEFAULT 0,
    score_multiplier DECIMAL(3,2) DEFAULT 1.00,
    bonus_score INTEGER DEFAULT 0,
    
    -- Verification
    verification_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    client_metadata JSONB DEFAULT '{}'::jsonb, -- Client-side data
    
    -- Timestamps
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT user_actions_score_valid CHECK (score_earned >= 0),
    CONSTRAINT user_actions_verification_status_valid 
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
    
    -- Unique constraint to prevent duplicate actions
    UNIQUE(user_id, action_type_id, action_identifier)
) PARTITION BY RANGE (completed_at);

-- Create monthly partitions for the last 12 months and next 3 months
-- This would be automated in production
CREATE TABLE user_actions_2024_10 PARTITION OF user_actions
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE user_actions_2024_11 PARTITION OF user_actions
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
-- ... additional partitions

-- Indexes for user_actions
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id, completed_at DESC);
CREATE INDEX idx_user_actions_type ON user_actions(action_type_id, completed_at DESC);
CREATE INDEX idx_user_actions_verification ON user_actions(verification_status, completed_at DESC);
CREATE INDEX idx_user_actions_score ON user_actions(score_earned DESC, completed_at DESC);
CREATE INDEX idx_user_actions_metadata ON user_actions USING GIN(metadata);
```

```sql
-- Scoreboard snapshots for historical tracking and caching
CREATE TABLE scoreboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type VARCHAR(20) NOT NULL, -- 'realtime', 'hourly', 'daily', 'weekly'
    
    -- Snapshot data
    top_scores JSONB NOT NULL, -- Array of top user scores
    total_users INTEGER NOT NULL,
    total_active_users INTEGER NOT NULL,
    average_score DECIMAL(10,2),
    median_score INTEGER,
    
    -- Metadata
    snapshot_criteria JSONB DEFAULT '{}'::jsonb,
    generation_duration_ms INTEGER,
    
    -- Timestamps
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT scoreboard_snapshot_type_valid 
        CHECK (snapshot_type IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly'))
);

-- Indexes for scoreboard snapshots
CREATE INDEX idx_scoreboard_snapshots_type_time ON scoreboard_snapshots(snapshot_type, snapshot_time DESC);
CREATE INDEX idx_scoreboard_snapshots_expires ON scoreboard_snapshots(expires_at) WHERE expires_at IS NOT NULL;
```

### Audit and Security Tables

```sql
-- Security events for comprehensive audit trail
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    
    -- User context
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    
    -- Event details
    event_details JSONB DEFAULT '{}'::jsonb,
    severity VARCHAR(20) NOT NULL DEFAULT 'low',
    
    -- Status
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT security_events_severity_valid 
        CHECK (severity IN ('low', 'medium', 'high', 'critical'))
) PARTITION BY RANGE (occurred_at);

-- Create monthly partitions for security events
CREATE TABLE security_events_2024_10 PARTITION OF security_events
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

-- Indexes for security events
CREATE INDEX idx_security_events_user ON security_events(user_id, occurred_at DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type, occurred_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, occurred_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip_address, occurred_at DESC);
CREATE INDEX idx_security_events_unresolved ON security_events(resolved, occurred_at DESC) WHERE resolved = false;
```

```sql
-- User sessions for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session data
    session_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    
    -- Device information
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    
    -- Session status
    is_active BOOLEAN DEFAULT true NOT NULL,
    revoked_reason VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for user sessions
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_user_sessions_cleanup ON user_sessions(expires_at, is_active) WHERE expires_at < NOW();
```

### Performance and Analytics Tables

```sql
-- User statistics for analytics and performance tracking
CREATE TABLE user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score statistics
    total_actions_completed INTEGER DEFAULT 0 NOT NULL,
    total_score_earned INTEGER DEFAULT 0 NOT NULL,
    highest_single_score INTEGER DEFAULT 0 NOT NULL,
    average_score_per_action DECIMAL(6,2) DEFAULT 0,
    
    -- Activity statistics
    total_login_count INTEGER DEFAULT 0 NOT NULL,
    consecutive_days_active INTEGER DEFAULT 0 NOT NULL,
    longest_streak_days INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    
    -- Performance metrics
    actions_per_day_average DECIMAL(6,2) DEFAULT 0,
    peak_score_date DATE,
    first_action_date DATE,
    
    -- Ranking history
    best_rank_achieved INTEGER,
    best_rank_date DATE,
    rank_improvement_30d INTEGER DEFAULT 0,
    
    -- Calculated at
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT user_statistics_positive_values CHECK (
        total_actions_completed >= 0 AND 
        total_score_earned >= 0 AND 
        highest_single_score >= 0
    )
);

-- Indexes for user statistics
CREATE INDEX idx_user_statistics_total_score ON user_statistics(total_score_earned DESC);
CREATE INDEX idx_user_statistics_best_rank ON user_statistics(best_rank_achieved ASC);
CREATE INDEX idx_user_statistics_streak ON user_statistics(longest_streak_days DESC);
```

### Views for Common Queries

```sql
-- Materialized view for real-time leaderboard
CREATE MATERIALIZED VIEW leaderboard_realtime AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.current_score,
    ROW_NUMBER() OVER (ORDER BY u.current_score DESC, u.last_score_update_at ASC) as rank,
    u.last_score_update_at,
    COALESCE(us.total_actions_completed, 0) as total_actions
FROM users u
LEFT JOIN user_statistics us ON u.id = us.user_id
WHERE u.is_active = true 
  AND u.is_deleted = false 
  AND u.current_score > 0
ORDER BY u.current_score DESC, u.last_score_update_at ASC
LIMIT 1000;

-- Unique index for materialized view
CREATE UNIQUE INDEX idx_leaderboard_realtime_id ON leaderboard_realtime(id);
CREATE INDEX idx_leaderboard_realtime_rank ON leaderboard_realtime(rank);

-- Refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboard_realtime()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_realtime;
END;
$$ LANGUAGE plpgsql;
```

```sql
-- View for user action summary
CREATE VIEW user_action_summary AS
SELECT 
    ua.user_id,
    u.username,
    COUNT(*) as total_actions,
    SUM(ua.score_earned) as total_score_from_actions,
    AVG(ua.score_earned) as avg_score_per_action,
    MAX(ua.score_earned) as highest_single_action_score,
    COUNT(DISTINCT ua.action_type_id) as unique_action_types,
    MIN(ua.completed_at) as first_action_date,
    MAX(ua.completed_at) as last_action_date,
    COUNT(CASE WHEN ua.completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as actions_last_7_days,
    COUNT(CASE WHEN ua.completed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as actions_last_30_days
FROM user_actions ua
JOIN users u ON ua.user_id = u.id
WHERE ua.verification_status = 'verified'
GROUP BY ua.user_id, u.username;
```

## Database Functions and Triggers

### Score Update Function

```sql
-- Function to update user score and rank efficiently
CREATE OR REPLACE FUNCTION update_user_score(
    p_user_id UUID,
    p_score_change INTEGER,
    p_action_id UUID DEFAULT NULL
)
RETURNS TABLE(new_score INTEGER, new_rank INTEGER, rank_change INTEGER) AS $$
DECLARE
    v_old_score INTEGER;
    v_new_score INTEGER;
    v_old_rank INTEGER;
    v_new_rank INTEGER;
BEGIN
    -- Get current score and rank
    SELECT current_score, current_rank INTO v_old_score, v_old_rank
    FROM users WHERE id = p_user_id;
    
    -- Calculate new score
    v_new_score := v_old_score + p_score_change;
    
    -- Update user score
    UPDATE users 
    SET current_score = v_new_score,
        total_score = total_score + GREATEST(p_score_change, 0),
        last_score_update_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Recalculate ranks for affected users
    WITH ranked_users AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY current_score DESC, last_score_update_at ASC) as new_rank
        FROM users 
        WHERE is_active = true AND is_deleted = false AND current_score > 0
    )
    UPDATE users u
    SET current_rank = ru.new_rank
    FROM ranked_users ru
    WHERE u.id = ru.id 
      AND (u.current_rank IS NULL OR u.current_rank != ru.new_rank);
    
    -- Get new rank
    SELECT current_rank INTO v_new_rank FROM users WHERE id = p_user_id;
    
    -- Log the score change
    INSERT INTO score_change_log (user_id, action_id, old_score, new_score, score_change, old_rank, new_rank)
    VALUES (p_user_id, p_action_id, v_old_score, v_new_score, p_score_change, v_old_rank, v_new_rank);
    
    RETURN QUERY SELECT v_new_score, v_new_rank, COALESCE(v_old_rank - v_new_rank, 0);
END;
$$ LANGUAGE plpgsql;
```

### Audit Trigger

```sql
-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW), current_setting('app.current_user_id', true), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD), current_setting('app.current_user_id', true), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_actions AFTER INSERT OR UPDATE OR DELETE ON user_actions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## API Data Structures

### Core API Response Types

```typescript
// Base API response structure
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// Pagination structure
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User data structures
interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  currentScore: number;
  totalScore: number;
  currentRank?: number;
  role: 'admin' | 'moderator' | 'user' | 'guest';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  lastScoreUpdateAt?: string;
}

interface PublicUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  currentScore: number;
  currentRank?: number;
  isVerified: boolean;
}

// Scoreboard structures
interface ScoreboardEntry {
  user: PublicUser;
  rank: number;
  score: number;
  scoreChange24h?: number;
  totalActions: number;
  lastActiveAt: string;
}

interface Scoreboard {
  entries: ScoreboardEntry[];
  totalUsers: number;
  lastUpdated: string;
  updateFrequency: string;
}

// Action structures
interface ActionType {
  id: number;
  name: string;
  displayName: string;
  description: string;
  baseScore: number;
  maxScore?: number;
  category: string;
  difficultyLevel: number;
  isRepeatable: boolean;
  cooldownMinutes: number;
  maxCompletionsPerDay?: number;
  tags: string[];
}

interface UserAction {
  id: string;
  actionType: ActionType;
  actionIdentifier: string;
  scoreEarned: number;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  metadata?: Record<string, any>;
  completedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface ActionCompletion {
  actionTypeId: number;
  actionIdentifier: string;
  metadata?: Record<string, any>;
  clientTimestamp?: string;
}

// Statistics structures
interface UserStatistics {
  totalActionsCompleted: number;
  totalScoreEarned: number;
  averageScorePerAction: number;
  highestSingleScore: number;
  consecutiveDaysActive: number;
  longestStreakDays: number;
  bestRankAchieved?: number;
  rankImprovement30d: number;
  actionsPerDayAverage: number;
}

interface SystemStatistics {
  totalUsers: number;
  activeUsers24h: number;
  totalActionsCompleted: number;
  averageScore: number;
  medianScore: number;
  topScore: number;
  actionsCompleted24h: number;
  newUsers24h: number;
}
```

### API Request/Response Examples

```typescript
// Authentication endpoints
interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse extends ApiResponse<{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {}

// Scoreboard endpoints
interface GetScoreboardRequest {
  limit?: number; // 1-50, default 10
  offset?: number;
  timeframe?: 'all' | '24h' | '7d' | '30d';
}

interface GetScoreboardResponse extends ApiResponse<Scoreboard> {}

// Action completion
interface CompleteActionRequest {
  actionType: string;
  actionIdentifier: string;
  metadata?: Record<string, any>;
}

interface CompleteActionResponse extends ApiResponse<{
  action: UserAction;
  scoreChange: number;
  newScore: number;
  newRank: number;
  rankChange: number;
  achievements?: string[];
}> {}

// User profile
interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

interface GetUserActionsRequest {
  userId: string;
  page?: number;
  limit?: number;
  actionType?: string;
  status?: 'all' | 'pending' | 'verified' | 'rejected';
  fromDate?: string;
  toDate?: string;
}
```

### Database Query Optimization Patterns

```typescript
// Optimized query builders for common operations
class ScoreboardQueries {
  static getTopScores(limit: number = 10, offset: number = 0): QueryConfig {
    return {
      text: `
        SELECT u.id, u.username, u.display_name, u.avatar_url, 
               u.current_score, u.current_rank, u.last_score_update_at,
               COALESCE(us.total_actions_completed, 0) as total_actions
        FROM users u
        LEFT JOIN user_statistics us ON u.id = us.user_id
        WHERE u.is_active = true AND u.is_deleted = false AND u.current_score > 0
        ORDER BY u.current_score DESC, u.last_score_update_at ASC
        LIMIT $1 OFFSET $2
      `,
      values: [limit, offset]
    };
  }
  
  static getUserRankAndScore(userId: string): QueryConfig {
    return {
      text: `
        SELECT current_score, current_rank,
               (SELECT COUNT(*) FROM users 
                WHERE is_active = true AND is_deleted = false AND current_score > 0) as total_active_users
        FROM users 
        WHERE id = $1
      `,
      values: [userId]
    };
  }
  
  static getScoreChanges24h(): QueryConfig {
    return {
      text: `
        SELECT user_id, SUM(score_earned) as score_change_24h
        FROM user_actions 
        WHERE completed_at >= NOW() - INTERVAL '24 hours'
          AND verification_status = 'verified'
        GROUP BY user_id
      `,
      values: []
    };
  }
}
```

### Performance Monitoring Queries

```sql
-- Query to monitor database performance
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation,
    most_common_vals
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'user_actions', 'action_types')
ORDER BY tablename, attname;

-- Index usage monitoring
SELECT 
    t.tablename,
    indexname,
    c.reltuples AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::text)) AS table_size,
    pg_size_pretty(pg_relation_size(quote_ident(indexrelname)::text)) AS index_size,
    CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS unique,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname = t.tablename
LEFT OUTER JOIN (
    SELECT c.relname AS ctablename, ipg.relname AS indexname, x.indnatts AS number_of_columns,
           idx_scan, idx_tup_read, idx_tup_fetch, indexrelname, indisunique
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class ipg ON ipg.oid = x.indexrelid
    JOIN pg_stat_user_indexes psui ON x.indexrelid = psui.indexrelid
) AS foo ON t.tablename = foo.ctablename
WHERE t.schemaname = 'public'
ORDER BY 1, 2;
```

This comprehensive database design provides a solid foundation for the live scoreboard system with optimized performance, data integrity, and scalability considerations built in from the ground up.