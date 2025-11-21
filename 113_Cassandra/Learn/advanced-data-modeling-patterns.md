# 🏗️ Advanced Data Modeling Patterns in Cassandra

**Master-level patterns for complex data structures and relationships**

## 🎯 Overview

Đây là advanced data modeling patterns được sử dụng trong production systems xử lý **terabytes of data** và **millions of operations per second**. Những patterns này đi xa hơn basic denormalization.

---

## ⏰ 1. Time-Series Data Modeling Mastery

### Pattern: Time-Bucketing với Automatic Rollups

```sql
-- Raw sensor data (high-frequency, short retention)
CREATE TABLE sensor_data_raw (
    sensor_id UUID,
    time_bucket BIGINT,      -- Hour epoch (e.g., 1703160000 for 2023-12-21 10:00)
    measurement_time TIMESTAMP,
    measurement_id TIMEUUID,
    temperature DECIMAL,
    humidity DECIMAL,
    pressure DECIMAL,
    metadata MAP<TEXT, TEXT>,
    PRIMARY KEY ((sensor_id, time_bucket), measurement_time, measurement_id)
) WITH CLUSTERING ORDER BY (measurement_time DESC, measurement_id DESC)
  AND default_time_to_live = 86400;  -- 24 hours raw data

-- Pre-aggregated hourly data
CREATE TABLE sensor_data_hourly (
    sensor_id UUID,
    hour_bucket TIMESTAMP,   -- Rounded to hour
    measurement_count BIGINT,
    temperature_avg DECIMAL,
    temperature_min DECIMAL,
    temperature_max DECIMAL,
    temperature_stddev DECIMAL,
    humidity_avg DECIMAL,
    outliers LIST<FROZEN<MAP<TEXT, TEXT>>>,
    data_quality_score DECIMAL,
    PRIMARY KEY (sensor_id, hour_bucket)
) WITH default_time_to_live = 2592000;  -- 30 days aggregated

-- Daily summaries (long-term analytics)
CREATE TABLE sensor_data_daily (
    sensor_id UUID,
    date_bucket DATE,
    hourly_stats LIST<FROZEN<MAP<TEXT, DECIMAL>>>,
    anomalies_detected INT,
    maintenance_required BOOLEAN,
    summary_metadata MAP<TEXT, TEXT>,
    PRIMARY KEY (sensor_id, date_bucket)
) WITH default_time_to_live = 31536000;  -- 1 year summaries
```

### Advanced Time-Series Query Patterns

```javascript
class AdvancedTimeSeriesManager {

    // Smart time-bucket calculation
    getTimeBucket(timestamp, bucketSize = 'hour') {
        const date = new Date(timestamp);
        switch(bucketSize) {
            case 'minute':
                date.setSeconds(0, 0);
                return Math.floor(date.getTime() / 1000);
            case 'hour':
                date.setMinutes(0, 0, 0);
                return Math.floor(date.getTime() / 1000);
            case 'day':
                date.setHours(0, 0, 0, 0);
                return Math.floor(date.getTime() / 1000);
        }
    }

    // Insert với intelligent bucketing
    async insertSensorData(sensorId, measurements) {
        const now = new Date();
        const timeBucket = this.getTimeBucket(now);
        const measurementId = cassandra.types.TimeUuid.now();

        // Insert raw data
        await client.execute(`
            INSERT INTO sensor_data_raw (
                sensor_id, time_bucket, measurement_time, measurement_id,
                temperature, humidity, pressure, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            sensorId, timeBucket, now, measurementId,
            measurements.temperature, measurements.humidity,
            measurements.pressure, measurements.metadata || {}
        ]);

        // Trigger aggregation if bucket is full
        if (await this.isTimeBucketComplete(sensorId, timeBucket)) {
            await this.aggregateHourlyData(sensorId, timeBucket);
        }
    }

    // Multi-resolution queries
    async getTimeSeriesData(sensorId, startTime, endTime, resolution = 'auto') {
        const duration = endTime - startTime;

        // Smart resolution selection
        let table, grouping;
        if (resolution === 'auto') {
            if (duration <= 24 * 60 * 60 * 1000) { // <= 24 hours
                table = 'sensor_data_raw';
                grouping = 'raw';
            } else if (duration <= 30 * 24 * 60 * 60 * 1000) { // <= 30 days
                table = 'sensor_data_hourly';
                grouping = 'hourly';
            } else {
                table = 'sensor_data_daily';
                grouping = 'daily';
            }
        }

        const query = this.buildTimeRangeQuery(table, sensorId, startTime, endTime);
        const result = await client.execute(query.cql, query.params);

        return {
            resolution: grouping,
            dataPoints: result.rows,
            metadata: {
                table: table,
                duration: duration,
                pointCount: result.rows.length
            }
        };
    }

    // Advanced pattern: Sliding window aggregations
    async getSlidingWindowStats(sensorId, windowSize, stepSize, metric = 'temperature') {
        const windows = [];
        const now = Date.now();

        for (let i = 0; i < 24; i++) { // Last 24 windows
            const windowEnd = now - (i * stepSize);
            const windowStart = windowEnd - windowSize;

            const stats = await this.calculateWindowStats(
                sensorId, windowStart, windowEnd, metric
            );

            windows.push({
                windowStart: new Date(windowStart),
                windowEnd: new Date(windowEnd),
                ...stats
            });
        }

        return windows;
    }
}
```

---

## 🌳 2. Hierarchical Data Structures

### Pattern: Adjacency List với Path Materialization

```sql
-- Organization hierarchy
CREATE TABLE org_hierarchy (
    org_id UUID,
    node_id UUID,
    parent_id UUID,
    node_path TEXT,          -- e.g., "root/engineering/backend/api-team"
    node_level INT,          -- Depth in hierarchy
    node_type TEXT,          -- department, team, individual
    node_name TEXT,
    node_metadata MAP<TEXT, TEXT>,
    children_count COUNTER,
    PRIMARY KEY (org_id, node_id)
);

-- Materialized paths for efficient queries
CREATE TABLE org_paths (
    org_id UUID,
    path_prefix TEXT,        -- e.g., "root/engineering"
    node_level INT,
    node_id UUID,
    full_path TEXT,
    node_name TEXT,
    PRIMARY KEY ((org_id, path_prefix), node_level, node_id)
) WITH CLUSTERING ORDER BY (node_level ASC, node_id ASC);

-- Ancestor-descendant relationships
CREATE TABLE org_relationships (
    org_id UUID,
    ancestor_id UUID,
    descendant_id UUID,
    relationship_depth INT,
    relationship_path LIST<UUID>,
    PRIMARY KEY ((org_id, ancestor_id), relationship_depth, descendant_id)
) WITH CLUSTERING ORDER BY (relationship_depth ASC);
```

### Advanced Hierarchical Operations

```javascript
class HierarchicalDataManager {

    // Insert node với automatic path calculation
    async insertNode(orgId, nodeData, parentId = null) {
        const nodeId = uuid();
        let nodePath, nodeLevel;

        if (parentId) {
            // Get parent information
            const parent = await this.getNode(orgId, parentId);
            nodePath = `${parent.node_path}/${nodeData.name}`;
            nodeLevel = parent.node_level + 1;

            // Update parent's children count
            await client.execute(`
                UPDATE org_hierarchy SET children_count = children_count + 1
                WHERE org_id = ? AND node_id = ?
            `, [orgId, parentId]);
        } else {
            nodePath = `root/${nodeData.name}`;
            nodeLevel = 1;
        }

        // Batch insert into multiple tables
        const batch = [
            // Main hierarchy table
            {
                query: `INSERT INTO org_hierarchy
                        (org_id, node_id, parent_id, node_path, node_level, node_type, node_name, node_metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [orgId, nodeId, parentId, nodePath, nodeLevel, nodeData.type, nodeData.name, nodeData.metadata || {}]
            },
            // Path materialization for efficient queries
            {
                query: `INSERT INTO org_paths
                        (org_id, path_prefix, node_level, node_id, full_path, node_name)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                params: [orgId, this.getPathPrefix(nodePath), nodeLevel, nodeId, nodePath, nodeData.name]
            }
        ];

        // Create ancestor-descendant relationships
        if (parentId) {
            const ancestors = await this.getAncestors(orgId, parentId);
            for (const ancestor of ancestors) {
                batch.push({
                    query: `INSERT INTO org_relationships
                            (org_id, ancestor_id, descendant_id, relationship_depth, relationship_path)
                            VALUES (?, ?, ?, ?, ?)`,
                    params: [orgId, ancestor.node_id, nodeId, ancestor.depth + 1, [...ancestor.path, nodeId]]
                });
            }
        }

        await client.batch(batch, { prepare: true });
        return { nodeId, nodePath, nodeLevel };
    }

    // Get all descendants at specific depth
    async getDescendantsAtLevel(orgId, ancestorId, targetLevel) {
        return await client.execute(`
            SELECT descendant_id, relationship_path
            FROM org_relationships
            WHERE org_id = ? AND ancestor_id = ? AND relationship_depth = ?
        `, [orgId, ancestorId, targetLevel]);
    }

    // Get subtree (all descendants)
    async getSubtree(orgId, rootId, maxDepth = null) {
        let query = `
            SELECT * FROM org_relationships
            WHERE org_id = ? AND ancestor_id = ?
        `;
        const params = [orgId, rootId];

        if (maxDepth) {
            query += ` AND relationship_depth <= ?`;
            params.push(maxDepth);
        }

        const relationships = await client.execute(query, params);

        // Build tree structure
        return this.buildTreeFromRelationships(relationships.rows);
    }

    // Advanced: Move subtree (complex operation)
    async moveSubtree(orgId, nodeId, newParentId) {
        // This is complex - need to update all paths and relationships
        const subtree = await this.getSubtree(orgId, nodeId);
        const newParent = await this.getNode(orgId, newParentId);

        // Calculate new paths for entire subtree
        const pathUpdates = this.calculateNewPaths(subtree, newParent);

        // Batch update all affected records
        const batch = [];
        for (const update of pathUpdates) {
            batch.push({
                query: `UPDATE org_hierarchy SET node_path = ?, node_level = ? WHERE org_id = ? AND node_id = ?`,
                params: [update.newPath, update.newLevel, orgId, update.nodeId]
            });
        }

        await client.batch(batch, { prepare: true });

        // Rebuild relationships for moved subtree
        await this.rebuildRelationships(orgId, nodeId);
    }
}
```

---

## 🔗 3. Graph-Like Data Patterns

### Pattern: Adjacency Lists với Bidirectional Relationships

```sql
-- User connections (social graph)
CREATE TABLE user_connections (
    user_id UUID,
    connection_type TEXT,    -- 'friend', 'follow', 'block', 'colleague'
    connected_user_id UUID,
    connection_strength DECIMAL,  -- 0.0 to 1.0
    connection_metadata MAP<TEXT, TEXT>,
    created_at TIMESTAMP,
    last_interaction TIMESTAMP,
    PRIMARY KEY (user_id, connection_type, connected_user_id)
) WITH CLUSTERING ORDER BY (connection_type ASC, connected_user_id ASC);

-- Reverse lookup for bidirectional queries
CREATE TABLE user_reverse_connections (
    user_id UUID,           -- Who is being connected to
    connection_type TEXT,
    connecting_user_id UUID, -- Who is connecting
    connection_strength DECIMAL,
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, connection_type, connecting_user_id)
) WITH CLUSTERING ORDER BY (connection_type ASC, connecting_user_id ASC);

-- Graph traversal support (2-3 hops)
CREATE TABLE connection_paths (
    start_user_id UUID,
    end_user_id UUID,
    path_length INT,
    path_nodes LIST<UUID>,
    path_strength DECIMAL,   -- Minimum strength in path
    path_types LIST<TEXT>,   -- Connection types in path
    calculated_at TIMESTAMP,
    PRIMARY KEY ((start_user_id, path_length), end_user_id)
) WITH default_time_to_live = 86400;  -- Recalculate daily

-- Connection recommendations
CREATE TABLE connection_suggestions (
    user_id UUID,
    suggestion_score DECIMAL,
    suggested_user_id UUID,
    suggestion_reason TEXT,
    mutual_connections INT,
    common_interests SET<TEXT>,
    suggestion_metadata MAP<TEXT, TEXT>,
    PRIMARY KEY (user_id, suggestion_score, suggested_user_id)
) WITH CLUSTERING ORDER BY (suggestion_score DESC, suggested_user_id ASC)
  AND default_time_to_live = 604800;  -- Weekly refresh
```

### Advanced Graph Operations

```javascript
class GraphDataManager {

    // Create bidirectional connection
    async createConnection(userId1, userId2, connectionType, metadata = {}) {
        const now = new Date();
        const connectionStrength = this.calculateConnectionStrength(connectionType, metadata);

        const batch = [
            // Forward direction
            {
                query: `INSERT INTO user_connections
                        (user_id, connection_type, connected_user_id, connection_strength,
                         connection_metadata, created_at, last_interaction)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                params: [userId1, connectionType, userId2, connectionStrength, metadata, now, now]
            },
            // Reverse direction
            {
                query: `INSERT INTO user_reverse_connections
                        (user_id, connection_type, connecting_user_id, connection_strength, created_at)
                        VALUES (?, ?, ?, ?, ?)`,
                params: [userId2, connectionType, userId1, connectionStrength, now]
            }
        ];

        await client.batch(batch, { prepare: true });

        // Trigger path recalculation for nearby nodes
        await this.triggerPathRecalculation(userId1, userId2);
    }

    // Find shortest paths (up to 3 hops)
    async findShortestPath(startUserId, endUserId, maxHops = 3) {
        // Try direct connection first
        let result = await client.execute(`
            SELECT * FROM user_connections
            WHERE user_id = ? AND connected_user_id = ?
        `, [startUserId, endUserId]);

        if (result.rows.length > 0) {
            return {
                path: [startUserId, endUserId],
                length: 1,
                strength: result.rows[0].connection_strength
            };
        }

        // Check precomputed paths
        result = await client.execute(`
            SELECT * FROM connection_paths
            WHERE start_user_id = ? AND end_user_id = ? AND path_length <= ?
            LIMIT 1
        `, [startUserId, endUserId, maxHops]);

        if (result.rows.length > 0) {
            return {
                path: result.rows[0].path_nodes,
                length: result.rows[0].path_length,
                strength: result.rows[0].path_strength
            };
        }

        // If no precomputed path, calculate on-demand (expensive)
        return await this.calculateShortestPathOnDemand(startUserId, endUserId, maxHops);
    }

    // Get mutual connections
    async getMutualConnections(userId1, userId2, connectionType = 'friend') {
        // Get connections for user1
        const user1Connections = await client.execute(`
            SELECT connected_user_id FROM user_connections
            WHERE user_id = ? AND connection_type = ?
        `, [userId1, connectionType]);

        const connectionIds = user1Connections.rows.map(row => row.connected_user_id);

        if (connectionIds.length === 0) return [];

        // Find which of user1's connections are also connected to user2
        const mutualQuery = `
            SELECT connected_user_id, connection_strength FROM user_connections
            WHERE user_id = ? AND connection_type = ? AND connected_user_id IN ?
        `;

        const mutuals = await client.execute(mutualQuery, [userId2, connectionType, connectionIds]);
        return mutuals.rows;
    }

    // Generate connection suggestions
    async generateConnectionSuggestions(userId, limit = 50) {
        // Algorithm: Friends of friends who are not already connected
        const userConnections = await this.getConnections(userId, 'friend');
        const suggestionCandidates = new Map();

        // For each friend, get their friends
        for (const connection of userConnections) {
            const friendsOfFriend = await this.getConnections(connection.connected_user_id, 'friend');

            for (const candidate of friendsOfFriend) {
                if (candidate.connected_user_id === userId) continue; // Skip self
                if (userConnections.some(c => c.connected_user_id === candidate.connected_user_id)) continue; // Skip existing

                const score = suggestionCandidates.get(candidate.connected_user_id) || 0;
                suggestionCandidates.set(candidate.connected_user_id, score + 1);
            }
        }

        // Store suggestions
        const batch = [];
        const now = new Date();

        for (const [suggestedUserId, mutualCount] of suggestionCandidates.entries()) {
            const score = this.calculateSuggestionScore(mutualCount, userId, suggestedUserId);

            batch.push({
                query: `INSERT INTO connection_suggestions
                        (user_id, suggestion_score, suggested_user_id, suggestion_reason,
                         mutual_connections, suggestion_metadata)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                params: [
                    userId, score, suggestedUserId,
                    `${mutualCount} mutual friends`, mutualCount,
                    { algorithm: 'friends_of_friends', calculated_at: now.toISOString() }
                ]
            });
        }

        if (batch.length > 0) {
            await client.batch(batch.slice(0, limit), { prepare: true });
        }

        return suggestionCandidates;
    }

    // Advanced: Graph analytics
    async calculateGraphMetrics(userId) {
        const connections = await this.getAllConnections(userId);

        return {
            degree: connections.length,
            clustering_coefficient: await this.calculateClusteringCoefficient(userId),
            betweenness_centrality: await this.calculateBetweennessCentrality(userId),
            pagerank_score: await this.getPageRankScore(userId),
            community_detection: await this.detectCommunities(userId)
        };
    }
}
```

---

## 📊 4. Event Sourcing Pattern

### Pattern: Immutable Event Log với Snapshots

```sql
-- Event store
CREATE TABLE event_log (
    aggregate_id UUID,
    event_timestamp TIMESTAMP,
    event_id TIMEUUID,
    event_type TEXT,
    event_version INT,
    event_data TEXT,         -- JSON serialized event
    event_metadata MAP<TEXT, TEXT>,
    causation_id UUID,       -- What caused this event
    correlation_id UUID,     -- Group related events
    PRIMARY KEY (aggregate_id, event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp ASC, event_id ASC);

-- Aggregate snapshots (performance optimization)
CREATE TABLE aggregate_snapshots (
    aggregate_id UUID,
    snapshot_version BIGINT,
    snapshot_timestamp TIMESTAMP,
    aggregate_data TEXT,     -- JSON serialized state
    events_count BIGINT,
    PRIMARY KEY (aggregate_id, snapshot_version)
) WITH CLUSTERING ORDER BY (snapshot_version DESC);

-- Event projections (read models)
CREATE TABLE user_balance_projection (
    user_id UUID,
    current_balance DECIMAL,
    last_transaction_id TIMEUUID,
    last_updated TIMESTAMP,
    transaction_count COUNTER,
    PRIMARY KEY (user_id)
);

-- Event index by type
CREATE TABLE events_by_type (
    event_type TEXT,
    event_timestamp TIMESTAMP,
    event_id TIMEUUID,
    aggregate_id UUID,
    PRIMARY KEY (event_type, event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp DESC, event_id DESC);
```

### Event Sourcing Implementation

```javascript
class EventSourcingManager {

    // Store event và update projections
    async storeEvent(aggregateId, eventType, eventData, metadata = {}) {
        const eventId = cassandra.types.TimeUuid.now();
        const now = new Date();
        const eventVersion = await this.getNextEventVersion(aggregateId);

        const batch = [
            // Store in main event log
            {
                query: `INSERT INTO event_log
                        (aggregate_id, event_timestamp, event_id, event_type, event_version,
                         event_data, event_metadata, correlation_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    aggregateId, now, eventId, eventType, eventVersion,
                    JSON.stringify(eventData), metadata, metadata.correlationId || eventId
                ]
            },
            // Index by event type
            {
                query: `INSERT INTO events_by_type
                        (event_type, event_timestamp, event_id, aggregate_id)
                        VALUES (?, ?, ?, ?)`,
                params: [eventType, now, eventId, aggregateId]
            }
        ];

        await client.batch(batch, { prepare: true });

        // Update projections asynchronously
        await this.updateProjections(aggregateId, eventType, eventData, eventId);

        // Check if snapshot needed
        if (eventVersion % 100 === 0) { // Snapshot every 100 events
            await this.createSnapshot(aggregateId, eventVersion);
        }

        return { eventId, eventVersion };
    }

    // Rebuild aggregate từ events
    async rebuildAggregate(aggregateId, targetVersion = null) {
        // Try to load latest snapshot first
        const snapshot = await this.getLatestSnapshot(aggregateId);
        let aggregate = snapshot ? JSON.parse(snapshot.aggregate_data) : null;
        let fromVersion = snapshot ? snapshot.snapshot_version : 0;

        // Load events since snapshot
        let query = `
            SELECT * FROM event_log
            WHERE aggregate_id = ? AND event_version > ?
        `;
        const params = [aggregateId, fromVersion];

        if (targetVersion) {
            query += ` AND event_version <= ?`;
            params.push(targetVersion);
        }

        query += ` ORDER BY event_timestamp ASC`;

        const events = await client.execute(query, params);

        // Apply events to aggregate
        for (const event of events.rows) {
            aggregate = this.applyEvent(aggregate, event);
        }

        return aggregate;
    }

    // Create aggregate snapshot
    async createSnapshot(aggregateId, version) {
        const aggregate = await this.rebuildAggregate(aggregateId, version);

        await client.execute(`
            INSERT INTO aggregate_snapshots
            (aggregate_id, snapshot_version, snapshot_timestamp, aggregate_data, events_count)
            VALUES (?, ?, ?, ?, ?)
        `, [
            aggregateId, version, new Date(),
            JSON.stringify(aggregate), version
        ]);
    }

    // Update read projections
    async updateProjections(aggregateId, eventType, eventData, eventId) {
        // Example: Update user balance projection
        if (eventType === 'MoneyDeposited' || eventType === 'MoneyWithdrawn') {
            const balanceChange = eventType === 'MoneyDeposited' ?
                eventData.amount : -eventData.amount;

            await client.execute(`
                UPDATE user_balance_projection
                SET current_balance = current_balance + ?,
                    last_transaction_id = ?,
                    last_updated = ?,
                    transaction_count = transaction_count + 1
                WHERE user_id = ?
            `, [balanceChange, eventId, new Date(), aggregateId]);
        }

        // Add more projection updates as needed
        await this.updateCustomProjections(aggregateId, eventType, eventData);
    }

    // Query events by time range
    async getEventsByTimeRange(startTime, endTime, eventTypes = null) {
        if (eventTypes && eventTypes.length > 0) {
            // Query specific event types
            const results = await Promise.all(
                eventTypes.map(eventType =>
                    client.execute(`
                        SELECT * FROM events_by_type
                        WHERE event_type = ?
                        AND event_timestamp >= ?
                        AND event_timestamp <= ?
                    `, [eventType, startTime, endTime])
                )
            );

            return results.flat().map(result => result.rows).flat();
        } else {
            // This requires a full table scan - expensive!
            console.warn('Querying all events by time range is expensive');
            // In production, you'd need a separate time-indexed table
            return await this.getAllEventsByTimeRange(startTime, endTime);
        }
    }
}
```

---

## 🎯 Key Takeaways

### **Advanced Patterns Summary:**

1. **Time-Series Mastery:** Multi-resolution data với intelligent bucketing
2. **Hierarchical Data:** Path materialization và ancestor-descendant tables
3. **Graph Structures:** Bidirectional relationships với path precomputation
4. **Event Sourcing:** Immutable event log với performance snapshots

### **Production Benefits:**

- **Scalability:** Handle billions of records efficiently
- **Performance:** Sub-10ms queries even at massive scale
- **Flexibility:** Support complex business requirements
- **Maintainability:** Clear patterns for team development

### **When to Use These Patterns:**

- **Time-Series:** IoT, financial data, monitoring systems
- **Hierarchical:** Organization charts, category trees, file systems
- **Graph:** Social networks, recommendation engines, fraud detection
- **Event Sourcing:** Financial systems, audit trails, CQRS architectures

**Next:** [Secondary Indexes vs Materialized Views](indexes-vs-materialized-views.md) 🚀
