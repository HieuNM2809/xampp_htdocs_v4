Trong **MySQL** có **transaction ACID đầy đủ**, hỗ trợ `BEGIN`, `COMMIT`, `ROLLBACK` và đảm bảo an toàn dữ liệu, rollback khi lỗi.
Còn **Cassandra** và **MongoDB** cũng có cơ chế tương tự nhưng cách hoạt động *khác hoàn toàn*, mức độ mạnh/yếu khác nhau. Phân tích thật chi tiết:

---

# 🗃 So sánh Transaction trong MySQL, Cassandra, MongoDB

## 1️⃣ MySQL (RDBMS – ACID mạnh)

| Tính chất        | MySQL                                          |
| ---------------- | ---------------------------------------------- |
| Kiểu transaction | Multi-row, multi-table, full ACID              |
| Isolation        | Có đủ các mức: READ UNCOMMITTED → SERIALIZABLE |
| Rollback         | Có, tự động khi lỗi hoặc chủ động              |
| Lock             | Row-level lock, table lock tùy engine          |
| Use-case         | Banking, fintech, ERP, inventory               |

Ví dụ:

```sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
-- hoặc ROLLBACK khi lỗi
```

---

## 2️⃣ Cassandra (AP – BASE, Lightweight Transaction)

📌 Cassandra không có transaction như MySQL.
Chỉ hỗ trợ **Lightweight Transaction (LWT)** dựa trên cơ chế **Paxos protocol**, dùng khi cần **Compare-and-Set**, không hỗ trợ transaction nhiều row/table.

### Đặc điểm:

| Tính chất        | Cassandra                                                    |
| ---------------- | ------------------------------------------------------------ |
| Kiểu transaction | Lightweight Transaction (conditional update)                 |
| ACID             | Chỉ hỗ trợ một phần (atomicity + isolation cục bộ)           |
| Rollback         | ❌ Không có rollback                                          |
| Multi-row        | ❌ Không                                                      |
| Multi-partition  | ❌ Không                                                      |
| Quorum control   | ✔ Có, consistency tunable                                    |
| Dùng khi         | Update nếu chưa tồn tại, khóa optimistic, idempotent updates |

🧪 Ví dụ LWT trong Cassandra:

```sql
INSERT INTO users (email, user_id)
VALUES ('a@gmail.com', 123)
IF NOT EXISTS;
```

Hoặc Update có điều kiện:

```sql
UPDATE accounts
SET balance = 500
WHERE id = 1
IF balance = 200;  -- chỉ update nếu giá trị hiện tại là 200
```

📝 Bản chất:
👉 Không rollback, không thay thế ACID transaction.
👉 Hữu ích cho **đảm bảo uniqueness, optimistic lock**, không phải financial transaction.

---

## 3️⃣ MongoDB (NoSQL – Hỗ trợ Multi-document Transaction từ v4.0)

📌 MongoDB ban đầu **chỉ hỗ trợ atomic trong 1 document**, vì BSON document được lưu theo dạng binary contiguous block → atomic 1 document tự nhiên.

📌 Từ **MongoDB 4.0**, đã hỗ trợ **multi-document ACID transaction** giống MySQL (nếu dữ liệu nằm cùng replica set), và từ 4.2 hỗ trợ **sharded cluster transaction**.

### Đặc điểm:

| Tính chất                    | MongoDB                                         |
| ---------------------------- | ----------------------------------------------- |
| Single document atomicity    | ✔ Có tự nhiên                                   |
| Multi-document transaction   | ✔ Có từ v4.0                                    |
| Multi-collection transaction | ✔ Có                                            |
| Rollback/Abort               | ✔ Có                                            |
| Isolation                    | Snapshot isolation (similar to Repeatable Read) |
| Chi phí                      | Transaction nặng, ảnh hưởng hiệu suất           |
| Dùng khi                     | Financial, Inventory, Order, Workflow           |

### Ví dụ Transaction trong MongoDB:

```js
const session = client.startSession();

session.startTransaction();

try {
  await accounts.updateOne(
    { _id: 1 },
    { $inc: { balance: -100 } },
    { session }
  );

  await accounts.updateOne(
    { _id: 2 },
    { $inc: { balance: 100 } },
    { session }
  );

  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
} finally {
  session.endSession();
}
```

📝 MongoDB Transaction → Gần giống MySQL nhưng:

* Không có table-level lock
* Isolation không mạnh như Serializable
* Ảnh hưởng performance nhiều hơn MySQL transaction.

---

# 🧠 Tổng kết – Khi nào dùng?

| Feature                         | MySQL        | Cassandra                     | MongoDB           |
| ------------------------------- | ------------ | ----------------------------- | ----------------- |
| Full ACID transaction           | ✔            | ❌                             | ✔ (từ v4.0)       |
| Atomic từng bản ghi             | ✔            | ✔                             | ✔                 |
| Atomic nhiều bản ghi            | ✔            | ❌                             | ✔                 |
| Rollback                        | ✔            | ❌                             | ✔                 |
| Performance khi transaction lớn | ⚠ Trung bình | 🟢 Cao (không có transaction) | 🔴 Nặng           |
| Dùng cho Banking, ERP           | 🟢           | ❌                             | 🟢                |
| Dùng cho Big Data, IoT, Logging | ⚠            | 🟢                            | 🟢                |
| Lightweight conditional update  | ❌            | ✔                             | ⚠ (findAndModify) |

---

# 📌 Kết luận nhanh:

| DB        | Transaction Support                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| MySQL     | ACID mạnh, tiêu chuẩn RDBMS                                                                                  |
| Cassandra | Không có transaction truyền thống, chỉ có Lightweight Transaction dựa trên Paxos (IF EXISTS / IF NOT EXISTS) |
| MongoDB   | Atomic từng document, có multi-document ACID transaction từ version 4.0                                      |

---

Muốn mình hướng dẫn **làm transaction thực tế trong MongoDB hoặc so sánh performance / benchmark giữa 3 loại DB**?
Hoặc ví dụ nâng cao như **Banking system trong Cassandra vs MongoDB**? 🚀
