# ⚖️ Transactions in Cassandra - What You Need to Know

**Understanding transaction limitations và alternatives in Cassandra**

## 🎯 The Hard Truth

**Cassandra KHÔNG có full ACID transactions** như MySQL. Đây là một **fundamental design choice**, không phải limitation có thể fix được.

---

## 🆚 MySQL vs Cassandra: Transaction Philosophy

### 🔵 MySQL: Full ACID Transactions

```sql
-- MySQL: Strong ACID guarantees
START TRANSACTION;

-- These either ALL succeed or ALL fail
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
INSERT INTO transactions (from_user, to_user, amount) VALUES (1, 2, 100);

COMMIT;  -- All-or-nothing guarantee
```

**ACID Properties:**
- **Atomicity:** All operations succeed or all fail
- **Consistency:** Database remains in valid state
- **Isolation:** Concurrent transactions don't interfere
- **Durability:** Committed data persists

### 🔴 Cassandra: Limited Transaction Support

```sql
-- ❌ This DOES NOT EXIST in Cassandra
START TRANSACTION;  -- No such thing!
UPDATE table1 SET ...;
UPDATE table2 SET ...;
COMMIT;  -- Not available!

-- ✅ What Cassandra HAS instead:
BEGIN BATCH
    UPDATE table1 SET ...;
    UPDATE table2 SET ...;
APPLY BATCH;  -- Limited guarantees only
```

**BASE Properties (instead of ACID):**
- **Basically Available:** System stays available
- **Soft state:** State may change over time
- **Eventually consistent:** Will be consistent eventually

---

## 🔧 What Cassandra Provides Instead

### 1. **Lightweight Transactions (LWT)**

```sql
-- Conditional operations with linearizable consistency
INSERT INTO users (user_id, email, username)
VALUES (?, ?, ?)
IF NOT EXISTS;  -- ← Lightweight Transaction

UPDATE accounts
SET balance = ?
WHERE user_id = ?
IF balance = ?;  -- ← Conditional update with LWT
```

**Characteristics:**
- ✅ **Linearizable consistency** for single partition
- ✅ **Compare-and-swap** semantics
- ❌ **Expensive** (4x slower than normal writes)
- ❌ **Single partition only** (can't span multiple partition keys)

### 2. **Batch Operations**

```sql
-- Batch operations (not full transactions!)
BEGIN BATCH
    INSERT INTO orders (order_id, customer_id, total) VALUES (?, ?, ?);
    INSERT INTO orders_by_user (user_id, order_id, total) VALUES (?, ?, ?);
    UPDATE users SET total_orders = total_orders + 1 WHERE user_id = ?;
APPLY BATCH;
```

**Types of Batches:**
- **LOGGED Batch:** Atomic within single partition (default)
- **UNLOGGED Batch:** No atomicity, just performance optimization

---

## ⚠️ Critical Limitations

### ❌ **What You CANNOT Do:**

```javascript
// ❌ IMPOSSIBLE: Multi-table ACID transaction
async function transferMoneyImpossible(fromUser, toUser, amount) {
    // This CANNOT be done atomically in Cassandra
    await client.execute('UPDATE accounts SET balance = balance - ? WHERE user_id = ?', [amount, fromUser]);
    // ↑ This might succeed
    await client.execute('UPDATE accounts SET balance = balance + ? WHERE user_id = ?', [amount, toUser]);
    // ↑ This might fail, leaving inconsistent state!

    // NO rollback mechanism like MySQL!
}

// ❌ IMPOSSIBLE: Cross-partition transactions
async function batchAcrossPartitionsImpossible() {
    // This won't work reliably if users are on different partitions
    BEGIN BATCH
        UPDATE user_data SET points = points + 100 WHERE user_id = user1;  -- Partition 1
        UPDATE user_data SET points = points - 100 WHERE user_id = user2;  -- Partition 2
    APPLY BATCH;
    // No guarantee both succeed or both fail if different partitions!
}
```

### ❌ **Banking Example - Why Cassandra Struggles:**

```sql
-- ❌ Cannot guarantee in Cassandra:
BEGIN TRANSACTION;  -- Doesn't exist!
    UPDATE account SET balance = balance - 1000 WHERE account_id = 'user1_checking';
    UPDATE account SET balance = balance + 1000 WHERE account_id = 'user2_savings';
    INSERT INTO transaction_log (from_account, to_account, amount) VALUES ('user1_checking', 'user2_savings', 1000);
COMMIT;  -- No such guarantee!
```

---

## ✅ What You CAN Do: Cassandra Workarounds

### 1. **Single-Partition Lightweight Transactions**

```javascript
class CassandraLightweightTransactions {

    // ✅ Account balance update với optimistic locking
    async updateAccountBalance(userId, expectedBalance, newBalance) {
        const client = database.getClient();

        try {
            // Lightweight transaction - atomic within single partition
            const result = await client.execute(`
                UPDATE user_accounts
                SET balance = ?, last_updated = ?
                WHERE user_id = ?
                IF balance = ?
            `, [newBalance, new Date(), userId, expectedBalance], {
                consistency: cassandra.types.consistencies.quorum
            });

            // Check if condition was met
            if (!result.rows[0]['[applied]']) {
                const currentBalance = result.rows[0]['balance'];
                throw new Error(`Balance mismatch. Expected: ${expectedBalance}, Actual: ${currentBalance}`);
            }

            return {
                success: true,
                oldBalance: expectedBalance,
                newBalance: newBalance,
                userId: userId
            };

        } catch (error) {
            console.error('LWT balance update failed:', error);
            throw error;
        }
    }

    // ✅ Inventory reservation với race condition protection
    async reserveInventory(productId, quantityToReserve, orderId) {
        const client = database.getClient();

        try {
            // Get current inventory first
            const currentInventory = await client.execute(
                'SELECT quantity_available FROM product_inventory WHERE product_id = ?',
                [productId]
            );

            if (currentInventory.rows.length === 0) {
                throw new Error('Product not found');
            }

            const available = currentInventory.rows[0].quantity_available;

            if (available < quantityToReserve) {
                throw new Error(`Insufficient inventory. Available: ${available}, Requested: ${quantityToReserve}`);
            }

            // Atomic inventory update với condition
            const result = await client.execute(`
                UPDATE product_inventory
                SET quantity_available = quantity_available - ?,
                    quantity_reserved = quantity_reserved + ?
                WHERE product_id = ?
                IF quantity_available >= ?
            `, [quantityToReserve, quantityToReserve, productId, quantityToReserve], {
                consistency: cassandra.types.consistencies.quorum
            });

            if (!result.rows[0]['[applied]']) {
                throw new Error('Reservation failed - inventory changed during operation');
            }

            return {
                success: true,
                productId,
                reservedQuantity: quantityToReserve,
                orderId
            };

        } catch (error) {
            console.error('Inventory reservation failed:', error);
            throw error;
        }
    }
}
```

### 2. **Batch Operations với Compensation Patterns**

```javascript
class CompensatingTransactions {

    // ✅ E-commerce order creation với compensation logic
    async createOrderWithCompensation(cartId, orderData) {
        const client = database.getClient();
        const orderId = uuidv4();
        const now = new Date();
        let compensationActions = [];

        try {
            // Step 1: Reserve inventory for all items
            const cart = await this.getCart(cartId);

            for (const item of cart.items) {
                await this.reserveInventory(item.product_id, item.quantity, orderId);

                // Track compensation action
                compensationActions.push({
                    action: 'release_inventory',
                    productId: item.product_id,
                    quantity: item.quantity,
                    orderId: orderId
                });
            }

            // Step 2: Create order records (batch operation)
            const batch = [
                {
                    query: `INSERT INTO orders (order_id, customer_id, order_status, total_cents, created_at) VALUES (?, ?, ?, ?, ?)`,
                    params: [orderId, orderData.customerId, 'pending', orderData.totalCents, now]
                },
                {
                    query: `INSERT INTO orders_by_user (user_id, order_date, order_id, order_status, total_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                    params: [orderData.customerId, now, orderId, 'pending', orderData.totalCents, now]
                }
            ];

            await client.batch(batch, {
                prepare: true,
                consistency: cassandra.types.consistencies.quorum
            });

            compensationActions.push({
                action: 'delete_order',
                orderId: orderId,
                customerId: orderData.customerId
            });

            // Step 3: Process payment (external system)
            const paymentResult = await this.processPayment(orderData.paymentInfo);

            if (!paymentResult.success) {
                throw new Error('Payment processing failed');
            }

            // Step 4: Update customer counters
            await client.execute(`
                UPDATE users
                SET total_orders = total_orders + 1, total_spent = total_spent + ?
                WHERE user_id = ?
            `, [orderData.totalCents, orderData.customerId]);

            // Success! Clear compensation tracking
            compensationActions = [];

            return {
                success: true,
                orderId,
                paymentReference: paymentResult.reference
            };

        } catch (error) {
            console.error('Order creation failed, compensating...', error);

            // Execute compensation actions to undo partial changes
            await this.executeCompensation(compensationActions);

            throw error;
        }
    }

    async executeCompensation(actions) {
        console.log(`🔄 Executing ${actions.length} compensation actions...`);

        for (const action of actions.reverse()) { // Reverse order
            try {
                switch (action.action) {
                    case 'release_inventory':
                        await this.releaseInventoryReservation(action.productId, action.quantity, action.orderId);
                        console.log(`   ✅ Released inventory: ${action.productId}`);
                        break;

                    case 'delete_order':
                        await client.execute('DELETE FROM orders WHERE order_id = ?', [action.orderId]);
                        await client.execute('DELETE FROM orders_by_user WHERE user_id = ? AND order_id = ?',
                            [action.customerId, action.orderId]);
                        console.log(`   ✅ Deleted order: ${action.orderId}`);
                        break;
                }
            } catch (compensationError) {
                console.error(`❌ Compensation action failed:`, compensationError);
                // Log for manual intervention
            }
        }
    }
}
```

### 3. **Event Sourcing Pattern** (Advanced)

```javascript
class EventSourcingTransactions {

    // ✅ Use event sourcing for complex business transactions
    async transferMoneyWithEvents(fromUserId, toUserId, amount) {
        const client = database.getClient();
        const transactionId = uuidv4();
        const now = new Date();

        try {
            // Create events instead of direct updates
            const events = [
                {
                    eventId: cassandra.types.TimeUuid.now(),
                    aggregateId: fromUserId,
                    eventType: 'MoneyDebited',
                    eventData: { amount, transactionId, toUser: toUserId },
                    timestamp: now
                },
                {
                    eventId: cassandra.types.TimeUuid.now(),
                    aggregateId: toUserId,
                    eventType: 'MoneyCredited',
                    eventData: { amount, transactionId, fromUser: fromUserId },
                    timestamp: now
                },
                {
                    eventId: cassandra.types.TimeUuid.now(),
                    aggregateId: transactionId,
                    eventType: 'TransferCompleted',
                    eventData: { fromUser: fromUserId, toUser: toUserId, amount },
                    timestamp: now
                }
            ];

            // Store events atomically
            const batch = events.map(event => ({
                query: `INSERT INTO event_store
                        (aggregate_id, event_timestamp, event_id, event_type, event_data)
                        VALUES (?, ?, ?, ?, ?)`,
                params: [event.aggregateId, event.timestamp, event.eventId,
                        event.eventType, JSON.stringify(event.eventData)]
            }));

            await client.batch(batch, {
                consistency: cassandra.types.consistencies.quorum
            });

            // Process events asynchronously to update balances
            await this.processEventsAsync(events);

            return {
                success: true,
                transactionId,
                events: events.length
            };

        } catch (error) {
            console.error('Event sourcing transaction failed:', error);
            throw error;
        }
    }
}
```

---

## 🚨 Real-World Problems & Solutions

### Problem 1: **E-commerce Order Creation**

#### ❌ **MySQL Way (ACID):**
```sql
-- MySQL: Perfect ACID transaction
BEGIN TRANSACTION;
    INSERT INTO orders (...);
    UPDATE inventory SET quantity = quantity - 5 WHERE product_id = 123;
    UPDATE customer_stats SET total_orders = total_orders + 1 WHERE user_id = 456;
    INSERT INTO order_items (...);
COMMIT;  -- Either all succeed or all rollback
```

#### 🔄 **Cassandra Way (Compensation):**
```javascript
// Cassandra: Manual compensation pattern
async function createOrderCassandra(orderData) {
    const steps = [];

    try {
        // Step 1: Reserve inventory (LWT for safety)
        await reserveInventory(productId, quantity);
        steps.push({ action: 'release_inventory', productId, quantity });

        // Step 2: Create order (batch within partition)
        await createOrderBatch(orderData);
        steps.push({ action: 'delete_order', orderId });

        // Step 3: Update counters
        await updateCustomerCounters(customerId);
        steps.push({ action: 'decrement_counters', customerId });

        // Success - clear compensation steps
        steps.length = 0;

    } catch (error) {
        // Compensate in reverse order
        await compensateSteps(steps);
        throw error;
    }
}
```

### Problem 2: **Financial Transfers**

#### ❌ **MySQL Approach:**
```sql
-- Perfect atomicity in MySQL
START TRANSACTION;
    UPDATE accounts SET balance = balance - 1000 WHERE account_id = 'A';
    UPDATE accounts SET balance = balance + 1000 WHERE account_id = 'B';
COMMIT;
```

#### 🔄 **Cassandra Approach:**
```javascript
// Cassandra: Two-phase approach với idempotency
async function transferMoney(fromAccount, toAccount, amount) {
    const transferId = uuidv4();
    const now = new Date();

    try {
        // Phase 1: Debit from source account
        const debitResult = await client.execute(`
            UPDATE accounts
            SET balance = balance - ?, pending_debits = pending_debits + ?
            WHERE account_id = ?
            IF balance >= ?
        `, [amount, amount, fromAccount, amount]);

        if (!debitResult.rows[0]['[applied]']) {
            throw new Error('Insufficient funds');
        }

        // Phase 2: Credit to destination account
        await client.execute(`
            UPDATE accounts
            SET balance = balance + ?, pending_credits = pending_credits + ?
            WHERE account_id = ?
        `, [amount, amount, toAccount]);

        // Phase 3: Clear pending amounts (complete transfer)
        const finalBatch = [
            {
                query: 'UPDATE accounts SET pending_debits = pending_debits - ? WHERE account_id = ?',
                params: [amount, fromAccount]
            },
            {
                query: 'UPDATE accounts SET pending_credits = pending_credits - ? WHERE account_id = ?',
                params: [amount, toAccount]
            },
            {
                query: 'INSERT INTO transfer_log (transfer_id, from_account, to_account, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                params: [transferId, fromAccount, toAccount, amount, 'completed', now]
            }
        ];

        await client.batch(finalBatch);

        return { transferId, status: 'completed' };

    } catch (error) {
        // Compensation: reverse the debit if it succeeded
        await this.compensateFailedTransfer(transferId, fromAccount, amount);
        throw error;
    }
}
```

---

## 🎯 When to Use What in Cassandra

### ✅ **Use Lightweight Transactions When:**

```javascript
// Good: Single partition, rare updates, correctness critical
async function claimUniqueUsername(userId, username) {
    const result = await client.execute(`
        INSERT INTO usernames (username, user_id, claimed_at)
        VALUES (?, ?, ?)
        IF NOT EXISTS
    `, [username, userId, new Date()]);

    return result.rows[0]['[applied]']; // true if successful, false if username taken
}

// Good: Compare-and-swap operations
async function updateUserProfileSafely(userId, expectedVersion, newData) {
    const result = await client.execute(`
        UPDATE user_profiles
        SET data = ?, version = version + 1
        WHERE user_id = ?
        IF version = ?
    `, [newData, userId, expectedVersion]);

    return result.rows[0]['[applied]'];
}
```

### ✅ **Use Batch Operations When:**

```javascript
// Good: Same partition, related data
async function updateUserProfileBatch(userId, profileData) {
    const batch = [
        {
            query: 'UPDATE users SET first_name = ?, last_name = ? WHERE user_id = ?',
            params: [profileData.firstName, profileData.lastName, userId]
        },
        {
            query: 'UPDATE user_preferences SET display_name = ? WHERE user_id = ?',
            params: [profileData.displayName, userId]
        },
        {
            query: 'INSERT INTO user_activity_log (user_id, activity_date, activity_timestamp, activity_type) VALUES (?, ?, ?, ?)',
            params: [userId, new Date(), new Date(), 'profile_update']
        }
    ];

    await client.batch(batch, {
        consistency: cassandra.types.consistencies.localQuorum
    });
}
```

### ❌ **Avoid Transactions For:**

```javascript
// ❌ Bad: Cross-partition operations
async function badCrossPartitionBatch() {
    // Don't do this - users might be on different partitions
    BEGIN BATCH
        UPDATE users SET points = points + 100 WHERE user_id = user1;  -- Partition A
        UPDATE users SET points = points - 100 WHERE user_id = user2;  -- Partition B
    APPLY BATCH;  // Not guaranteed to be atomic!
}

// ❌ Bad: High-frequency LWT usage
async function badHighFrequencyLWT() {
    // Don't use LWT for every operation - very expensive!
    for (let i = 0; i < 1000; i++) {
        await client.execute(`
            UPDATE page_views SET count = count + 1 WHERE page_id = ? IF EXISTS
        `, [pageId]);  // 4x slower than normal update!
    }
}
```

---

## 🔧 E-commerce Specific Examples

### **Shopping Cart → Order Conversion**

```javascript
// Real example from the e-commerce system
async function convertCartToOrder(cartId, orderData) {
    const compensations = [];

    try {
        // Step 1: Get cart items
        const cart = await getCart(cartId);

        // Step 2: Reserve inventory (each item separately với LWT)
        for (const item of cart.items) {
            const reserved = await this.reserveInventoryLWT(item.product_id, item.quantity);
            if (!reserved) {
                throw new Error(`Cannot reserve ${item.product_name}`);
            }
            compensations.push({ type: 'release_inventory', ...item });
        }

        // Step 3: Create order (batch operation - same partition)
        const orderBatch = [
            {
                query: 'INSERT INTO orders (...) VALUES (...)',
                params: [orderId, ...]
            },
            {
                query: 'INSERT INTO orders_by_user (...) VALUES (...)',
                params: [userId, ...]
            },
            {
                query: 'UPDATE users SET total_orders = total_orders + 1 WHERE user_id = ?',
                params: [userId]
            }
        ];

        await client.batch(orderBatch, { consistency: 'quorum' });
        compensations.push({ type: 'delete_order', orderId });

        // Step 4: Clear cart (TTL expiration)
        await this.expireCart(cartId);

        // Success!
        compensations.length = 0; // Don't compensate on success
        return { success: true, orderId };

    } catch (error) {
        // Execute compensations
        await this.compensate(compensations);
        throw error;
    }
}
```

### **Inventory Management với Consistency**

```javascript
class InventoryConsistency {

    // ✅ Safe inventory update
    async updateInventorySafe(productId, quantityChange, reason) {
        const MAX_RETRIES = 5;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                // Get current quantity
                const current = await client.execute(
                    'SELECT quantity_available FROM product_inventory WHERE product_id = ?',
                    [productId]
                );

                const currentQuantity = current.rows[0].quantity_available;
                const newQuantity = currentQuantity + quantityChange;

                if (newQuantity < 0) {
                    throw new Error('Cannot reduce inventory below zero');
                }

                // Atomic update với condition
                const result = await client.execute(`
                    UPDATE product_inventory
                    SET quantity_available = ?
                    WHERE product_id = ?
                    IF quantity_available = ?
                `, [newQuantity, productId, currentQuantity]);

                if (result.rows[0]['[applied]']) {
                    // Success! Log the movement
                    await this.logInventoryMovement(productId, quantityChange, reason);
                    return { success: true, newQuantity };
                }

                // Condition failed - retry
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Backoff

            } catch (error) {
                console.error(`Inventory update attempt ${attempt + 1} failed:`, error);
                attempt++;

                if (attempt >= MAX_RETRIES) {
                    throw error;
                }
            }
        }

        throw new Error('Inventory update failed after maximum retries');
    }
}
```

---

## 🎯 Decision Matrix: When to Use What

| Use Case | MySQL Solution | Cassandra Solution | Recommendation |
|----------|----------------|-------------------|-----------------|
| **Banking Transfer** | ACID Transaction | ❌ **Use MySQL** | Cassandra not suitable |
| **E-commerce Order** | ACID Transaction | ✅ **Compensation Pattern** | Cassandra can work |
| **Social Media Post** | Simple INSERT | ✅ **Single Operation** | Cassandra excellent |
| **Inventory Update** | ACID Transaction | ✅ **Lightweight Transaction** | Cassandra good |
| **User Registration** | ACID Transaction | ✅ **Batch + LWT** | Cassandra fine |
| **Analytics Data** | INSERT + UPDATE | ✅ **Counter Columns** | Cassandra superior |

---

## 💡 Key Takeaways

### **Understanding Trade-offs:**

**MySQL ACID Transactions:**
- ✅ **Perfect consistency** - all-or-nothing guarantee
- ✅ **Simple programming model** - easy to reason about
- ❌ **Single point of failure** - all transactions through one master
- ❌ **Limited scalability** - vertical scaling only
- ❌ **Performance bottleneck** - serialized transaction processing

**Cassandra Alternatives:**
- ✅ **Massive scalability** - linear scaling with nodes
- ✅ **High availability** - no single point of failure
- ✅ **High performance** - distributed parallel processing
- ❌ **Complex programming model** - need compensation logic
- ❌ **Eventual consistency** - not suitable for all use cases

### **When to Choose Each:**

**Choose MySQL when:**
- Strong consistency **absolutely required** (banking, finance)
- Complex **multi-table transactions** frequent
- Team **lacks NoSQL expertise**
- **Moderate scale** (single server sufficient)

**Choose Cassandra when:**
- **Massive scale** required (millions of users)
- **High availability** critical (99.99%+ uptime)
- **Simple transaction patterns** (mostly single-entity updates)
- **Geographic distribution** needed

### **Hybrid Approach:**
```
Use BOTH in same system:
├── MySQL for critical transactions (payments, accounting)
└── Cassandra for high-volume data (user activity, analytics, content)
```

---

## 🔥 **Bottom Line:**

**Cassandra trades transaction simplicity for massive scale và performance.**

- If you need **bulletproof ACID transactions** → **Use MySQL**
- If you need **massive scale với acceptable eventual consistency** → **Use Cassandra**
- For **e-commerce, social media, IoT** → Cassandra's trade-offs are usually worth it
- For **banking, accounting, critical financial data** → MySQL's ACID is essential

**The e-commerce system I built shows how to handle most business needs WITHOUT full ACID transactions! 🛒⚡**

---

**Remember: Different problems, different tools! 🛠️**
