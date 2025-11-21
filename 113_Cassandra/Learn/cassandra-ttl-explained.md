# ⏰ Cassandra TTL (Time To Live) - Detailed Explanation

**Understanding automatic data expiration in Cassandra**

## 🎯 What is TTL?

**TTL (Time To Live)** là một tính năng trong Cassandra cho phép data **tự động expire** sau một khoảng thời gian nhất định. Đây là một tính năng **không có trong MySQL** và là một trong những advantages lớn của Cassandra.

## 🔍 The Code in Question

```sql
-- From the previous example
INSERT INTO session_tokens (token, user_id, created_at)
VALUES ('abc123', uuid(), toTimestamp(now()))
USING TTL 3600;  -- ← This is what we're explaining
```

**USING TTL 3600** có nghĩa là:
- **TTL = Time To Live**
- **3600 = 3600 giây = 1 giờ**
- Data này sẽ **tự động bị xóa** sau 1 giờ

---

## 🆚 MySQL vs Cassandra: Data Expiration

### 🔵 MySQL Approach (Manual Cleanup)

```sql
-- MySQL: No built-in TTL, must handle manually
CREATE TABLE session_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP  -- Manual expiration tracking
);

-- Insert with manual expiration time
INSERT INTO session_tokens (token, user_id, expires_at)
VALUES ('abc123', 1, DATE_ADD(NOW(), INTERVAL 1 HOUR));

-- Need scheduled cleanup job
DELETE FROM session_tokens WHERE expires_at < NOW();

-- Or application-level cleanup
SELECT * FROM session_tokens
WHERE token = 'abc123'
  AND expires_at > NOW();  -- Check expiration manually
```

**Problems với MySQL approach:**
- ❌ Manual cleanup required (cron jobs, application logic)
- ❌ Expired data still takes storage space until cleaned
- ❌ Cleanup jobs can impact performance
- ❌ Risk of forgotten cleanup → storage bloat

### 🔴 Cassandra Approach (Automatic TTL)

```sql
-- Cassandra: Built-in automatic expiration
CREATE TABLE session_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID,
    created_at TIMESTAMP
);

-- Insert with automatic expiration
INSERT INTO session_tokens (token, user_id, created_at)
VALUES ('abc123', uuid(), toTimestamp(now()))
USING TTL 3600;  -- Automatically deleted after 1 hour

-- No cleanup needed! Just query normally
SELECT * FROM session_tokens WHERE token = 'abc123';
-- Returns empty if expired
```

**Benefits của Cassandra TTL:**
- ✅ **Automatic cleanup** - no manual intervention needed
- ✅ **Storage efficient** - expired data removed automatically
- ✅ **Performance friendly** - no cleanup jobs needed
- ✅ **Built-in feature** - no application logic required

---

## 🔧 TTL Syntax & Usage

### 1. INSERT with TTL

```sql
-- Basic TTL syntax
INSERT INTO table_name (columns...)
VALUES (values...)
USING TTL seconds;

-- Examples with different time periods
INSERT INTO cache_data (key, value) VALUES ('user:123', 'John Doe') USING TTL 300;    -- 5 minutes
INSERT INTO session_data (session_id, user_data) VALUES ('sess_123', '{}') USING TTL 1800;  -- 30 minutes
INSERT INTO temp_tokens (token, data) VALUES ('temp_123', 'data') USING TTL 86400;   -- 24 hours
INSERT INTO logs (log_id, message) VALUES (uuid(), 'System started') USING TTL 604800; -- 7 days
```

### 2. UPDATE with TTL

```sql
-- Set TTL when updating
UPDATE user_cache
SET last_activity = toTimestamp(now())
WHERE user_id = ?
USING TTL 3600;  -- Reset TTL to 1 hour

-- Update specific columns with TTL
UPDATE session_data
SET last_action = 'login', session_data = '{...}'
WHERE session_id = ?
USING TTL 7200;  -- 2 hours
```

### 3. Table-Level Default TTL

```sql
-- Set default TTL for entire table
CREATE TABLE logs (
    log_id UUID PRIMARY KEY,
    level TEXT,
    message TEXT,
    created_at TIMESTAMP
) WITH default_time_to_live = 86400;  -- 24 hours default

-- All inserts inherit default TTL (unless overridden)
INSERT INTO logs (log_id, level, message, created_at)
VALUES (uuid(), 'INFO', 'User login', toTimestamp(now()));
-- ↑ Will expire in 24 hours automatically

-- Override default TTL for specific insert
INSERT INTO logs (log_id, level, message, created_at)
VALUES (uuid(), 'CRITICAL', 'System error', toTimestamp(now()))
USING TTL 604800;  -- Keep critical logs for 7 days instead
```

### 4. Disable TTL

```sql
-- Insert without TTL (permanent data)
INSERT INTO logs (log_id, message)
VALUES (uuid(), 'Important permanent log')
USING TTL 0;  -- TTL 0 = never expires

-- Remove TTL from existing data
UPDATE user_cache SET data = 'permanent'
WHERE user_id = ?
USING TTL 0;  -- Make this record permanent
```

---

## ⏰ Time Units & Calculations

### Common Time Periods

```sql
-- Seconds conversion table
1 minute   = 60 seconds
5 minutes  = 300 seconds
15 minutes = 900 seconds
30 minutes = 1800 seconds
1 hour     = 3600 seconds
2 hours    = 7200 seconds
6 hours    = 21600 seconds
12 hours   = 43200 seconds
24 hours   = 86400 seconds
7 days     = 604800 seconds
30 days    = 2592000 seconds
```

### Dynamic TTL Calculation

```javascript
// In your Node.js application
const TTL_TIMES = {
    SHORT_SESSION: 15 * 60,        // 15 minutes
    NORMAL_SESSION: 60 * 60,       // 1 hour
    LONG_SESSION: 8 * 60 * 60,     // 8 hours
    CACHE_DEFAULT: 30 * 60,        // 30 minutes
    TEMP_DATA: 24 * 60 * 60,       // 24 hours
    LOG_RETENTION: 7 * 24 * 60 * 60 // 7 days
};

// Usage in queries
await client.execute(
    'INSERT INTO user_sessions (session_id, user_data) VALUES (?, ?) USING TTL ?',
    [sessionId, userData, TTL_TIMES.NORMAL_SESSION]
);
```

---

## 🎯 Real-World Use Cases

### 1. Session Management

```sql
-- User sessions that auto-expire
CREATE TABLE user_sessions (
    session_token TEXT PRIMARY KEY,
    user_id UUID,
    user_data MAP<TEXT, TEXT>,
    ip_address INET,
    created_at TIMESTAMP
) WITH default_time_to_live = 3600;  -- 1 hour default

-- Login: Create session
INSERT INTO user_sessions (session_token, user_id, user_data, ip_address, created_at)
VALUES ('sess_abc123', uuid(), {'role': 'user', 'name': 'John'}, '192.168.1.100', toTimestamp(now()));

-- Extend session on activity
UPDATE user_sessions
SET user_data = user_data + {'last_activity': 'page_view'}
WHERE session_token = 'sess_abc123'
USING TTL 3600;  -- Reset TTL to 1 hour
```

### 2. Caching Layer

```sql
-- Application cache with TTL
CREATE TABLE app_cache (
    cache_key TEXT PRIMARY KEY,
    cache_value TEXT,
    cache_metadata MAP<TEXT, TEXT>
);

-- Cache expensive computation for 30 minutes
INSERT INTO app_cache (cache_key, cache_value, cache_metadata)
VALUES ('user_profile:123', '{"name":"John","email":"john@example.com"}', {'type': 'user_data'})
USING TTL 1800;  -- 30 minutes

-- Cache database query results
INSERT INTO app_cache (cache_key, cache_value)
VALUES ('popular_posts', '[{"id":1,"title":"Post 1"},{"id":2,"title":"Post 2"}]')
USING TTL 600;   -- 10 minutes for dynamic content
```

### 3. Temporary Data Storage

```sql
-- Email verification tokens
CREATE TABLE verification_tokens (
    email TEXT,
    token TEXT,
    token_type TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (email, token_type)
) WITH default_time_to_live = 3600;  -- 1 hour verification window

-- Password reset tokens (shorter expiry)
INSERT INTO verification_tokens (email, token, token_type, created_at)
VALUES ('user@example.com', 'reset_abc123', 'password_reset', toTimestamp(now()))
USING TTL 900;  -- 15 minutes for security
```

### 4. Rate Limiting

```sql
-- API rate limiting with TTL
CREATE TABLE api_rate_limits (
    api_key TEXT,
    time_window TEXT,  -- e.g., '2023-12-01:14' (hour-based)
    request_count COUNTER,
    PRIMARY KEY (api_key, time_window)
) WITH default_time_to_live = 3600;  -- Clean up old time windows

-- Track requests
UPDATE api_rate_limits
SET request_count = request_count + 1
WHERE api_key = 'key_123' AND time_window = '2023-12-01:14';

-- TTL automatically cleans up old time windows
```

### 5. Event Logging

```sql
-- Application logs with retention policy
CREATE TABLE application_logs (
    log_date DATE,
    log_time TIMESTAMP,
    log_id UUID,
    level TEXT,
    service TEXT,
    message TEXT,
    metadata MAP<TEXT, TEXT>,
    PRIMARY KEY (log_date, log_time, log_id)
) WITH CLUSTERING ORDER BY (log_time DESC)
  AND default_time_to_live = 604800;  -- Keep logs for 7 days

-- Different retention for different log levels
INSERT INTO application_logs (log_date, log_time, log_id, level, message)
VALUES ('2023-12-01', toTimestamp(now()), uuid(), 'DEBUG', 'Debug message')
USING TTL 86400;  -- Debug logs: 1 day

INSERT INTO application_logs (log_date, log_time, log_id, level, message)
VALUES ('2023-12-01', toTimestamp(now()), uuid(), 'ERROR', 'Error occurred')
USING TTL 2592000;  -- Error logs: 30 days
```

---

## 🔍 Monitoring TTL

### 1. Check TTL of Records

```sql
-- Get TTL remaining for specific record
SELECT TTL(column_name) FROM table_name WHERE primary_key = ?;

-- Example
SELECT token, TTL(user_data) FROM user_sessions WHERE session_token = 'sess_abc123';
-- Returns: token='sess_abc123', ttl(user_data)=2847 (seconds remaining)
```

### 2. Find Records About to Expire

```sql
-- Note: TTL() function returns remaining seconds
SELECT * FROM user_sessions WHERE TTL(user_data) < 300;  -- Expiring in < 5 minutes
SELECT * FROM cache_data WHERE TTL(cache_value) < 60;    -- Expiring in < 1 minute
```

### 3. Application-Level TTL Management

```javascript
// Node.js example: Check TTL before using cached data
async function getCachedData(cacheKey) {
    const result = await client.execute(
        'SELECT cache_value, TTL(cache_value) as ttl_remaining FROM app_cache WHERE cache_key = ?',
        [cacheKey]
    );

    if (result.rows.length === 0) {
        return null; // Cache miss or expired
    }

    const row = result.rows[0];
    const ttlRemaining = row.ttl_remaining;

    // Refresh cache if less than 1 minute remaining
    if (ttlRemaining < 60) {
        console.log(`Cache for ${cacheKey} expiring soon, refreshing...`);
        await refreshCache(cacheKey);
    }

    return row.cache_value;
}
```

---

## ⚡ Performance Implications

### 1. Storage Benefits

```
MySQL (Manual Cleanup):
┌─────────────────────────────┐
│ Active Data: 1GB            │
│ Expired Data: 500MB ←Wait   │
│ Total Storage: 1.5GB        │
│ Cleanup Job: Every hour     │
└─────────────────────────────┘

Cassandra (Automatic TTL):
┌─────────────────────────────┐
│ Active Data: 1GB            │
│ Expired Data: 0MB ←Auto     │
│ Total Storage: 1GB          │
│ Cleanup: Continuous         │
└─────────────────────────────┘
```

### 2. Compaction Benefits

Cassandra's TTL integrates với **compaction process**:
```
Before Compaction:
SSTable 1: [data1, expired_data2, data3, expired_data4]
SSTable 2: [data5, expired_data6, data7, data8]

After Compaction:
SSTable 3: [data1, data3, data5, data7, data8]  ← Expired data removed
```

### 3. Read Performance

```javascript
// MySQL: Need to check expiration manually
SELECT * FROM sessions
WHERE session_token = ?
  AND expires_at > NOW();  -- Extra condition = slower

// Cassandra: TTL handled automatically
SELECT * FROM sessions
WHERE session_token = ?;   -- Faster, expired data already gone
```

---

## ⚠️ TTL Gotchas & Best Practices

### 1. TTL Precision

```sql
-- TTL is precise to seconds, not milliseconds
INSERT INTO data (key, value) VALUES ('test', 'data') USING TTL 1;
-- Will expire after 1-2 seconds (not exactly 1 second)
```

### 2. Column-Level TTL

```sql
-- TTL applies to entire row, not individual columns
INSERT INTO user_data (user_id, name, email, last_login)
VALUES (?, 'John', 'john@example.com', toTimestamp(now()))
USING TTL 3600;
-- All columns (name, email, last_login) expire together
```

### 3. Update TTL Behavior

```sql
-- UPDATE without TTL removes existing TTL
INSERT INTO cache (key, value) VALUES ('test', 'data') USING TTL 3600;  -- 1 hour TTL
UPDATE cache SET value = 'new_data' WHERE key = 'test';                  -- TTL removed!

-- Must specify TTL in UPDATE to maintain it
UPDATE cache SET value = 'new_data' WHERE key = 'test' USING TTL 3600;   -- TTL maintained
```

### 4. Counter Columns and TTL

```sql
-- Counter columns have special TTL behavior
CREATE TABLE page_views (
    page_id TEXT PRIMARY KEY,
    view_count COUNTER
) WITH default_time_to_live = 86400;

-- Counter updates inherit table TTL
UPDATE page_views SET view_count = view_count + 1 WHERE page_id = 'page1';
-- This row will expire in 24 hours

-- Cannot set TTL on individual counter updates
UPDATE page_views SET view_count = view_count + 1 WHERE page_id = 'page1' USING TTL 3600;  -- ERROR!
```

### 5. Best Practices

```sql
-- ✅ Use appropriate TTL values
USING TTL 60;      -- Good for temporary tokens
USING TTL 86400;   -- Good for daily data
USING TTL 604800;  -- Good for weekly data

-- ❌ Avoid very short TTLs (< 60 seconds) for high-volume data
USING TTL 1;       -- Bad: Creates compaction pressure

-- ✅ Use table-level default TTL when appropriate
CREATE TABLE logs (...) WITH default_time_to_live = 604800;  -- Good for logs

-- ✅ Monitor TTL in application
SELECT TTL(data) FROM cache WHERE key = ?;  -- Check remaining time
```

---

## 🎯 Migration from MySQL

### Converting MySQL Expiration Patterns

#### 1. Session Storage Migration

**Before (MySQL):**
```sql
-- MySQL approach
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_token VARCHAR(255),
    user_id INT,
    expires_at TIMESTAMP,
    INDEX idx_expires (expires_at)
);

-- Cleanup job needed
DELETE FROM sessions WHERE expires_at < NOW();
```

**After (Cassandra):**
```sql
-- Cassandra approach
CREATE TABLE sessions (
    session_token TEXT PRIMARY KEY,
    user_id UUID,
    created_at TIMESTAMP
) WITH default_time_to_live = 3600;

-- No cleanup job needed!
```

#### 2. Cache Layer Migration

**Before (MySQL):**
```sql
-- MySQL + Redis/Memcached combo
-- Application code:
cache.set('key', 'value', 3600);  -- External cache with TTL
db.query('INSERT INTO fallback_cache ...');  -- DB fallback without TTL
```

**After (Cassandra):**
```sql
-- Single Cassandra table with TTL
INSERT INTO app_cache (key, value) VALUES ('key', 'value') USING TTL 3600;
-- Built-in TTL, no external cache needed for many use cases
```

---

## 🚀 Next Steps

Now that you understand TTL:

1. **🧪 Experiment:** Try creating tables với different TTL values
2. **📊 Monitor:** Use `SELECT TTL(column)` to track expiration
3. **🔧 Implement:** Add TTL to appropriate tables in your projects
4. **📈 Optimize:** Use TTL to reduce storage và improve performance

**Remember:** TTL is one of Cassandra's killer features that makes it perfect for time-sensitive data! ⏰✨

---

## 💡 Key Takeaways

### ✅ TTL Benefits:
- **Automatic cleanup** - no manual jobs needed
- **Storage efficiency** - expired data removed automatically
- **Performance friendly** - no cleanup impact
- **Built-in feature** - no application logic required

### 🎯 Perfect Use Cases:
- **Sessions** - auto-expire user sessions
- **Caching** - temporary data storage
- **Logs** - automatic log rotation
- **Rate limiting** - sliding time windows
- **Temporary tokens** - security tokens that expire

### 🧠 Mental Model:
- **MySQL:** "I need to remember to clean up expired data"
- **Cassandra:** "Data cleans up itself automatically"

**This is why Cassandra is perfect for time-series và temporary data! 🕒🚀**
