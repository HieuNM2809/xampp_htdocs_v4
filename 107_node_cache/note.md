Dưới đây là một loạt ví dụ “nâng cao” về cách dùng thư viện [node-cache](https://www.npmjs.com/package/node-cache) trong Node.js, từ thiết lập cơ bản đến các pattern như wrapper async, xử lý sự kiện hết hạn, wildcard invalidation, thu thập thống kê, v.v.

---

## 1. Cài đặt và khởi tạo

```bash
npm install node-cache
```

```js
// cache.js
const NodeCache = require('node-cache');

// Khởi tạo cache với TTL mặc định 1 giờ, kiểm tra expired mỗi 10 phút
const cache = new NodeCache({
  stdTTL: 3600,       // thời gian sống mặc định (giây)
  checkperiod: 600,   // tần suất kiểm tra expired (giây)
  useClones: false,   // cho phép lưu trực tiếp object (không clone để tăng performance)
});

module.exports = cache;
```

---

## 2. Ví dụ cơ bản

```js
const cache = require('./cache');

// Lưu giá trị với TTL riêng (30s)
cache.set('user_123', { name: 'Alice', age: 30 }, 30);

// Lấy giá trị
const user = cache.get('user_123');
if (user) {
  console.log('Cache hit:', user);
} else {
  console.log('Cache miss');
}

// Xóa key
cache.del('user_123');
```

---

## 3. Wrapper cho hàm async (Stale-While-Revalidate)

Pattern “stale-while-revalidate”: trả ngay dữ liệu cũ nếu có, nhưng đồng thời refresh ngầm.

```js
const cache = require('./cache');

/**
 * Lấy dữ liệu với cache:
 * - Nếu có cache và chưa expired: trả luôn.
 * - Nếu expired hoặc chưa có: gọi fnFetcher, cập nhật cache rồi trả kết quả.
 */
async function getOrSetCache(key, fnFetcher, ttl = 300) {
  const cached = cache.get(key);
  if (cached !== undefined) {
    // Khởi chạy ngầm để update nếu gần hết TTL
    const ttlLeft = cache.getTtl(key) - Date.now();
    if (ttlLeft < (ttl * 0.2 * 1000)) {
      fnFetcher().then(data => cache.set(key, data, ttl));
    }
    return cached;
  }
  // Lần đầu hoặc đã expired
  const data = await fnFetcher();
  cache.set(key, data, ttl);
  return data;
}

// Ví dụ dùng với API call
async function fetchUserFromDB(id) {
  // giả lập truy vấn DB
  return { id, name: 'Bob', updatedAt: new Date() };
}

(async () => {
  const user = await getOrSetCache(
    `user_${123}`,
    () => fetchUserFromDB(123),
    600
  );
  console.log(user);
})();
```

---

## 4. Xử lý sự kiện khi “expire” hoặc “del”

Bạn có thể theo dõi khi key bị xóa/expire để thực hiện logic bổ sung.

```js
cache.on('expired', (key, value) => {
  console.log(`Key expired: ${key}`, value);
  // Ví dụ: đẩy vào queue để rebuild cache, log metrics, v.v.
});

cache.on('del', (key, value) => {
  console.log(`Key deleted manually: ${key}`, value);
});
```

---

## 5. Wildcard Invalidation

Muốn xóa nhóm key theo prefix hoặc pattern:

```js
function invalidateByPrefix(prefix) {
  const keys = cache.keys();
  const toDel = keys.filter(k => k.startsWith(prefix));
  cache.del(toDel);
}

// Sử dụng
invalidateByPrefix('session_');
```

---

## 6. Thống kê & Health Check

Lấy các chỉ số hiện tại để monitor:

```js
const stats = cache.getStats();
console.log('Cache stats:', stats);
/*
{
  hits: 10,
  misses: 2,
  keys: 8,
  ksize: 1024,
  vsize: 2048
}
*/
```

Bạn có thể expose API endpoint để Prometheus/Grafana scrape:

```js
const express = require('express');
const app = express();

app.get('/cache/metrics', (req, res) => {
  res.json(cache.getStats());
});

app.listen(3000, () => console.log('Metrics at http://localhost:3000/cache/metrics'));
```

---

## 7. Caching Hierarchy: Multi-level Cache

Kết hợp node-cache (in-memory) với Redis (nếu muốn persistence):

```js
const Redis = require('ioredis');
const redis = new Redis();
const cache = require('./cache');

async function getFromMultiCache(key, fnFetcher, ttl = 300) {
  // 1. Try in-memory
  const mem = cache.get(key);
  if (mem !== undefined) return mem;

  // 2. Try Redis
  const str = await redis.get(key);
  if (str) {
    const data = JSON.parse(str);
    // Pop to in-memory for faster next
    cache.set(key, data, ttl);
    return data;
  }

  // 3. Fetch source, fill both caches
  const data = await fnFetcher();
  cache.set(key, data, ttl);
  await redis.set(key, JSON.stringify(data), 'EX', ttl);
  return data;
}
```

---

## 8. Kết luận

Với `node-cache`, bạn đã có thể:

* Khởi tạo với TTL và checkperiod tùy chỉnh
* Dùng pattern stale-while-revalidate
* Bắt sự kiện expired/del để mở rộng logic
* Xóa hàng loạt theo wildcard/prefix
* Thu thập số liệu health để monitor
* Kết hợp multi-level cache với Redis

Hy vọng những ví dụ trên sẽ giúp bạn khai thác tối đa `node-cache` trong các ứng dụng Node.js production!
