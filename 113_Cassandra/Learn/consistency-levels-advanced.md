# ⚖️ Advanced Consistency Levels in Cassandra

**Master tunable consistency for production applications**

## 🎯 Overview

Consistency levels là một trong những **most critical concepts** để master Cassandra production deployment. Đây là điều mà MySQL developers cần hiểu sâu vì nó fundamentally khác với ACID transactions.

---

## 🔍 MySQL vs Cassandra: Consistency Philosophy

### 🔵 MySQL: ACID Consistency (All-or-Nothing)

```sql
-- MySQL: Strong consistency, immediate
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
COMMIT;  -- Either both updates succeed or both fail

-- Read immediately after commit
SELECT * FROM accounts WHERE user_id IN (1, 2);
-- Always returns latest committed data ✅
```

### 🔴 Cassandra: Tunable Consistency (Choose Your Guarantee)

```sql
-- Cassandra: You choose the consistency level
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;  -- With consistency level
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;  -- With consistency level

-- Read với different consistency levels
SELECT * FROM accounts WHERE user_id = 1;  -- Might see old data depending on consistency level
```

**Key Difference:**
- **MySQL:** Always consistent, but limited scale
- **Cassandra:** Choose consistency vs availability vs performance

---

## 📊 Consistency Levels Deep Dive

### Read Consistency Levels

| Level | Nodes Read | Description | Use Case |
|-------|------------|-------------|----------|
| **ONE** | 1 node | Fastest, least consistent | Caching, analytics |
| **TWO** | 2 nodes | Moderate consistency | General applications |
| **THREE** | 3 nodes | Higher consistency | Important data |
| **QUORUM** | (N/2) + 1 | Majority consensus | Default choice |
| **ALL** | All replicas | Strongest consistency | Critical operations |
| **LOCAL_QUORUM** | Local DC majority | DC-aware consensus | Multi-DC setups |
| **EACH_QUORUM** | Quorum in each DC | Cross-DC consistency | Global applications |

### Write Consistency Levels

| Level | Nodes Written | Durability | Performance |
|-------|---------------|------------|-------------|
| **ANY** | ≥1 (including hints) | Lowest | Fastest |
| **ONE** | 1 replica | Low | Very fast |
| **TWO** | 2 replicas | Moderate | Fast |
| **THREE** | 3 replicas | Good | Moderate |
| **QUORUM** | Majority | High | Moderate |
| **ALL** | All replicas | Highest | Slowest |
| **LOCAL_QUORUM** | Local majority | High (local) | Good |

---

## 🎯 Production Consistency Strategies

### Strategy 1: Banking Application (Strong Consistency)

```javascript
class BankingService {
    constructor() {
        // Conservative consistency for financial data
        this.WRITE_CONSISTENCY = cassandra.types.consistencies.quorum;
        this.READ_CONSISTENCY = cassandra.types.consistencies.quorum;
        this.CRITICAL_CONSISTENCY = cassandra.types.consistencies.all;
    }

    async transferMoney(fromAccount, toAccount, amount) {
        // Critical financial operations need ALL consistency
        const batch = new cassandra.types.BatchStatement([], {
            consistency: this.CRITICAL_CONSISTENCY,
            prepare: true
        });

        batch.add(`
            UPDATE accounts
            SET balance = balance - ?, last_transaction = ?
            WHERE account_id = ?
        `, [amount, new Date(), fromAccount]);

        batch.add(`
            UPDATE accounts
            SET balance = balance + ?, last_transaction = ?
            WHERE account_id = ?
        `, [amount, new Date(), toAccount]);

        // Add audit trail với same consistency
        batch.add(`
            INSERT INTO transaction_log
            (transaction_id, from_account, to_account, amount, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `, [uuid(), fromAccount, toAccount, amount, new Date()]);

        try {
            await client.batch(batch);
            console.log(`Transfer completed with ALL consistency`);
        } catch (error) {
            console.error('Transfer failed:', error);
            throw new Error('Transfer failed - no partial updates');
        }
    }

    async getAccountBalance(accountId, requireLatest = true) {
        const consistency = requireLatest ?
            this.CRITICAL_CONSISTENCY :
            this.READ_CONSISTENCY;

        const result = await client.execute(`
            SELECT balance, last_transaction FROM accounts
            WHERE account_id = ?
        `, [accountId], { consistency });

        return result.rows[0];
    }
}
```

### Strategy 2: Social Media Platform (Performance Priority)

```javascript
class SocialMediaService {
    constructor() {
        // Performance-optimized consistency
        this.FAST_WRITE = cassandra.types.consistencies.one;
        this.FAST_READ = cassandra.types.consistencies.one;
        this.IMPORTANT_READ = cassandra.types.consistencies.localQuorum;
    }

    async postUpdate(userId, content) {
        // User posts can tolerate eventual consistency for speed
        await client.execute(`
            INSERT INTO user_posts (user_id, post_id, content, created_at)
            VALUES (?, ?, ?, ?)
        `, [userId, uuid(), content, new Date()], {
            consistency: this.FAST_WRITE  // ONE for maximum speed
        });

        // Update user stats với eventual consistency
        await client.execute(`
            UPDATE user_stats SET post_count = post_count + 1
            WHERE user_id = ?
        `, [userId], {
            consistency: this.FAST_WRITE
        });
    }

    async getUserFeed(userId, limit = 50) {
        // Timeline reads can be eventually consistent
        return await client.execute(`
            SELECT * FROM user_timeline
            WHERE user_id = ? LIMIT ?
        `, [userId, limit], {
            consistency: this.FAST_READ  // Fast timeline loading
        });
    }

    async getUserProfile(userId) {
        // Profile data needs higher consistency
        return await client.execute(`
            SELECT * FROM user_profiles WHERE user_id = ?
        `, [userId], {
            consistency: this.IMPORTANT_READ  // LOCAL_QUORUM for important data
        });
    }
}
```

### Strategy 3: Multi-Datacenter E-commerce

```javascript
class GlobalEcommerceService {
    constructor() {
        // Multi-DC consistency strategy
        this.LOCAL_WRITE = cassandra.types.consistencies.localQuorum;
        this.LOCAL_READ = cassandra.types.consistencies.localQuorum;
        this.GLOBAL_CONSISTENCY = cassandra.types.consistencies.eachQuorum;
    }

    async updateInventory(productId, quantityChange, datacenter) {
        if (datacenter === 'critical') {
            // Inventory updates need global consistency
            await client.execute(`
                UPDATE product_inventory
                SET available_quantity = available_quantity + ?
                WHERE product_id = ?
            `, [quantityChange, productId], {
                consistency: this.GLOBAL_CONSISTENCY  // EACH_QUORUM across all DCs
            });
        } else {
            // Non-critical inventory updates
            await client.execute(`
                UPDATE product_inventory_local
                SET available_quantity = available_quantity + ?
                WHERE product_id = ? AND datacenter = ?
            `, [quantityChange, productId, datacenter], {
                consistency: this.LOCAL_WRITE  // LOCAL_QUORUM for speed
            });
        }
    }

    async getProductInfo(productId, userLocation) {
        const consistency = this.getReadConsistency(userLocation);

        return await client.execute(`
            SELECT * FROM products WHERE product_id = ?
        `, [productId], { consistency });
    }

    getReadConsistency(userLocation) {
        // Smart consistency based on user location
        if (this.isNearDatacenter(userLocation)) {
            return this.LOCAL_READ;  // Fast local reads
        } else {
            return cassandra.types.consistencies.one;  // Any node for distant users
        }
    }
}
```

---

## ⚡ Advanced Consistency Patterns

### Pattern 1: Read-Your-Writes Consistency

```javascript
class ReadYourWritesService {
    constructor() {
        // Track write tokens to ensure read-your-writes
        this.writeTokens = new Map(); // In production, use Redis/cache
    }

    async writeWithToken(userId, data) {
        const writeTime = Date.now();

        // Perform write
        await client.execute(`
            INSERT INTO user_data (user_id, data, write_time)
            VALUES (?, ?, ?)
        `, [userId, data, writeTime], {
            consistency: cassandra.types.consistencies.one
        });

        // Store write token
        this.writeTokens.set(userId, writeTime);

        return writeTime;
    }

    async readWithConsistency(userId) {
        const writeTime = this.writeTokens.get(userId);

        if (writeTime && (Date.now() - writeTime) < 1000) {
            // Recent write - need stronger consistency
            return await client.execute(`
                SELECT * FROM user_data WHERE user_id = ?
            `, [userId], {
                consistency: cassandra.types.consistencies.quorum
            });
        } else {
            // Old data - eventual consistency OK
            return await client.execute(`
                SELECT * FROM user_data WHERE user_id = ?
            `, [userId], {
                consistency: cassandra.types.consistencies.one
            });
        }
    }
}
```

### Pattern 2: Monotonic Read Consistency

```javascript
class MonotonicReadService {
    constructor() {
        this.readTimestamps = new Map();
    }

    async monotonicRead(userId, query, params) {
        const lastReadTime = this.readTimestamps.get(userId) || 0;

        // Try fast read first
        let result = await client.execute(query, params, {
            consistency: cassandra.types.consistencies.one
        });

        // Check if we got newer data than last read
        const resultTime = result.rows[0]?.write_time?.getTime() || 0;

        if (resultTime < lastReadTime) {
            // Data is older than what we've seen - read với higher consistency
            result = await client.execute(query, params, {
                consistency: cassandra.types.consistencies.quorum
            });
        }

        // Update read timestamp
        this.readTimestamps.set(userId, Math.max(resultTime, lastReadTime));

        return result;
    }
}
```

### Pattern 3: Session Consistency

```javascript
class SessionConsistencyService {
    constructor() {
        // Track session consistency requirements
        this.sessionTokens = new Map();
    }

    async startSession(userId, consistencyLevel = 'eventual') {
        const sessionId = uuid();
        const sessionConfig = {
            userId,
            consistencyLevel,
            readConsistency: this.mapConsistencyLevel(consistencyLevel, 'read'),
            writeConsistency: this.mapConsistencyLevel(consistencyLevel, 'write'),
            createdAt: Date.now()
        };

        this.sessionTokens.set(sessionId, sessionConfig);
        return sessionId;
    }

    async sessionRead(sessionId, query, params) {
        const session = this.sessionTokens.get(sessionId);
        if (!session) throw new Error('Invalid session');

        return await client.execute(query, params, {
            consistency: session.readConsistency
        });
    }

    async sessionWrite(sessionId, query, params) {
        const session = this.sessionTokens.get(sessionId);
        if (!session) throw new Error('Invalid session');

        return await client.execute(query, params, {
            consistency: session.writeConsistency
        });
    }

    mapConsistencyLevel(level, operation) {
        const mappings = {
            'eventual': {
                read: cassandra.types.consistencies.one,
                write: cassandra.types.consistencies.one
            },
            'session': {
                read: cassandra.types.consistencies.localQuorum,
                write: cassandra.types.consistencies.localQuorum
            },
            'strong': {
                read: cassandra.types.consistencies.quorum,
                write: cassandra.types.consistencies.quorum
            },
            'linearizable': {
                read: cassandra.types.consistencies.all,
                write: cassandra.types.consistencies.all
            }
        };

        return mappings[level][operation];
    }
}
```

---

## 📊 Performance vs Consistency Trade-offs

### Latency Impact

```javascript
// Performance benchmarks (approximate)
const CONSISTENCY_PERFORMANCE = {
    ONE: { readLatency: '1-2ms', writeLatency: '1-2ms', availability: 'highest' },
    TWO: { readLatency: '2-3ms', writeLatency: '2-3ms', availability: 'high' },
    THREE: { readLatency: '3-4ms', writeLatency: '3-4ms', availability: 'good' },
    QUORUM: { readLatency: '3-5ms', writeLatency: '3-5ms', availability: 'moderate' },
    ALL: { readLatency: '5-10ms', writeLatency: '5-10ms', availability: 'lowest' }
};

class PerformanceOptimizedService {
    async adaptiveConsistencyRead(query, params, requirements) {
        const { maxLatency, minAccuracy } = requirements;

        // Choose consistency based on requirements
        let consistency;
        if (maxLatency <= 2 && minAccuracy <= 0.8) {
            consistency = cassandra.types.consistencies.one;
        } else if (maxLatency <= 5 && minAccuracy <= 0.95) {
            consistency = cassandra.types.consistencies.quorum;
        } else {
            consistency = cassandra.types.consistencies.all;
        }

        const startTime = Date.now();
        const result = await client.execute(query, params, { consistency });
        const duration = Date.now() - startTime;

        console.log(`Query completed in ${duration}ms with ${consistency} consistency`);
        return result;
    }
}
```

### Availability Calculations

```javascript
class AvailabilityCalculator {
    calculateReadAvailability(replicationFactor, consistencyLevel, deadNodes) {
        const aliveNodes = replicationFactor - deadNodes;

        switch(consistencyLevel) {
            case 'ONE':
                return aliveNodes >= 1;
            case 'TWO':
                return aliveNodes >= 2;
            case 'THREE':
                return aliveNodes >= 3;
            case 'QUORUM':
                return aliveNodes >= Math.floor(replicationFactor / 2) + 1;
            case 'ALL':
                return deadNodes === 0;
            default:
                return false;
        }
    }

    // Example: RF=3, QUORUM consistency
    testScenarios() {
        console.log('RF=3, QUORUM reads:');
        console.log('0 dead nodes:', this.calculateReadAvailability(3, 'QUORUM', 0)); // true
        console.log('1 dead node:', this.calculateReadAvailability(3, 'QUORUM', 1));  // true
        console.log('2 dead nodes:', this.calculateReadAvailability(3, 'QUORUM', 2)); // false
    }
}
```

---

## 🚨 Common Consistency Pitfalls

### Pitfall 1: Mismatched Read/Write Consistency

```javascript
// ❌ BAD: Can read stale data
async badExample() {
    // Write với ONE
    await client.execute('INSERT INTO data ...', [], {
        consistency: cassandra.types.consistencies.one
    });

    // Read với ALL immediately after
    const result = await client.execute('SELECT * FROM data ...', [], {
        consistency: cassandra.types.consistencies.all
    });
    // Might not see the data you just wrote!
}

// ✅ GOOD: Matched consistency levels
async goodExample() {
    const consistency = cassandra.types.consistencies.quorum;

    await client.execute('INSERT INTO data ...', [], { consistency });
    const result = await client.execute('SELECT * FROM data ...', [], { consistency });
    // Will see consistent view
}
```

### Pitfall 2: Ignoring Network Partitions

```javascript
class PartitionAwareService {
    async writeWithPartitionTolerance(data) {
        try {
            // Try QUORUM first
            await client.execute('INSERT INTO data ...', [data], {
                consistency: cassandra.types.consistencies.quorum
            });
        } catch (error) {
            if (error.code === 0x1000) { // Unavailable exception
                // Fallback to ONE during partition
                console.warn('Partition detected, falling back to ONE consistency');
                await client.execute('INSERT INTO data ...', [data], {
                    consistency: cassandra.types.consistencies.one
                });
            } else {
                throw error;
            }
        }
    }
}
```

### Pitfall 3: Consistency in Multi-DC

```javascript
// ❌ BAD: Using QUORUM in multi-DC setup
async badMultiDC() {
    // QUORUM might read from remote DC -> high latency
    return await client.execute('SELECT * FROM data WHERE id = ?', [id], {
        consistency: cassandra.types.consistencies.quorum
    });
}

// ✅ GOOD: Use LOCAL_QUORUM for multi-DC
async goodMultiDC() {
    return await client.execute('SELECT * FROM data WHERE id = ?', [id], {
        consistency: cassandra.types.consistencies.localQuorum
    });
}
```

---

## 🎯 Decision Matrix

### Choose Consistency Level Based On:

| Use Case | Read Consistency | Write Consistency | Reasoning |
|----------|------------------|-------------------|-----------|
| **User Analytics** | ONE | ONE | Speed over accuracy |
| **User Profiles** | LOCAL_QUORUM | LOCAL_QUORUM | Balance of speed/accuracy |
| **Financial Data** | QUORUM/ALL | QUORUM/ALL | Accuracy critical |
| **Shopping Cart** | LOCAL_QUORUM | LOCAL_QUORUM | User experience priority |
| **Inventory** | QUORUM | QUORUM | Prevent overselling |
| **Audit Logs** | ONE | ALL | Fast writes, ensure durability |
| **Session Data** | ONE | LOCAL_QUORUM | Fast access, durable storage |
| **Chat Messages** | LOCAL_QUORUM | LOCAL_QUORUM | Regional consistency |

---

## 💡 Best Practices

### 1. Start Conservative, Optimize Later

```javascript
// Begin with safe defaults
const SAFE_DEFAULTS = {
    readConsistency: cassandra.types.consistencies.localQuorum,
    writeConsistency: cassandra.types.consistencies.localQuorum
};

// Optimize specific operations after measuring
const OPTIMIZED = {
    analytics: { read: 'ONE', write: 'ONE' },
    critical: { read: 'ALL', write: 'ALL' },
    normal: { read: 'LOCAL_QUORUM', write: 'LOCAL_QUORUM' }
};
```

### 2. Monitor Consistency Impact

```javascript
class ConsistencyMonitor {
    async executeWithMetrics(query, params, consistency) {
        const startTime = Date.now();
        try {
            const result = await client.execute(query, params, { consistency });
            const duration = Date.now() - startTime;

            this.recordMetrics({
                consistency: consistency.name,
                duration,
                success: true,
                query: query.substring(0, 50)
            });

            return result;
        } catch (error) {
            this.recordMetrics({
                consistency: consistency.name,
                duration: Date.now() - startTime,
                success: false,
                error: error.code
            });
            throw error;
        }
    }
}
```

### 3. Test Failure Scenarios

```javascript
// Simulate node failures in testing
class ConsistencyTesting {
    async testConsistencyLevels() {
        const scenarios = [
            { deadNodes: 0, description: 'All nodes healthy' },
            { deadNodes: 1, description: 'One node down' },
            { deadNodes: 2, description: 'Two nodes down' }
        ];

        for (const scenario of scenarios) {
            console.log(`Testing: ${scenario.description}`);
            await this.testAllConsistencyLevels(scenario.deadNodes);
        }
    }
}
```

---

## 🚀 Key Takeaways

### **Consistency vs Performance:**
- **ONE:** Fastest, least consistent
- **QUORUM:** Sweet spot for most applications
- **ALL:** Slowest, most consistent

### **Multi-DC Considerations:**
- Use **LOCAL_QUORUM** for speed
- Use **EACH_QUORUM** for global consistency
- Avoid **QUORUM** in multi-DC (cross-DC latency)

### **Production Strategy:**
1. **Start conservative** (QUORUM/LOCAL_QUORUM)
2. **Measure performance** impacts
3. **Optimize per use case** (analytics vs critical data)
4. **Plan for failures** (network partitions, node failures)

**Next:** [Advanced Query Optimization](query-optimization.md) 🚀
