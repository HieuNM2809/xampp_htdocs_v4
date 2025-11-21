# ⚡ Production Performance Tuning - Cassandra Optimization Guide

**Master-level performance optimization for production workloads**

## 🎯 Overview

Performance tuning trong Cassandra production environments requires understanding của **hardware, JVM, query patterns, và data modeling**. Đây là guide để achieve **consistent sub-10ms latencies** at scale.

---

## 🔧 Hardware Optimization

### CPU & Memory Configuration

```yaml
# Production hardware recommendations
production_specs:
  cpu:
    cores: 16+ (32+ for write-heavy workloads)
    architecture: x64 with SSE4.2 support
    clock_speed: "3.0+ GHz base, 4.0+ GHz turbo"

  memory:
    total_ram: "64GB minimum, 128GB+ recommended"
    heap_size: "8-16GB (no more than 50% of total RAM)"
    off_heap: "Remaining RAM for OS cache và off-heap storage"

  storage:
    type: "NVMe SSD (required for production)"
    capacity: "2-4TB per node"
    iops: "10,000+ random IOPS"
    throughput: "500+ MB/s sequential"

  network:
    bandwidth: "10Gbps minimum"
    latency: "<1ms inter-node"
    redundancy: "Bonded NICs recommended"
```

### Storage Layout Optimization

```bash
# Optimal filesystem layout
/var/lib/cassandra/
├── data/           # Data files on fastest SSD
├── commitlog/      # Commit log on separate SSD (if possible)
├── saved_caches/   # Caches on fast storage
└── hints/          # Hints on separate volume

# Mount options for performance
/dev/nvme0n1 /var/lib/cassandra/data xfs rw,noatime,nodiratime,noexec 0 0
/dev/nvme1n1 /var/lib/cassandra/commitlog xfs rw,noatime,nodiratime 0 0
```

---

## 🚀 JVM Tuning

### Garbage Collection Optimization

```bash
# G1GC configuration for production (Cassandra 4.0+)
JVM_OPTS="$JVM_OPTS -Xms16g -Xmx16g"  # Set heap size
JVM_OPTS="$JVM_OPTS -XX:+UseG1GC"     # Use G1 collector
JVM_OPTS="$JVM_OPTS -XX:G1HeapRegionSize=32m"
JVM_OPTS="$JVM_OPTS -XX:MaxGCPauseMillis=200"     # Target < 200ms pauses
JVM_OPTS="$JVM_OPTS -XX:G1NewSizePercent=20"      # 20% for young generation
JVM_OPTS="$JVM_OPTS -XX:G1MaxNewSizePercent=30"   # Max 30% for young generation
JVM_OPTS="$JVM_OPTS -XX:InitiatingHeapOccupancyPercent=45"  # Start GC at 45%

# Advanced G1 tuning
JVM_OPTS="$JVM_OPTS -XX:G1MixedGCCountTarget=8"
JVM_OPTS="$JVM_OPTS -XX:G1HeapWastePercent=10"
JVM_OPTS="$JVM_OPTS -XX:G1MixedGCLiveThresholdPercent=85"

# Off-heap optimizations
JVM_OPTS="$JVM_OPTS -XX:+UnlockExperimentalVMOptions"
JVM_OPTS="$JVM_OPTS -XX:+UseLargePages"            # Use huge pages
JVM_OPTS="$JVM_OPTS -XX:+AlwaysPreTouch"           # Pre-touch memory

# Performance monitoring
JVM_OPTS="$JVM_OPTS -XX:+PrintGCDetails"
JVM_OPTS="$JVM_OPTS -XX:+PrintGCTimeStamps"
JVM_OPTS="$JVM_OPTS -Xloggc:/var/log/cassandra/gc.log"
```

### Memory Management

```javascript
// Monitor JVM memory usage
class JVMMonitor {
    async getMemoryStats() {
        // Via JMX monitoring
        const stats = await this.queryJMX([
            'java.lang:type=Memory:HeapMemoryUsage',
            'java.lang:type=Memory:NonHeapMemoryUsage',
            'java.lang:type=GarbageCollector,name=G1 Young Generation',
            'java.lang:type=GarbageCollector,name=G1 Old Generation'
        ]);

        return {
            heap: {
                used: stats.heapUsed,
                max: stats.heapMax,
                usage_percent: (stats.heapUsed / stats.heapMax) * 100
            },
            gc: {
                youngGC: {
                    collections: stats.youngCollections,
                    time: stats.youngCollectionTime,
                    avgTime: stats.youngCollectionTime / stats.youngCollections
                },
                oldGC: {
                    collections: stats.oldCollections,
                    time: stats.oldCollectionTime,
                    avgTime: stats.oldCollectionTime / stats.oldCollections
                }
            }
        };
    }

    async optimizeHeapSize(workloadCharacteristics) {
        const { writeHeavy, readHeavy, dataSize } = workloadCharacteristics;

        let recommendedHeap = 16; // GB, baseline

        if (writeHeavy && dataSize > 1000) { // 1TB+
            recommendedHeap = 24;
        } else if (readHeavy) {
            recommendedHeap = 12; // More off-heap for cache
        }

        console.log(`Recommended heap size: ${recommendedHeap}GB`);
        return recommendedHeap;
    }
}
```

---

## 📊 Query Performance Optimization

### Smart Query Analysis

```javascript
class QueryOptimizer {
    constructor() {
        this.queryStats = new Map();
        this.slowQueryThreshold = 10; // 10ms
    }

    async analyzeQuery(query, params, executionTime) {
        const queryPattern = this.extractPattern(query);
        const stats = this.queryStats.get(queryPattern) || {
            count: 0,
            totalTime: 0,
            maxTime: 0,
            minTime: Infinity,
            slowQueries: []
        };

        stats.count++;
        stats.totalTime += executionTime;
        stats.maxTime = Math.max(stats.maxTime, executionTime);
        stats.minTime = Math.min(stats.minTime, executionTime);
        stats.avgTime = stats.totalTime / stats.count;

        if (executionTime > this.slowQueryThreshold) {
            stats.slowQueries.push({
                query: query.substring(0, 100),
                params: params.slice(0, 3), // First 3 params only
                time: executionTime,
                timestamp: new Date()
            });
        }

        this.queryStats.set(queryPattern, stats);

        // Auto-optimization suggestions
        if (stats.avgTime > 5 && stats.count > 100) {
            await this.suggestOptimizations(queryPattern, stats);
        }
    }

    async suggestOptimizations(pattern, stats) {
        const suggestions = [];

        if (pattern.includes('ALLOW FILTERING')) {
            suggestions.push({
                type: 'SCHEMA',
                message: 'Consider adding secondary index or redesigning table',
                impact: 'HIGH',
                pattern: pattern
            });
        }

        if (stats.avgTime > 20) {
            suggestions.push({
                type: 'PARTITION',
                message: 'Check partition size - might be too large',
                impact: 'HIGH',
                avgTime: stats.avgTime
            });
        }

        if (suggestions.length > 0) {
            await this.logOptimizationSuggestions(pattern, suggestions);
        }
    }

    // Query pattern detection
    extractPattern(query) {
        return query
            .replace(/\s+/g, ' ')
            .replace(/'[^']*'/g, '?')
            .replace(/\b\d+\b/g, '?')
            .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '?')
            .toLowerCase()
            .trim();
    }
}
```

### Advanced Query Profiling

```javascript
class QueryProfiler {
    async profileQuery(query, params) {
        const traceId = uuid();

        // Enable tracing for this query
        await client.execute('TRACING ON');

        const startTime = process.hrtime.bigint();
        const result = await client.execute(query, params);
        const endTime = process.hrtime.bigint();

        const executionTimeMs = Number(endTime - startTime) / 1000000;

        // Get trace session
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for trace
        const traces = await client.execute(
            'SELECT * FROM system_traces.sessions WHERE session_id = ?',
            [result.info.traceId]
        );

        const events = await client.execute(
            'SELECT * FROM system_traces.events WHERE session_id = ?',
            [result.info.traceId]
        );

        await client.execute('TRACING OFF');

        return {
            executionTime: executionTimeMs,
            traceId: result.info.traceId,
            coordinator: result.info.queriedHost,
            achievedConsistency: result.info.achievedConsistency,
            traceSession: traces.rows[0],
            traceEvents: events.rows,
            analysis: this.analyzeTrace(traces.rows[0], events.rows)
        };
    }

    analyzeTrace(session, events) {
        const analysis = {
            bottlenecks: [],
            recommendations: [],
            timing: {}
        };

        // Analyze timing
        events.forEach(event => {
            const description = event.activity;
            const duration = event.source_elapsed || 0;

            if (duration > 5000) { // > 5ms
                analysis.bottlenecks.push({
                    activity: description,
                    duration: duration / 1000, // Convert to ms
                    source: event.source
                });
            }
        });

        // Generate recommendations
        if (analysis.bottlenecks.some(b => b.activity.includes('Read repair'))) {
            analysis.recommendations.push('Consider tuning read_repair_chance');
        }

        if (analysis.bottlenecks.some(b => b.activity.includes('Merged from'))) {
            analysis.recommendations.push('Multiple SSTables read - consider compaction');
        }

        return analysis;
    }
}
```

---

## 🏗️ Schema Performance Optimization

### Partition Size Analysis

```javascript
class PartitionAnalyzer {
    async analyzePartitionSizes(keyspace, table, sampleSize = 1000) {
        // Get partition size distribution
        const partitionSizes = await client.execute(`
            SELECT token(partition_key), COUNT(*) as row_count
            FROM ${keyspace}.${table}
            GROUP BY token(partition_key)
            LIMIT ${sampleSize}
        `);

        const stats = this.calculateDistribution(partitionSizes.rows);

        return {
            sampleSize: partitionSizes.rows.length,
            averageRowsPerPartition: stats.avg,
            medianRowsPerPartition: stats.median,
            maxRowsPerPartition: stats.max,
            partitionsOver1000Rows: stats.large.length,
            recommendations: this.generatePartitionRecommendations(stats)
        };
    }

    generatePartitionRecommendations(stats) {
        const recommendations = [];

        if (stats.max > 10000) {
            recommendations.push({
                severity: 'CRITICAL',
                message: `Very large partition detected (${stats.max} rows). Consider bucketing strategy.`,
                action: 'Add time-based or hash-based bucketing to partition key'
            });
        }

        if (stats.avg > 1000) {
            recommendations.push({
                severity: 'WARNING',
                message: `Average partition size is large (${stats.avg} rows)`,
                action: 'Review partition key design for better distribution'
            });
        }

        if (stats.large.length / stats.total > 0.1) {
            recommendations.push({
                severity: 'WARNING',
                message: '10%+ of partitions are over 1000 rows',
                action: 'Consider remodeling to reduce partition sizes'
            });
        }

        return recommendations;
    }

    // Suggest optimal bucketing strategy
    async suggestBucketing(keyspace, table, partitionKey) {
        const temporalAnalysis = await this.analyzeTemporalDistribution(keyspace, table);

        if (temporalAnalysis.isTimeSeries) {
            return {
                strategy: 'TIME_BUCKETING',
                suggestion: `
                    -- Add time-based bucketing
                    CREATE TABLE ${table}_optimized (
                        ${partitionKey} UUID,
                        time_bucket TEXT,  -- e.g., '2023-12', '2023-12-01'
                        created_at TIMESTAMP,
                        -- other columns
                        PRIMARY KEY ((${partitionKey}, time_bucket), created_at)
                    ) WITH CLUSTERING ORDER BY (created_at DESC);
                `,
                benefits: [
                    'Limits partition growth over time',
                    'Enables efficient time-range queries',
                    'Improves compaction performance'
                ]
            };
        } else {
            return {
                strategy: 'HASH_BUCKETING',
                suggestion: `
                    -- Add hash-based bucketing
                    CREATE TABLE ${table}_optimized (
                        ${partitionKey} UUID,
                        bucket INT,        -- hash(${partitionKey}) % 100
                        -- other columns
                        PRIMARY KEY ((${partitionKey}, bucket), clustering_columns...)
                    );
                `,
                benefits: [
                    'Even distribution across partitions',
                    'Predictable partition sizes',
                    'Better load distribution'
                ]
            };
        }
    }
}
```

### Compaction Strategy Optimization

```javascript
class CompactionOptimizer {
    analyzeWorkloadForCompaction(workloadCharacteristics) {
        const {
            writePattern,
            readPattern,
            dataLifecycle,
            avgPartitionSize,
            writeRate,
            readRate
        } = workloadCharacteristics;

        let recommendedStrategy;
        let config;

        if (dataLifecycle === 'TIME_SERIES' && writePattern === 'APPEND_ONLY') {
            // Time-series data with TTL
            recommendedStrategy = 'TimeWindowCompactionStrategy';
            config = {
                'compaction_window_size': 1,
                'compaction_window_unit': 'DAYS',
                'timestamp_resolution': 'MICROSECONDS'
            };
        } else if (writePattern === 'UPDATE_HEAVY' && avgPartitionSize < 1000) {
            // Frequent updates, small partitions
            recommendedStrategy = 'LeveledCompactionStrategy';
            config = {
                'sstable_size_in_mb': 160,
                'fanout_size': 10
            };
        } else {
            // General purpose workload
            recommendedStrategy = 'SizeTieredCompactionStrategy';
            config = {
                'min_threshold': 4,
                'max_threshold': 32,
                'bucket_low': 0.5,
                'bucket_high': 1.5
            };
        }

        return {
            strategy: recommendedStrategy,
            configuration: config,
            reasoning: this.explainStrategy(recommendedStrategy, workloadCharacteristics)
        };
    }

    async applyCompactionOptimization(keyspace, table, strategy, config) {
        const configString = Object.entries(config)
            .map(([key, value]) => `'${key}': '${value}'`)
            .join(', ');

        const alterQuery = `
            ALTER TABLE ${keyspace}.${table}
            WITH compaction = {
                'class': '${strategy}',
                ${configString}
            }
        `;

        console.log('Applying compaction optimization:', alterQuery);
        await client.execute(alterQuery);
    }

    // Monitor compaction performance
    async monitorCompaction(keyspace, table) {
        const compactionStats = await this.getCompactionMetrics(keyspace, table);

        return {
            pendingTasks: compactionStats.pending_tasks,
            completedTasks: compactionStats.completed_tasks,
            bytesCompacted: compactionStats.bytes_compacted,
            avgCompactionTime: compactionStats.avg_compaction_time,
            recommendations: this.analyzeCompactionHealth(compactionStats)
        };
    }
}
```

---

## 📈 Cache Optimization

### Advanced Caching Strategy

```javascript
class CacheOptimizer {
    constructor() {
        this.cacheMetrics = new Map();
    }

    async optimizeRowCache(keyspace, table, workloadPattern) {
        const currentStats = await this.getTableCacheStats(keyspace, table);

        let recommendation;

        if (workloadPattern.readHeavy && workloadPattern.hotDataPercent > 80) {
            // Hot data concentrated - enable row cache
            recommendation = {
                row_cache_size_in_mb: Math.min(2048, workloadPattern.workingSetMB * 0.3),
                row_cache_save_period: 14400, // 4 hours
                enable: true
            };
        } else if (workloadPattern.randomReads && currentStats.hitRate < 0.1) {
            // Poor cache performance - disable row cache
            recommendation = {
                row_cache_size_in_mb: 0,
                enable: false,
                reason: 'Poor hit rate for random read pattern'
            };
        } else {
            recommendation = {
                row_cache_size_in_mb: 512, // Conservative default
                enable: true
            };
        }

        return recommendation;
    }

    async optimizeKeyCache(nodeMemory, numberOfTables) {
        // Key cache holds partition keys
        const recommendedSize = Math.min(
            nodeMemory * 0.05, // 5% of node memory
            numberOfTables * 100 // 100MB per table max
        );

        return {
            key_cache_size_in_mb: recommendedSize,
            key_cache_save_period: 14400,
            recommendations: [
                'Key cache should always be enabled',
                'Size based on number of partitions',
                'Monitor hit rate - should be >95%'
            ]
        };
    }

    // Advanced: Adaptive cache sizing
    async adaptiveCacheSizing(keyspace, table) {
        const stats = await this.collectCacheStats(keyspace, table, 3600); // 1 hour

        const currentHitRate = stats.requests > 0 ? stats.hits / stats.requests : 0;
        const currentSize = stats.size_mb;

        let newSize = currentSize;

        if (currentHitRate < 0.8 && stats.evictions > stats.requests * 0.1) {
            // Low hit rate with high evictions - increase cache
            newSize = Math.min(currentSize * 1.5, 4096);
        } else if (currentHitRate > 0.95 && stats.evictions < stats.requests * 0.01) {
            // Very high hit rate with low evictions - can reduce cache
            newSize = Math.max(currentSize * 0.8, 256);
        }

        if (newSize !== currentSize) {
            await this.updateCacheSize(keyspace, table, newSize);
            console.log(`Adjusted cache size from ${currentSize}MB to ${newSize}MB`);
        }

        return { oldSize: currentSize, newSize, hitRate: currentHitRate };
    }
}
```

---

## 🌐 Network & I/O Optimization

### Connection Pool Tuning

```javascript
class ConnectionOptimizer {
    getOptimalPoolSize(expectedConcurrency, nodeCount) {
        // Connection pool sizing formula
        const baseConnections = Math.max(2, Math.ceil(expectedConcurrency / nodeCount));
        const maxConnections = baseConnections * 2;

        return {
            coreConnections: baseConnections,
            maxConnections: maxConnections,
            maxRequestsPerConnection: 128,
            heartbeatInterval: 30000,

            // Connection pool configuration
            poolingOptions: {
                coreConnectionsPerHost: {
                    [cassandra.types.distance.local]: baseConnections,
                    [cassandra.types.distance.remote]: 1
                },
                maxConnectionsPerHost: {
                    [cassandra.types.distance.local]: maxConnections,
                    [cassandra.types.distance.remote]: 2
                },
                maxRequestsPerConnection: 128,
                heartBeatInterval: 30000
            }
        };
    }

    // Smart load balancing
    createSmartLoadBalancer(datacenters) {
        return new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy(
            datacenters.local, // Local datacenter name
            datacenters.remote.length // Number of remote hosts to use
        );
    }

    // Connection monitoring
    async monitorConnectionHealth(client) {
        const state = client.getState();
        const hosts = state.getConnectedHosts();

        const hostHealth = hosts.map(host => ({
            address: host.address,
            datacenter: host.datacenter,
            rack: host.rack,
            connections: host.getOpenConnections(),
            inFlightQueries: host.getInFlightQueries(),
            isUp: host.isUp()
        }));

        // Detect unhealthy hosts
        const unhealthyHosts = hostHealth.filter(host =>
            !host.isUp || host.connections === 0 || host.inFlightQueries > 100
        );

        if (unhealthyHosts.length > 0) {
            console.warn('Unhealthy hosts detected:', unhealthyHosts);
        }

        return { hostHealth, unhealthyHosts };
    }
}
```

### I/O Performance Tuning

```yaml
# Cassandra.yaml optimizations
concurrent_reads: 32              # CPU cores
concurrent_writes: 32             # CPU cores
concurrent_counter_writes: 32     # CPU cores
concurrent_materialized_view_writes: 32

# Commit log optimizations
commitlog_sync: periodic          # For throughput
commitlog_sync_period_in_ms: 10000
commitlog_segment_size_in_mb: 32
commitlog_compression:
  - class_name: LZ4Compressor

# Memtable settings
memtable_allocation_type: heap_buffers
memtable_heap_space_in_mb: 2048
memtable_offheap_space_in_mb: 2048
memtable_cleanup_threshold: 0.11
memtable_flush_writers: 2

# SSTable settings
sstable_preemptive_open_interval_in_mb: 50
max_hint_window_in_ms: 10800000   # 3 hours
hinted_handoff_enabled: true
max_hints_delivery_threads: 2
hints_flush_period_in_ms: 10000
```

---

## 📊 Real-Time Performance Monitoring

### Comprehensive Metrics Dashboard

```javascript
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            latency: new Map(),
            throughput: new Map(),
            errors: new Map(),
            resources: new Map()
        };
    }

    async collectSystemMetrics() {
        // Collect comprehensive performance metrics
        const jmxMetrics = await this.queryJMX([
            // Latency metrics
            'org.apache.cassandra.metrics:type=ClientRequest,scope=Read,name=Latency',
            'org.apache.cassandra.metrics:type=ClientRequest,scope=Write,name=Latency',

            // Throughput metrics
            'org.apache.cassandra.metrics:type=ClientRequest,scope=Read,name=Timeouts',
            'org.apache.cassandra.metrics:type=ClientRequest,scope=Write,name=Timeouts',

            // Storage metrics
            'org.apache.cassandra.metrics:type=Storage,name=Load',
            'org.apache.cassandra.metrics:type=Storage,name=Exceptions',

            // Compaction metrics
            'org.apache.cassandra.metrics:type=Compaction,name=PendingTasks',
            'org.apache.cassandra.metrics:type=Compaction,name=BytesCompacted'
        ]);

        return this.processMetrics(jmxMetrics);
    }

    async generatePerformanceReport(timeWindow = 3600) {
        const metrics = await this.collectSystemMetrics();
        const historicalData = await this.getHistoricalMetrics(timeWindow);

        const report = {
            timestamp: new Date(),
            performance: {
                read_latency_p99: metrics.readLatency.p99,
                write_latency_p99: metrics.writeLatency.p99,
                read_throughput: metrics.readThroughput,
                write_throughput: metrics.writeThroughput,
                error_rate: metrics.errorRate
            },
            health: {
                gc_pause_time: metrics.gc.pauseTime,
                heap_usage_percent: metrics.memory.heapUsage,
                disk_usage_percent: metrics.storage.diskUsage,
                compaction_pending: metrics.compaction.pending
            },
            trends: this.analyzeTrends(historicalData),
            recommendations: this.generateRecommendations(metrics, historicalData)
        };

        return report;
    }

    generateRecommendations(current, historical) {
        const recommendations = [];

        // Latency recommendations
        if (current.readLatency.p99 > 10) {
            recommendations.push({
                category: 'LATENCY',
                severity: 'HIGH',
                message: 'Read latency p99 > 10ms',
                actions: [
                    'Check for hot partitions',
                    'Review query patterns',
                    'Consider adding indexes',
                    'Optimize cache configuration'
                ]
            });
        }

        // GC recommendations
        if (current.gc.pauseTime > 200) {
            recommendations.push({
                category: 'GC',
                severity: 'MEDIUM',
                message: 'GC pause time > 200ms',
                actions: [
                    'Tune G1GC parameters',
                    'Reduce heap size if possible',
                    'Enable off-heap storage'
                ]
            });
        }

        // Compaction recommendations
        if (current.compaction.pending > 10) {
            recommendations.push({
                category: 'COMPACTION',
                severity: 'MEDIUM',
                message: 'High pending compaction tasks',
                actions: [
                    'Review compaction strategy',
                    'Increase concurrent_compactors',
                    'Check disk I/O performance'
                ]
            });
        }

        return recommendations;
    }
}
```

---

## 🎯 Performance Benchmarking

### Comprehensive Load Testing

```javascript
class CassandraBenchmark {
    constructor(clusterInfo) {
        this.cluster = clusterInfo;
        this.results = new Map();
    }

    async runComprehensiveBenchmark() {
        const benchmarks = [
            { name: 'sequential_writes', test: this.benchmarkSequentialWrites },
            { name: 'random_reads', test: this.benchmarkRandomReads },
            { name: 'mixed_workload', test: this.benchmarkMixedWorkload },
            { name: 'large_partitions', test: this.benchmarkLargePartitions },
            { name: 'time_series', test: this.benchmarkTimeSeries }
        ];

        const results = {};

        for (const benchmark of benchmarks) {
            console.log(`Running ${benchmark.name} benchmark...`);
            results[benchmark.name] = await benchmark.test.call(this);
            await this.sleep(10000); // Cool down between tests
        }

        return {
            cluster: this.cluster,
            timestamp: new Date(),
            results,
            summary: this.generateSummary(results)
        };
    }

    async benchmarkSequentialWrites(duration = 60000, concurrency = 100) {
        const startTime = Date.now();
        const promises = [];
        const stats = { operations: 0, errors: 0, latencies: [] };

        // Generate concurrent write load
        for (let i = 0; i < concurrency; i++) {
            promises.push(this.sequentialWriteWorker(stats, startTime + duration));
        }

        await Promise.all(promises);

        return {
            operations_per_second: stats.operations / (duration / 1000),
            error_rate: stats.errors / stats.operations,
            latency_p50: this.percentile(stats.latencies, 50),
            latency_p95: this.percentile(stats.latencies, 95),
            latency_p99: this.percentile(stats.latencies, 99),
            total_operations: stats.operations
        };
    }

    async sequentialWriteWorker(stats, endTime) {
        while (Date.now() < endTime) {
            const startOp = process.hrtime.bigint();

            try {
                await client.execute(`
                    INSERT INTO benchmark_table (id, data, timestamp)
                    VALUES (?, ?, ?)
                `, [uuid(), this.generateRandomData(1000), new Date()]);

                const latency = Number(process.hrtime.bigint() - startOp) / 1000000;
                stats.latencies.push(latency);
                stats.operations++;
            } catch (error) {
                stats.errors++;
            }
        }
    }

    generateSummary(results) {
        return {
            peak_write_throughput: Math.max(...Object.values(results).map(r => r.operations_per_second || 0)),
            avg_read_latency_p99: Object.values(results).reduce((sum, r) => sum + (r.latency_p99 || 0), 0) / Object.keys(results).length,
            overall_error_rate: Object.values(results).reduce((sum, r) => sum + (r.error_rate || 0), 0) / Object.keys(results).length,
            recommendations: this.generatePerformanceRecommendations(results)
        };
    }
}
```

---

## 🚀 Key Performance Optimization Takeaways

### **Hardware Foundation:**
- **NVMe SSDs mandatory** for production latencies
- **16+ CPU cores** for write-heavy workloads
- **64+ GB RAM** với proper heap sizing (25-50% of total)
- **10Gbps network** với low inter-node latency

### **JVM Tuning Critical:**
- **G1GC với proper tuning** for consistent low latency
- **Off-heap storage** để reduce GC pressure
- **Large pages và memory pre-touching** for performance

### **Query Optimization:**
- **Eliminate ALLOW FILTERING** in production queries
- **Monitor partition sizes** - keep under 10K rows
- **Use query tracing** for bottleneck identification
- **Optimize consistency levels** per use case

### **Schema Design Impact:**
- **Proper partitioning strategy** affects all performance
- **Compaction strategy** must match workload pattern
- **Cache configuration** based on access patterns
- **Time-bucketing** for time-series data

### **Monitoring Essential:**
- **Real-time metrics** for proactive optimization
- **Query pattern analysis** for schema improvements
- **Resource utilization** tracking
- **Automated alerting** on performance degradation

**Target:** **<10ms p99 latencies at 100K+ ops/second** 🎯

**Next:** [Multi-Datacenter Production Deployment](multi-datacenter-deployment.md) 🌍
