# ⏰ How TTL Actually Works - "Tự Xóa" Process Explained

**Understanding the mechanics behind Cassandra's automatic data expiration**

## 🎯 Quick Answer

**Có, TTL nghĩa là data "tự xóa"**, nhưng **không phải ngay lập tức**. Đây là một process có nhiều bước và cần hiểu rõ để tránh confusion.

---

## 🔍 TTL Lifecycle: From Insert to Deletion

### Step 1: Insert với TTL
```sql
INSERT INTO user_sessions (session_id, user_data)
VALUES ('sess_123', '{"user":"john"}')
USING TTL 3600;  -- Will expire in 1 hour

-- Timestamp lúc insert: 2023-12-01 10:00:00
-- Expiration time: 2023-12-01 11:00:00
```

### Step 2: Data Still Exists (but marked)
```
Time: 10:30:00 (30 minutes later)
┌─────────────────────────────────────┐
│ Data still physically exists        │
│ TTL remaining: 1800 seconds         │
│ Status: ACTIVE                      │
└─────────────────────────────────────┘
```

### Step 3: Expiration Time Reached
```
Time: 11:00:00 (expiration reached)
┌─────────────────────────────────────┐
│ Data marked as EXPIRED              │
│ TTL remaining: 0                    │
│ Status: LOGICALLY DELETED           │
└─────────────────────────────────────┘
```

### Step 4: Physical Deletion (Later)
```
Time: 11:15:00 (after compaction)
┌─────────────────────────────────────┐
│ Data physically removed             │
│ Storage space reclaimed             │
│ Status: PHYSICALLY DELETED          │
└─────────────────────────────────────┘
```

---

## 🆚 MySQL "DELETE" vs Cassandra "TTL Expire"

### 🔵 MySQL DELETE (Immediate)

```sql
-- MySQL: Immediate deletion
DELETE FROM sessions WHERE session_id = 'sess_123';
-- ↓ Immediately after execution:
SELECT * FROM sessions WHERE session_id = 'sess_123';
-- Result: Empty (0 rows)
```

**MySQL DELETE Process:**
```
Before: [session_data] ← Data exists
 ↓ DELETE command
After:  [ ] ← Data gone immediately (with some exceptions)
```

### 🔴 Cassandra TTL (Gradual Process)

```sql
-- Cassandra: TTL expiration
INSERT INTO sessions (session_id, data) VALUES ('sess_123', 'data') USING TTL 3600;
-- Wait 1 hour...
SELECT * FROM sessions WHERE session_id = 'sess_123';
-- Result: Empty (0 rows) ← Data appears gone to application
```

**Cassandra TTL Process:**
```
T+0:    [session_data] ← Data exists, TTL=3600
T+3600: [expired_data] ← Data marked expired (logical delete)
T+????:  [ ] ← Data physically removed during compaction
```

---

## 🔧 The Technical Details

### 1. Tombstone Creation

Khi data expire, Cassandra tạo một **"tombstone"**:

```
Before Expiration:
┌─────────────────────┐
│ session_id: sess_123│
│ data: {"user":"john"}│
│ ttl: 3600 seconds   │
└─────────────────────┘

After Expiration:
┌─────────────────────┐
│ session_id: sess_123│
│ TOMBSTONE: expired  │ ← Special marker
│ ttl: 0              │
└─────────────────────┘
```

### 2. Query Behavior

```javascript
// Application perspective
const result = await client.execute(
    'SELECT * FROM sessions WHERE session_id = ?',
    ['sess_123']
);

console.log(result.rows.length);
// If expired: 0 (appears deleted)
// If active: 1 (data returned)
```

**Cassandra filters out expired data automatically:**
```
Query: SELECT * FROM sessions WHERE session_id = 'sess_123'
  ↓
Cassandra checks TTL
  ↓
If expired: Return empty result (appears deleted)
If active: Return data normally
```

### 3. Compaction Process

```
SSTable Before Compaction:
[active_data_1] [expired_data_2] [active_data_3] [expired_data_4]

SSTable After Compaction:
[active_data_1] [active_data_3]  ← Expired data physically removed
```

---

## ⏰ Timeline Examples

### Example 1: Session Data

```sql
-- 10:00:00 - Insert session
INSERT INTO user_sessions (session_id, user_data)
VALUES ('sess_abc', '{}') USING TTL 3600;

-- 10:30:00 - Query session (30 minutes later)
SELECT * FROM user_sessions WHERE session_id = 'sess_abc';
-- Result: 1 row returned ✅

-- 11:00:00 - Query session (60 minutes later - EXPIRED!)
SELECT * FROM user_sessions WHERE session_id = 'sess_abc';
-- Result: 0 rows returned ❌ (appears deleted)

-- 11:00:01 - Try to insert same session_id
INSERT INTO user_sessions (session_id, user_data)
VALUES ('sess_abc', '{"new": "data"}');
-- Works fine! ✅ Old data is logically gone
```

### Example 2: Cache Data

```javascript
// Node.js application
async function testTTL() {
    // Insert with 5 second TTL
    await client.execute(
        'INSERT INTO cache (key, value) VALUES (?, ?) USING TTL ?',
        ['test_key', 'test_value', 5]
    );

    // Check immediately
    let result = await client.execute('SELECT * FROM cache WHERE key = ?', ['test_key']);
    console.log('T+0:', result.rows.length); // 1 (exists)

    // Wait 3 seconds
    setTimeout(async () => {
        result = await client.execute('SELECT * FROM cache WHERE key = ?', ['test_key']);
        console.log('T+3:', result.rows.length); // 1 (still exists)
    }, 3000);

    // Wait 6 seconds (past expiration)
    setTimeout(async () => {
        result = await client.execute('SELECT * FROM cache WHERE key = ?', ['test_key']);
        console.log('T+6:', result.rows.length); // 0 (appears deleted!)
    }, 6000);
}
```

---

## 🔍 Monitoring TTL Expiration

### 1. Check Remaining TTL

```sql
-- Check how much time left
SELECT key, value, TTL(value) as seconds_remaining
FROM cache
WHERE key = 'test_key';

-- Example results:
-- key='test_key', value='data', seconds_remaining=2847
-- key='test_key', value='data', seconds_remaining=null (no TTL set)
-- (empty result = expired or doesn't exist)
```

### 2. Real-time Monitoring

```javascript
async function monitorTTL(key) {
    const checkInterval = setInterval(async () => {
        const result = await client.execute(
            'SELECT key, TTL(value) as ttl FROM cache WHERE key = ?',
            [key]
        );

        if (result.rows.length === 0) {
            console.log(`${key}: EXPIRED/NOT FOUND`);
            clearInterval(checkInterval);
        } else {
            const ttl = result.rows[0].ttl;
            console.log(`${key}: ${ttl} seconds remaining`);
        }
    }, 1000); // Check every second
}

// Usage
await client.execute('INSERT INTO cache (key, value) VALUES (?, ?) USING TTL ?', ['monitor_me', 'data', 10]);
monitorTTL('monitor_me');

// Output:
// monitor_me: 9 seconds remaining
// monitor_me: 8 seconds remaining
// monitor_me: 7 seconds remaining
// ...
// monitor_me: 1 seconds remaining
// monitor_me: EXPIRED/NOT FOUND
```

---

## ⚠️ Important Gotchas

### 1. Expiration is Not Instant at Storage Level

```sql
-- Data expires at 11:00:00
-- Query at 11:00:01 returns empty (appears deleted)
-- But data might still physically exist until compaction runs
```

### 2. Tombstone Overhead

```
Too many expired records can create "tombstone pressure":
┌──────────────────────────────────────┐
│ Active Data: 10%                     │
│ Tombstones: 90% ← Performance impact │
└──────────────────────────────────────┘
```

### 3. Compaction Timing

```
Compaction doesn't run immediately:
- Minor compactions: Every few minutes
- Major compactions: Hours/days
- gc_grace_seconds: Default 10 days before tombstone removal
```

### 4. Clock Synchronization

```
Different nodes might have slightly different times:
Node 1 time: 11:00:00 ← Data expired
Node 2 time: 10:59:58 ← Data still active (2 second drift)

Solution: Use NTP to sync clocks across cluster
```

---

## 🎯 Practical Implications

### 1. Application Design

```javascript
// ❌ Don't assume immediate deletion
async function badExample() {
    await client.execute('INSERT INTO temp (id, data) VALUES (?, ?) USING TTL 1', [id, data]);
    // Wait 1 second
    await sleep(1000);
    // Assume it's gone - might still be there briefly!
}

// ✅ Check TTL or handle gracefully
async function goodExample() {
    const result = await client.execute('SELECT TTL(data) FROM temp WHERE id = ?', [id]);
    if (result.rows.length === 0 || result.rows[0].ttl === null) {
        // Data expired or no TTL set
        return null;
    }
    return result.rows[0];
}
```

### 2. Testing TTL

```javascript
// Test with very short TTL
describe('TTL functionality', () => {
    it('should expire data after TTL', async () => {
        await client.execute('INSERT INTO test (id, data) VALUES (?, ?) USING TTL 2', ['test', 'data']);

        // Should exist immediately
        let result = await client.execute('SELECT * FROM test WHERE id = ?', ['test']);
        expect(result.rows.length).toBe(1);

        // Wait for expiration + small buffer
        await sleep(3000);

        // Should be gone
        result = await client.execute('SELECT * FROM test WHERE id = ?', ['test']);
        expect(result.rows.length).toBe(0);
    });
});
```

### 3. Production Monitoring

```javascript
// Monitor tombstone ratios
async function checkTombstoneRatio(table) {
    // Use nodetool or application metrics
    const stats = await getTableStats(table);
    const tombstoneRatio = stats.tombstones / (stats.live_cells + stats.tombstones);

    if (tombstoneRatio > 0.8) {
        console.warn(`High tombstone ratio in ${table}: ${tombstoneRatio}`);
        // Consider adjusting TTL strategy or forcing compaction
    }
}
```

---

## 💡 Mental Model

### 🧠 Think of TTL like this:

```
TTL is like a "disappearing ink":

1. You write with special ink (INSERT ... USING TTL)
2. Initially, writing is clearly visible (data can be read)
3. After time passes, ink fades away (data becomes invisible to queries)
4. Eventually, the paper is recycled (storage space reclaimed during compaction)

The text "disappears" from your perspective immediately when TTL expires,
but the physical ink molecules might still exist until the paper is processed.
```

### 📊 Comparison Summary:

| Aspect | MySQL DELETE | Cassandra TTL |
|--------|--------------|---------------|
| **Trigger** | Manual command | Automatic time-based |
| **Timing** | Immediate | At expiration time |
| **Visibility** | Gone immediately | Gone at expiration |
| **Storage** | Freed quickly | Freed during compaction |
| **Performance** | Can block | Non-blocking |
| **Maintenance** | Manual | Automatic |

---

## 🚀 Key Takeaways

### ✅ Yes, TTL = "Tự Xóa", but understand:

1. **Logical Deletion** happens at expiration time (invisible to queries)
2. **Physical Deletion** happens later during compaction
3. **Application sees** data as deleted immediately when expired
4. **Storage reclamation** happens asynchronously
5. **No manual cleanup** needed (that's the magic!)

### 🎯 Perfect Mental Model:

**TTL is like automatic trash collection:**
- You put items in trash (INSERT with TTL)
- Items become "garbage" at scheduled time (expiration)
- You can't access garbage anymore (queries return empty)
- Truck comes later to actually remove trash (compaction)

**Bottom line: From your application's perspective, data IS deleted when TTL expires! 🗑️✨**

---

**This automatic "self-deleting" feature is why Cassandra is perfect for temporary data! 🚀**
