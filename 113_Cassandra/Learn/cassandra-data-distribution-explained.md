# 🌐 Cassandra Data Distribution - Detailed Explanation

**Deep dive into how Cassandra distributes data across cluster nodes**

## 🎯 Overview

Đây là một trong những điểm khác biệt **quan trọng nhất** giữa MySQL và Cassandra. Trong khi MySQL lưu trữ tất cả data trên một server (hoặc master-slave setup), Cassandra **tự động phân phối data** across multiple nodes trong cluster.

---

## 📊 The Diagram Explained

```
Cassandra Cluster (3 nodes)
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Node 1  │    │ Node 2  │    │ Node 3  │
│ Tokens: │    │ Tokens: │    │ Tokens: │
│ 0-33%   │    │ 34-66%  │    │ 67-100% │
│         │    │         │    │         │
│ Users:  │    │ Users:  │    │ Users:  │
│ A-F     │    │ G-M     │    │ N-Z     │
└─────────┘    └─────────┘    └─────────┘
```

**Hãy phân tích từng thành phần:**

### 🔑 1. Token Ranges
- **Token 0-33%**: Node 1 chịu trách nhiệm cho 1/3 của token space
- **Token 34-66%**: Node 2 chịu trách nhiệm cho 1/3 tiếp theo
- **Token 67-100%**: Node 3 chịu trách nhiệm cho 1/3 cuối

### 👤 2. User Data Distribution
- **Users A-F**: Lưu trữ trên Node 1
- **Users G-M**: Lưu trữ trên Node 2
- **Users N-Z**: Lưu trữ trên Node 3

---

## 🔍 How It Actually Works

### Step 1: Consistent Hashing Algorithm

```javascript
// Simplified example of how Cassandra distributes data
function getTokenForPartitionKey(partitionKey) {
    // Cassandra uses Murmur3 hash function
    const hash = murmur3Hash(partitionKey);

    // Convert to token range (0 to 2^63-1)
    const token = Math.abs(hash) % Math.pow(2, 63);

    return token;
}

// Example:
const userJohn = getTokenForPartitionKey("john_doe");     // Token: 1234567890
const userJane = getTokenForPartitionKey("jane_smith");   // Token: 7890123456
const userBob = getTokenForPartitionKey("bob_johnson");   // Token: 4567890123
```

### Step 2: Token Ring

```
Token Ring (Simplified):
     0
     │
2^63-1 ────────────── 2^63/3
     │                    │
     │      Node 1        │
     │                    │
  2^63*2/3 ────────────── 2^63*2/3
           Node 2    Node 3
```

### Step 3: Node Assignment

```javascript
// Simplified node assignment logic
function getNodeForToken(token, nodes) {
    for (let node of nodes) {
        if (token >= node.startToken && token <= node.endToken) {
            return node;
        }
    }
}

// Example cluster setup:
const cluster = [
    { id: 'Node1', startToken: 0,           endToken: 6148914691236517205 },
    { id: 'Node2', startToken: 6148914691236517206, endToken: 12297829382473034410 },
    { id: 'Node3', startToken: 12297829382473034411, endToken: 18446744073709551615 }
];
```

---

## 🆚 MySQL vs Cassandra: Storage Comparison

### 🔵 MySQL Centralized Storage

```sql
-- MySQL: Everything on one server
MySQL Server (192.168.1.100)
┌─────────────────────────────┐
│ Database: ecommerce         │
│ ├── users (all users)      │
│ ├── products (all products)│
│ ├── orders (all orders)    │
│ └── ...                    │
└─────────────────────────────┘

-- Single point of:
-- ✅ Consistency
-- ❌ Failure
-- ❌ Bottleneck
-- ❌ Scale limit
```

**Pros:**
- ✅ ACID transactions across all data
- ✅ Complex JOINs possible
- ✅ Simple backup/restore
- ✅ Easy to understand

**Cons:**
- ❌ Single point of failure
- ❌ Limited by hardware of one machine
- ❌ Difficult to scale writes
- ❌ Expensive to scale vertically

### 🔴 Cassandra Distributed Storage

```sql
-- Cassandra: Data spread across cluster
Node 1 (192.168.1.101)     Node 2 (192.168.1.102)     Node 3 (192.168.1.103)
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Keyspace: ecommerce │    │ Keyspace: ecommerce │    │ Keyspace: ecommerce │
│ ├── users (A-F)    │    │ ├── users (G-M)    │    │ ├── users (N-Z)    │
│ ├── products (33%) │    │ ├── products (33%) │    │ ├── products (33%) │
│ ├── orders (33%)   │    │ ├── orders (33%)   │    │ ├── orders (33%)   │
│ └── ...             │    │ └── ...             │    │ └── ...             │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

**Pros:**
- ✅ No single point of failure
- ✅ Horizontal scaling (add more nodes)
- ✅ High availability
- ✅ Linear performance scaling

**Cons:**
- ❌ Eventually consistent
- ❌ No cross-node JOINs
- ❌ More complex operations
- ❌ Learning curve

---

## 🔧 Detailed Technical Implementation

### 1. Partition Key Hashing

```javascript
// Real example with user data
CREATE TABLE users (
    user_id UUID PRIMARY KEY,  -- This is the PARTITION KEY
    name TEXT,
    email TEXT
);

// When you insert:
INSERT INTO users (user_id, name, email)
VALUES (550e8400-e29b-41d4-a716-446655440000, 'John Doe', 'john@example.com');

// Cassandra calculates:
const partitionKey = "550e8400-e29b-41d4-a716-446655440000";
const token = murmur3Hash(partitionKey);  // Example: 1234567890
const node = getNodeForToken(token);      // Example: Node 2

// Data goes to Node 2
```

### 2. Compound Partition Keys

```javascript
// More complex example
CREATE TABLE user_posts (
    user_id UUID,
    post_date DATE,
    post_id UUID,
    title TEXT,
    PRIMARY KEY ((user_id, post_date), post_id)  -- Compound partition key
);

// Partition key = (user_id + post_date)
const partitionKey = user_id + ":" + post_date;
const token = murmur3Hash(partitionKey);
const node = getNodeForToken(token);
```

### 3. Replication Strategy

```sql
-- Simple Strategy (single datacenter)
CREATE KEYSPACE ecommerce
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 3  -- Each data copied to 3 nodes
};

-- Network Topology Strategy (multiple datacenters)
CREATE KEYSPACE ecommerce
WITH REPLICATION = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3,
    'datacenter2': 2
};
```

**With Replication Factor 3:**
```
Data for User "John Doe":
Primary: Node 1
Replica 1: Node 2
Replica 2: Node 3

-- If Node 1 fails, Node 2 or Node 3 can serve the data
```

---

## 📈 Scaling Comparison

### 🔵 MySQL Scaling Journey

```
Stage 1: Single Server
┌─────────────┐
│ MySQL       │  ← All data here
│ 100GB, 10K  │
│ users/sec   │
└─────────────┘

Stage 2: Master-Slave
┌─────────────┐    ┌─────────────┐
│ Master      │───▶│ Slave 1     │
│ (writes)    │    │ (reads)     │
└─────────────┘    └─────────────┘
                          │
                   ┌─────────────┐
                   │ Slave 2     │
                   │ (reads)     │
                   └─────────────┘

Stage 3: Sharding (Complex!)
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Shard 1     │    │ Shard 2     │    │ Shard 3     │
│ Users A-H   │    │ Users I-P   │    │ Users Q-Z   │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Application │    │ Application │    │ Application │
│ Logic       │    │ Logic       │    │ Logic       │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 🔴 Cassandra Scaling Journey

```
Stage 1: 3-Node Cluster
┌─────┐ ┌─────┐ ┌─────┐
│Node1│ │Node2│ │Node3│  ← Built-in distribution
└─────┘ └─────┘ └─────┘

Stage 2: Scale Out (Add Node 4)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Node1│ │Node2│ │Node3│ │Node4│  ← Automatic rebalancing
└─────┘ └─────┘ └─────┘ └─────┘

Stage 3: Multi-Datacenter
Datacenter 1:           Datacenter 2:
┌─────┐ ┌─────┐        ┌─────┐ ┌─────┐
│Node1│ │Node2│   ───▶ │Node5│ │Node6│
└─────┘ └─────┘        └─────┘ └─────┘
┌─────┐ ┌─────┐        ┌─────┐ ┌─────┐
│Node3│ │Node4│        │Node7│ │Node8│
└─────┘ └─────┘        └─────┘ └─────┘
```

---

## 🎯 Real-World Example: E-commerce Platform

### User Data Distribution

```javascript
// E-commerce users distributed across 3 nodes
const users = [
    // Node 1 (Tokens 0-33%)
    { userId: "alice_smith", email: "alice@example.com" },      // Hash: 15%
    { userId: "bob_jones", email: "bob@example.com" },          // Hash: 25%
    { userId: "charlie_brown", email: "charlie@example.com" },  // Hash: 30%

    // Node 2 (Tokens 34-66%)
    { userId: "diana_wilson", email: "diana@example.com" },     // Hash: 45%
    { userId: "frank_miller", email: "frank@example.com" },     // Hash: 55%
    { userId: "grace_taylor", email: "grace@example.com" },     // Hash: 60%

    // Node 3 (Tokens 67-100%)
    { userId: "henry_davis", email: "henry@example.com" },      // Hash: 75%
    { userId: "iris_johnson", email: "iris@example.com" },      // Hash: 85%
    { userId: "jack_williams", email: "jack@example.com" }      // Hash: 95%
];
```

### Query Routing

```javascript
// When client queries for user "diana_wilson"
const partitionKey = "diana_wilson";
const token = murmur3Hash(partitionKey);  // Result: 45% of token range

// Cassandra routes to Node 2 (34-66% range)
const targetNode = "Node 2";

// Client connects directly to Node 2 for this query
SELECT * FROM users WHERE user_id = 'diana_wilson';  // Executes on Node 2
```

---

## ⚡ Performance Implications

### 1. Read Performance

```javascript
// MySQL: All reads from one server
MySQL Query: SELECT * FROM users WHERE user_id = 'john_doe';
└─ Hits single MySQL server
   ├─ Check indexes
   ├─ Read from disk/memory
   └─ Return result
   Performance: 10-50ms (depending on server load)

// Cassandra: Direct node access
Cassandra Query: SELECT * FROM users WHERE user_id = 'john_doe';
└─ Calculate token for 'john_doe'
   ├─ Route to Node 2 (token range match)
   ├─ Read directly from Node 2
   └─ Return result
   Performance: 1-5ms (no central bottleneck)
```

### 2. Write Performance

```javascript
// MySQL: Single point for writes
MySQL Insert: INSERT INTO users (...) VALUES (...);
└─ All writes go to Master
   ├─ Write to binlog
   ├─ Replicate to slaves
   └─ Confirm write
   Performance: 5-20ms + replication lag

// Cassandra: Distributed writes
Cassandra Insert: INSERT INTO users (...) VALUES (...);
└─ Calculate token for partition key
   ├─ Write to appropriate node(s)
   ├─ Replicate to configured replicas
   └─ Confirm write (based on consistency level)
   Performance: 1-10ms (parallel writes)
```

### 3. Scaling Performance

```
MySQL Performance vs Data Size:
Data Size:  1GB    10GB   100GB   1TB
Response:   1ms    5ms    20ms    100ms+
Reason: Single server handling all requests

Cassandra Performance vs Data Size:
Data Size:  1GB    10GB   100GB   1TB
Response:   1ms    1ms    1ms     1ms
Reason: Data distributed, each node handles subset
```

---

## 🛠️ Practical Configuration

### 1. Setting Up Token Ranges

```bash
# View token ranges in your cluster
nodetool ring

# Example output:
# Address    Rack1  Status State   Load       Owns   Token
# 127.0.0.1  RAC1   Up     Normal  1.2 MB     33.3%  -9223372036854775808
# 127.0.0.2  RAC1   Up     Normal  1.1 MB     33.3%  -3074457345618258603
# 127.0.0.3  RAC1   Up     Normal  1.3 MB     33.4%  3074457345618258602
```

### 2. Monitoring Data Distribution

```bash
# Check data distribution per node
nodetool status

# Example output:
# Status=Up/Down
# |/ State=Normal/Leaving/Joining/Moving
# --  Address    Load       Tokens  Owns    Host ID                               Rack
# UN  127.0.0.1  1.2 MB     256     33.3%   550e8400-e29b-41d4-a716-446655440000  rack1
# UN  127.0.0.2  1.1 MB     256     33.3%   550e8400-e29b-41d4-a716-446655440001  rack1
# UN  127.0.0.3  1.3 MB     256     33.4%   550e8400-e29b-41d4-a716-446655440002  rack1
```

### 3. Handling Hot Partitions

```javascript
// Bad: Creates hot partition (all data goes to one node)
CREATE TABLE user_events (
    event_date DATE,           -- Bad partition key: only few values per day
    event_time TIMESTAMP,
    user_id UUID,
    event_type TEXT,
    PRIMARY KEY (event_date, event_time, user_id)
);

// Good: Better distribution
CREATE TABLE user_events (
    user_id UUID,              -- Good partition key: high cardinality
    event_date DATE,
    event_time TIMESTAMP,
    event_type TEXT,
    PRIMARY KEY (user_id, event_date, event_time)
) WITH CLUSTERING ORDER BY (event_date DESC, event_time DESC);
```

---

## 🎯 Key Takeaways

### 🧠 Mental Model Shift

**MySQL Thinking:**
- "Where is my data?" → "On the MySQL server"
- "How do I query it?" → "Connect to MySQL, run SQL"
- "How do I scale?" → "Bigger server or complex sharding"

**Cassandra Thinking:**
- "Where is my data?" → "Distributed across cluster based on partition key"
- "How do I query it?" → "Query routes to appropriate node(s)"
- "How do I scale?" → "Add more nodes, automatic rebalancing"

### 📊 Distribution Benefits

1. **No Single Point of Failure**: If one node dies, others continue
2. **Linear Scaling**: Add nodes = more capacity
3. **Local Reads**: Each node serves subset of data
4. **Parallel Writes**: Multiple nodes can accept writes simultaneously
5. **Geographic Distribution**: Nodes can be in different datacenters

### ⚠️ Trade-offs to Consider

1. **Complexity**: More complex than single-server MySQL
2. **Eventual Consistency**: Data might not be immediately consistent across all nodes
3. **No Cross-Node JOINs**: Can't join data across different nodes
4. **Operational Overhead**: Need to monitor multiple nodes

---

## 🚀 Next Steps

Now that you understand data distribution, you should:

1. **📖 Read Next:** [Learn/05-schema-design.md](05-schema-design.md) - How to design effective partition keys
2. **🧪 Practice:** Try setting up a 3-node cluster locally
3. **🔬 Experiment:** Insert data and see how it gets distributed
4. **📊 Monitor:** Use `nodetool` to observe token ranges and data distribution

**Remember:** This distributed architecture is what makes Cassandra scale to petabytes and handle millions of operations per second! 🌟
