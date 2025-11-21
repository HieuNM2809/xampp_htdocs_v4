# 🚀 Advanced TTL Examples - Real-World Production Scenarios

**Complex TTL patterns for enterprise applications**

## 🎯 Overview

Đây là những ví dụ TTL **nâng cao** từ production systems thực tế, showing complex patterns mà MySQL không thể làm được một cách elegant như vậy.

---

## 🏢 1. Multi-Tier Session Management System

### Scenario: Banking Application với Different Session Types

```sql
-- Different session types with different security requirements
CREATE TABLE user_sessions (
    session_type TEXT,        -- 'standard', 'elevated', 'admin'
    session_token TEXT,
    user_id UUID,
    user_role TEXT,
    ip_address INET,
    user_agent TEXT,
    security_level INT,
    last_activity TIMESTAMP,
    permissions SET<TEXT>,
    metadata MAP<TEXT, TEXT>,
    PRIMARY KEY (session_type, session_token)
) WITH default_time_to_live = 3600;  -- Default 1 hour
```

### Dynamic TTL Based on Session Type

```javascript
// Node.js application logic
class AdvancedSessionManager {
    constructor() {
        this.TTL_CONFIG = {
            standard: 4 * 60 * 60,        // 4 hours - normal users
            elevated: 30 * 60,            // 30 minutes - sensitive operations
            admin: 15 * 60,               // 15 minutes - admin operations
            mobile: 24 * 60 * 60,         // 24 hours - mobile apps
            api: 7 * 24 * 60 * 60,        // 7 days - API tokens
            temp: 5 * 60                  // 5 minutes - temporary access
        };
    }

    async createSession(sessionType, userData, securityContext = {}) {
        const sessionToken = this.generateSecureToken();
        const ttl = this.calculateDynamicTTL(sessionType, securityContext);

        await client.execute(`
            INSERT INTO user_sessions (
                session_type, session_token, user_id, user_role,
                ip_address, security_level, permissions, metadata, last_activity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            sessionType,
            sessionToken,
            userData.userId,
            userData.role,
            securityContext.ipAddress,
            securityContext.securityLevel || 1,
            userData.permissions,
            securityContext.metadata || {},
            new Date(),
            ttl
        ]);

        console.log(`Created ${sessionType} session for ${userData.userId}, expires in ${ttl} seconds`);
        return sessionToken;
    }

    calculateDynamicTTL(sessionType, context) {
        let baseTTL = this.TTL_CONFIG[sessionType] || this.TTL_CONFIG.standard;

        // Adjust TTL based on security context
        if (context.securityLevel >= 3) {
            baseTTL = Math.min(baseTTL, 10 * 60); // Max 10 minutes for high security
        }

        if (context.ipAddress && this.isHighRiskIP(context.ipAddress)) {
            baseTTL = Math.min(baseTTL, 5 * 60); // Max 5 minutes for risky IPs
        }

        if (context.deviceTrusted === false) {
            baseTTL = Math.min(baseTTL, 30 * 60); // Max 30 minutes for untrusted devices
        }

        return baseTTL;
    }

    // Advanced: Extend session with smart TTL calculation
    async extendSession(sessionToken, activity) {
        const sessionInfo = await this.getSession(sessionToken);
        if (!sessionInfo) return null;

        // Calculate new TTL based on activity type
        const extensionTTL = this.calculateExtensionTTL(sessionInfo, activity);

        await client.execute(`
            UPDATE user_sessions
            SET last_activity = ?,
                metadata = metadata + ?
            WHERE session_type = ? AND session_token = ?
            USING TTL ?
        `, [
            new Date(),
            { last_action: activity.type, activity_count: activity.count.toString() },
            sessionInfo.session_type,
            sessionToken,
            extensionTTL
        ]);

        return extensionTTL;
    }
}
```

---

## 📊 2. Intelligent Caching với Auto-Refresh

### Multi-Layer Cache với Different TTLs

```sql
-- Cache layer với different priorities
CREATE TABLE intelligent_cache (
    cache_namespace TEXT,     -- 'user_profiles', 'product_catalog', 'search_results'
    cache_key TEXT,
    cache_priority INT,       -- 1=critical, 2=important, 3=normal, 4=optional
    cache_value TEXT,
    cache_metadata MAP<TEXT, TEXT>,
    access_count COUNTER,
    last_accessed TIMESTAMP,
    PRIMARY KEY (cache_namespace, cache_key)
);

-- Hot cache for frequently accessed data
CREATE TABLE hot_cache (
    cache_key TEXT PRIMARY KEY,
    cache_value TEXT,
    access_frequency COUNTER,
    cache_source TEXT,
    updated_at TIMESTAMP
) WITH default_time_to_live = 300;  -- 5 minutes default
```

### Smart Cache Management

```javascript
class IntelligentCache {
    constructor() {
        this.PRIORITY_TTL = {
            1: 24 * 60 * 60,      // Critical: 24 hours
            2: 4 * 60 * 60,       // Important: 4 hours
            3: 1 * 60 * 60,       // Normal: 1 hour
            4: 15 * 60            // Optional: 15 minutes
        };
    }

    async set(namespace, key, value, options = {}) {
        const priority = options.priority || 3;
        const baseTTL = this.PRIORITY_TTL[priority];

        // Dynamic TTL based on usage patterns
        const usage = await this.getUsageStats(namespace, key);
        const adjustedTTL = this.calculateSmartTTL(baseTTL, usage, options);

        // Store in main cache
        await client.execute(`
            INSERT INTO intelligent_cache (
                cache_namespace, cache_key, cache_priority, cache_value, cache_metadata, last_accessed
            ) VALUES (?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            namespace, key, priority, JSON.stringify(value),
            options.metadata || {}, new Date(), adjustedTTL
        ]);

        // Also store in hot cache if frequently accessed
        if (usage.accessCount > 10) {
            await client.execute(`
                INSERT INTO hot_cache (cache_key, cache_value, cache_source, updated_at)
                VALUES (?, ?, ?, ?)
                USING TTL ?
            `, [
                `${namespace}:${key}`, JSON.stringify(value), namespace, new Date(), 300
            ]);

            // Update access frequency
            await client.execute(`
                UPDATE hot_cache SET access_frequency = access_frequency + 1
                WHERE cache_key = ?
            `, [`${namespace}:${key}`]);
        }

        console.log(`Cached ${namespace}:${key} with TTL ${adjustedTTL}s (priority ${priority})`);
    }

    calculateSmartTTL(baseTTL, usage, options) {
        let smartTTL = baseTTL;

        // Extend TTL for frequently accessed items
        if (usage.accessCount > 100) {
            smartTTL *= 2; // Double TTL for hot data
        } else if (usage.accessCount > 50) {
            smartTTL *= 1.5; // 50% longer for warm data
        }

        // Reduce TTL for stale data
        const daysSinceLastAccess = usage.daysSinceLastAccess || 0;
        if (daysSinceLastAccess > 7) {
            smartTTL = Math.min(smartTTL, 30 * 60); // Max 30 minutes for old data
        }

        // Business hours adjustment
        if (options.businessHoursOnly && !this.isBusinessHours()) {
            smartTTL = Math.min(smartTTL, 60 * 60); // Max 1 hour outside business hours
        }

        return Math.max(smartTTL, 60); // Minimum 1 minute
    }

    // Auto-refresh pattern
    async getWithAutoRefresh(namespace, key, refreshFunction) {
        // Try hot cache first
        let result = await this.getFromHotCache(`${namespace}:${key}`);
        if (result) return result;

        // Try main cache
        result = await this.getFromMainCache(namespace, key);
        if (result) {
            // Check if close to expiration and refresh proactively
            const ttl = await this.getTTL(namespace, key);
            if (ttl < 300) { // Less than 5 minutes remaining
                // Async refresh without waiting
                setImmediate(() => this.refreshCache(namespace, key, refreshFunction));
            }
            return result;
        }

        // Cache miss - fetch and cache
        const freshData = await refreshFunction();
        await this.set(namespace, key, freshData);
        return freshData;
    }
}
```

---

## 🌊 3. Time-Series Data với Tiered Storage

### IoT Sensor Data với Smart Retention

```sql
-- Real-time sensor data (short retention)
CREATE TABLE sensor_data_realtime (
    sensor_id UUID,
    measurement_time TIMESTAMP,
    measurement_id TIMEUUID,
    temperature DECIMAL,
    humidity DECIMAL,
    pressure DECIMAL,
    battery_level INT,
    signal_strength INT,
    metadata MAP<TEXT, TEXT>,
    PRIMARY KEY (sensor_id, measurement_time, measurement_id)
) WITH CLUSTERING ORDER BY (measurement_time DESC, measurement_id DESC)
  AND default_time_to_live = 3600; -- 1 hour raw data

-- Aggregated data (medium retention)
CREATE TABLE sensor_data_hourly (
    sensor_id UUID,
    hour_bucket TIMESTAMP,    -- Rounded to hour
    avg_temperature DECIMAL,
    min_temperature DECIMAL,
    max_temperature DECIMAL,
    avg_humidity DECIMAL,
    sample_count INT,
    data_quality_score DECIMAL,
    PRIMARY KEY (sensor_id, hour_bucket)
) WITH default_time_to_live = 604800; -- 7 days aggregated

-- Historical summaries (long retention)
CREATE TABLE sensor_data_daily (
    sensor_id UUID,
    date_bucket DATE,
    daily_stats MAP<TEXT, DECIMAL>,
    anomalies LIST<TEXT>,
    maintenance_alerts SET<TEXT>,
    PRIMARY KEY (sensor_id, date_bucket)
) WITH default_time_to_live = 7776000; -- 90 days historical
```

### Intelligent Data Lifecycle Management

```javascript
class IoTDataManager {
    async ingestSensorData(sensorId, measurements) {
        const now = new Date();
        const measurementId = cassandra.types.TimeUuid.now();

        // 1. Store raw data with short TTL
        await client.execute(`
            INSERT INTO sensor_data_realtime (
                sensor_id, measurement_time, measurement_id,
                temperature, humidity, pressure, battery_level, signal_strength
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            sensorId, now, measurementId,
            measurements.temperature, measurements.humidity, measurements.pressure,
            measurements.battery_level, measurements.signal_strength,
            this.calculateRawDataTTL(measurements)
        ]);

        // 2. Trigger aggregation if needed
        if (this.shouldTriggerAggregation(sensorId, now)) {
            await this.aggregateHourlyData(sensorId, now);
        }

        // 3. Check for anomalies and extend TTL if needed
        if (this.isAnomalous(measurements)) {
            await this.extendAnomalousDataTTL(sensorId, measurementId);
        }
    }

    calculateRawDataTTL(measurements) {
        let baseTTL = 3600; // 1 hour default

        // Extend TTL for important readings
        if (measurements.temperature > 80 || measurements.temperature < 0) {
            baseTTL = 24 * 60 * 60; // Keep extreme temperatures for 24 hours
        }

        if (measurements.battery_level < 20) {
            baseTTL = 12 * 60 * 60; // Keep low battery readings for 12 hours
        }

        if (measurements.signal_strength < -80) {
            baseTTL = 6 * 60 * 60; // Keep poor signal data for 6 hours
        }

        return baseTTL;
    }

    async extendAnomalousDataTTL(sensorId, measurementId) {
        // Find and extend TTL for anomalous data
        await client.execute(`
            UPDATE sensor_data_realtime
            SET metadata = metadata + ?
            WHERE sensor_id = ? AND measurement_time = ? AND measurement_id = ?
            USING TTL ?
        `, [
            { anomaly_detected: 'true', extended_retention: 'true' },
            sensorId, now, measurementId,
            7 * 24 * 60 * 60 // Keep anomalies for 7 days
        ]);
    }

    // Batch aggregation with smart TTL
    async aggregateHourlyData(sensorId, timestamp) {
        const hourBucket = this.roundToHour(timestamp);

        // Get raw data for this hour
        const rawData = await client.execute(`
            SELECT * FROM sensor_data_realtime
            WHERE sensor_id = ?
              AND measurement_time >= ?
              AND measurement_time < ?
        `, [sensorId, hourBucket, new Date(hourBucket.getTime() + 3600000)]);

        if (rawData.rows.length === 0) return;

        // Calculate aggregations
        const stats = this.calculateStatistics(rawData.rows);
        const qualityScore = this.calculateDataQuality(rawData.rows);

        // Store aggregated data with smart TTL
        const aggregatedTTL = this.calculateAggregatedTTL(stats, qualityScore);

        await client.execute(`
            INSERT INTO sensor_data_hourly (
                sensor_id, hour_bucket, avg_temperature, min_temperature, max_temperature,
                avg_humidity, sample_count, data_quality_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            sensorId, hourBucket, stats.avgTemp, stats.minTemp, stats.maxTemp,
            stats.avgHumidity, rawData.rows.length, qualityScore,
            aggregatedTTL
        ]);
    }

    calculateAggregatedTTL(stats, qualityScore) {
        let baseTTL = 7 * 24 * 60 * 60; // 7 days default

        // High quality data lives longer
        if (qualityScore > 0.9) {
            baseTTL *= 2; // 14 days for high quality
        }

        // Interesting data lives longer
        if (stats.tempVariance > 10) { // High variance
            baseTTL *= 1.5; // More retention for variable data
        }

        // Critical readings live longer
        if (stats.maxTemp > 100 || stats.minTemp < -20) {
            baseTTL = 30 * 24 * 60 * 60; // 30 days for extreme readings
        }

        return baseTTL;
    }
}
```

---

## 🔐 4. Advanced Security với Graduated TTL

### Multi-Factor Authentication với Escalating TTL

```sql
-- Auth attempts with increasing penalties
CREATE TABLE auth_attempts (
    ip_address INET,
    attempt_time TIMESTAMP,
    attempt_id TIMEUUID,
    username TEXT,
    success BOOLEAN,
    failure_reason TEXT,
    user_agent TEXT,
    PRIMARY KEY (ip_address, attempt_time, attempt_id)
) WITH CLUSTERING ORDER BY (attempt_time DESC);

-- Rate limiting với exponential backoff
CREATE TABLE rate_limits (
    limit_key TEXT,          -- ip, user, api_key, etc.
    time_window TIMESTAMP,   -- Rounded time window
    attempt_count COUNTER,
    last_violation TIMESTAMP,
    penalty_level INT,
    PRIMARY KEY (limit_key, time_window)
);

-- Security violations với smart retention
CREATE TABLE security_violations (
    violation_type TEXT,      -- 'brute_force', 'suspicious_location', 'rate_limit'
    entity_id TEXT,          -- IP, user_id, etc.
    violation_time TIMESTAMP,
    violation_id TIMEUUID,
    severity INT,            -- 1-5
    details MAP<TEXT, TEXT>,
    investigation_status TEXT,
    PRIMARY KEY (violation_type, entity_id, violation_time, violation_id)
) WITH CLUSTERING ORDER BY (violation_time DESC);
```

### Intelligent Security TTL Management

```javascript
class SecurityManager {
    constructor() {
        this.VIOLATION_TTL = {
            1: 24 * 60 * 60,         // Low severity: 24 hours
            2: 7 * 24 * 60 * 60,     // Medium: 7 days
            3: 30 * 24 * 60 * 60,    // High: 30 days
            4: 90 * 24 * 60 * 60,    // Critical: 90 days
            5: 365 * 24 * 60 * 60    // Severe: 1 year
        };
    }

    async recordAuthAttempt(ipAddress, username, success, context = {}) {
        const now = new Date();
        const attemptId = cassandra.types.TimeUuid.now();

        // Calculate TTL based on attempt pattern
        const attemptHistory = await this.getRecentAttempts(ipAddress, 24 * 60 * 60); // Last 24 hours
        const ttl = this.calculateAuthAttemptTTL(attemptHistory, success, context);

        await client.execute(`
            INSERT INTO auth_attempts (
                ip_address, attempt_time, attempt_id, username, success,
                failure_reason, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            ipAddress, now, attemptId, username, success,
            context.failureReason, context.userAgent,
            ttl
        ]);

        // Handle failed attempts
        if (!success) {
            await this.handleFailedAttempt(ipAddress, username, attemptHistory);
        }
    }

    calculateAuthAttemptTTL(history, success, context) {
        let baseTTL = 24 * 60 * 60; // 24 hours default

        if (success) {
            return 7 * 24 * 60 * 60; // Keep successful attempts for 7 days
        }

        // Failed attempts - calculate based on suspiciousness
        const failureCount = history.filter(a => !a.success).length;

        if (failureCount > 10) {
            baseTTL = 30 * 24 * 60 * 60; // 30 days for persistent attacks
        } else if (failureCount > 5) {
            baseTTL = 7 * 24 * 60 * 60;  // 7 days for multiple failures
        }

        // Geographic anomalies
        if (context.suspiciousLocation) {
            baseTTL *= 2; // Double retention for geo anomalies
        }

        // Unusual user agents or patterns
        if (context.automatedPattern) {
            baseTTL = 90 * 24 * 60 * 60; // 90 days for bot-like behavior
        }

        return baseTTL;
    }

    async recordSecurityViolation(violationType, entityId, severity, details = {}) {
        const now = new Date();
        const violationId = cassandra.types.TimeUuid.now();
        const ttl = this.VIOLATION_TTL[severity];

        await client.execute(`
            INSERT INTO security_violations (
                violation_type, entity_id, violation_time, violation_id,
                severity, details, investigation_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            violationType, entityId, now, violationId,
            severity, details, 'pending',
            ttl
        ]);

        // High severity violations get extended retention and additional tracking
        if (severity >= 4) {
            await this.escalateSecurityIncident(violationType, entityId, violationId, details);
        }
    }

    async escalateSecurityIncident(type, entityId, violationId, details) {
        // Create permanent record for serious incidents
        await client.execute(`
            INSERT INTO security_violations (
                violation_type, entity_id, violation_time, violation_id,
                severity, details, investigation_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            `${type}_escalated`, entityId, new Date(), cassandra.types.TimeUuid.now(),
            5, { ...details, escalated_from: violationId.toString() }, 'escalated',
            2 * 365 * 24 * 60 * 60 // 2 years for escalated incidents
        ]);

        // Notify security team
        await this.notifySecurityTeam(type, entityId, details);
    }

    // Smart rate limiting với progressive penalties
    async checkRateLimit(limitKey, action) {
        const timeWindow = this.getCurrentTimeWindow(); // Round to minute/hour

        // Get current count
        const result = await client.execute(`
            SELECT attempt_count, penalty_level, last_violation
            FROM rate_limits
            WHERE limit_key = ? AND time_window = ?
        `, [limitKey, timeWindow]);

        let currentCount = 0;
        let penaltyLevel = 1;
        let lastViolation = null;

        if (result.rows.length > 0) {
            currentCount = result.rows[0].attempt_count;
            penaltyLevel = result.rows[0].penalty_level || 1;
            lastViolation = result.rows[0].last_violation;
        }

        // Check if rate limited
        const limit = this.calculateDynamicLimit(limitKey, action, penaltyLevel);
        if (currentCount >= limit) {
            await this.applyRateLimitPenalty(limitKey, timeWindow, penaltyLevel);
            return { allowed: false, limit, current: currentCount, retryAfter: this.calculateRetryAfter(penaltyLevel) };
        }

        // Increment counter với smart TTL
        const ttl = this.calculateRateLimitTTL(penaltyLevel, action);
        await client.execute(`
            UPDATE rate_limits
            SET attempt_count = attempt_count + 1
            WHERE limit_key = ? AND time_window = ?
            USING TTL ?
        `, [limitKey, timeWindow, ttl]);

        return { allowed: true, limit, current: currentCount + 1 };
    }

    calculateRateLimitTTL(penaltyLevel, action) {
        const baseTTL = 60 * 60; // 1 hour base window

        // Progressive penalty periods
        const penaltyMultipliers = {
            1: 1,    // 1 hour
            2: 2,    // 2 hours
            3: 6,    // 6 hours
            4: 24,   // 24 hours
            5: 168   // 1 week
        };

        return baseTTL * (penaltyMultipliers[penaltyLevel] || 1);
    }
}
```

---

## 📱 5. Real-Time Notifications với Smart Cleanup

### Notification System với Priority-Based TTL

```sql
-- User notifications với tiered retention
CREATE TABLE user_notifications (
    user_id UUID,
    priority INT,            -- 1=critical, 2=high, 3=normal, 4=low
    created_at TIMESTAMP,
    notification_id TIMEUUID,
    type TEXT,              -- 'system', 'social', 'promotional'
    title TEXT,
    message TEXT,
    action_url TEXT,
    read_status BOOLEAN,
    metadata MAP<TEXT, TEXT>,
    PRIMARY KEY (user_id, priority, created_at, notification_id)
) WITH CLUSTERING ORDER BY (priority ASC, created_at DESC);

-- Push notification delivery tracking
CREATE TABLE push_delivery_log (
    notification_id TIMEUUID,
    user_id UUID,
    device_token TEXT,
    delivery_status TEXT,   -- 'sent', 'delivered', 'failed', 'clicked'
    attempt_count COUNTER,
    last_attempt TIMESTAMP,
    error_details TEXT,
    PRIMARY KEY (notification_id, user_id, device_token)
);
```

### Intelligent Notification TTL

```javascript
class NotificationManager {
    constructor() {
        this.PRIORITY_TTL = {
            1: 30 * 24 * 60 * 60,    // Critical: 30 days
            2: 14 * 24 * 60 * 60,    // High: 14 days
            3: 7 * 24 * 60 * 60,     // Normal: 7 days
            4: 24 * 60 * 60          // Low: 1 day
        };

        this.TYPE_MODIFIERS = {
            'system': 2.0,           // System notifications live longer
            'security': 3.0,         // Security notifications live much longer
            'social': 1.0,           // Social notifications normal TTL
            'promotional': 0.5       // Promotional shorter TTL
        };
    }

    async sendNotification(userId, notification) {
        const now = new Date();
        const notificationId = cassandra.types.TimeUuid.now();

        // Calculate smart TTL
        const baseTTL = this.PRIORITY_TTL[notification.priority] || this.PRIORITY_TTL[3];
        const typeModifier = this.TYPE_MODIFIERS[notification.type] || 1.0;
        const userPreferences = await this.getUserNotificationPreferences(userId);

        const smartTTL = this.calculateSmartNotificationTTL(
            baseTTL, typeModifier, userPreferences, notification
        );

        // Store notification with calculated TTL
        await client.execute(`
            INSERT INTO user_notifications (
                user_id, priority, created_at, notification_id,
                type, title, message, action_url, read_status, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            USING TTL ?
        `, [
            userId, notification.priority, now, notificationId,
            notification.type, notification.title, notification.message,
            notification.actionUrl, false, notification.metadata || {},
            smartTTL
        ]);

        // Handle push delivery with separate TTL strategy
        await this.schedulePushDelivery(notificationId, userId, notification);

        return notificationId;
    }

    calculateSmartNotificationTTL(baseTTL, typeModifier, userPreferences, notification) {
        let smartTTL = Math.floor(baseTTL * typeModifier);

        // User engagement history affects retention
        if (userPreferences.engagementScore > 0.8) {
            smartTTL *= 1.5; // High engagement users keep notifications longer
        } else if (userPreferences.engagementScore < 0.3) {
            smartTTL *= 0.7; // Low engagement users - shorter retention
        }

        // Special handling for actionable notifications
        if (notification.actionUrl) {
            smartTTL *= 1.3; // Actionable notifications live longer
        }

        // Time-sensitive notifications
        if (notification.metadata && notification.metadata.expires_at) {
            const expiresAt = new Date(notification.metadata.expires_at);
            const timeUntilExpiry = Math.floor((expiresAt - new Date()) / 1000);
            smartTTL = Math.min(smartTTL, Math.max(timeUntilExpiry, 60)); // Min 1 minute
        }

        return smartTTL;
    }

    async schedulePushDelivery(notificationId, userId, notification) {
        const userDevices = await this.getUserDevices(userId);

        for (const device of userDevices) {
            // Different TTL for delivery tracking based on device type
            const deliveryTTL = this.calculateDeliveryTTL(device.type, notification.priority);

            await client.execute(`
                INSERT INTO push_delivery_log (
                    notification_id, user_id, device_token,
                    delivery_status, last_attempt
                ) VALUES (?, ?, ?, ?, ?)
                USING TTL ?
            `, [
                notificationId, userId, device.token,
                'pending', new Date(),
                deliveryTTL
            ]);
        }

        // Retry failed deliveries with exponential backoff TTL
        setTimeout(() => this.retryFailedDeliveries(notificationId), 60000);
    }

    calculateDeliveryTTL(deviceType, priority) {
        const baseTTL = {
            'ios': 7 * 24 * 60 * 60,      // iOS: 7 days
            'android': 5 * 24 * 60 * 60,   // Android: 5 days
            'web': 24 * 60 * 60            // Web: 1 day
        };

        let ttl = baseTTL[deviceType] || baseTTL['web'];

        // High priority notifications keep delivery logs longer
        if (priority <= 2) {
            ttl *= 2;
        }

        return ttl;
    }

    // Advanced: Cleanup read notifications with graduated TTL
    async markAsRead(userId, notificationId) {
        await client.execute(`
            UPDATE user_notifications
            SET read_status = true,
                metadata = metadata + ?
            WHERE user_id = ? AND notification_id = ?
            USING TTL ?
        `, [
            { read_at: new Date().toISOString() },
            userId, notificationId,
            7 * 24 * 60 * 60  // Read notifications: 7 days TTL
        ]);

        // Optionally move to read archive with longer TTL for analytics
        await this.archiveReadNotification(userId, notificationId);
    }
}
```

---

## 🎯 Key Takeaways from Advanced Examples

### 🚀 **Advanced TTL Patterns:**

1. **Dynamic TTL Calculation** - Based on content, user behavior, security context
2. **Graduated Retention** - Different data ages at different rates
3. **Smart Extension** - Extend TTL for important/anomalous data
4. **Tiered Storage** - Raw → Aggregated → Historical với different TTLs
5. **Context-Aware Expiration** - Business rules affect retention periods

### 💡 **Production Benefits:**

- **Zero Manual Cleanup** - Everything expires automatically
- **Storage Optimization** - Important data lives longer, junk expires quickly
- **Security Compliance** - Automatic data retention policies
- **Performance** - No cleanup jobs impacting production
- **Scalability** - TTL scales with your data automatically

### 🎪 **MySQL vs Cassandra:**

**MySQL:** Cần complex cron jobs, manual cleanup, storage monitoring
**Cassandra:** Built-in intelligent expiration, automatic optimization, zero maintenance

**These patterns are impossible to achieve elegantly in MySQL! 🚀⚡**
