# Hướng dẫn Setup Elastic APM cho Node.js - Từ cơ bản đến nâng cao

Dưới đây là **hướng dẫn setup Elastic APM cho Node.js từ cơ bản → nâng cao**, đi theo đúng thực tế triển khai backend (Express / Fastify / NestJS), kèm **nhiều ví dụ và các case hay gặp khi chạy Docker + Elasticsearch/Kibana**.

---

## 1. Elastic APM là gì? (Hiểu đúng trước khi setup)

Elastic APM giúp bạn:

* Theo dõi **request → response** (latency, p95, p99)
* Trace **toàn bộ luồng xử lý**:
  * HTTP
  * DB (MySQL, PostgreSQL, MongoDB)
  * Redis
  * External HTTP
* Bắt **error / exception**
* Phân tích **bottleneck** (API chậm ở đâu)

👉 Hiểu đơn giản:
**APM = log + metrics + tracing (distributed tracing)**

---

## 2. Kiến trúc tổng thể Elastic APM

```
[Node.js App]
     |
     | (APM Agent)
     v
[APM Server]
     |
     v
[Elasticsearch] <--> [Kibana (APM UI)]
```

⚠️ Node.js **KHÔNG gửi trực tiếp vào Elasticsearch**
→ phải qua **APM Server**

---

## 3. Setup APM Server (Docker – khuyến nghị)

### 3.1. docker-compose mẫu (phổ biến nhất)

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  apm-server:
    image: docker.elastic.co/apm/apm-server:8.11.0
    container_name: apm-server
    command: >
      apm-server -e
        -E apm-server.host=0.0.0.0:8200
        -E output.elasticsearch.hosts=["http://elasticsearch:9200"]
    ports:
      - "8200:8200"
    depends_on:
      - elasticsearch
```

Chạy:

```bash
docker-compose up -d
```

---

### 3.2. Kiểm tra APM Server sống chưa

```bash
curl http://localhost:8200
```

Nếu thấy JSON info → OK

---

## 4. Setup Elastic APM cho Node.js

---

### 4.1. Cài thư viện

```bash
npm install elastic-apm-node
```

hoặc

```bash
yarn add elastic-apm-node
```

---

### 4.2. Cách **BẮT BUỘC ĐÚNG** khi khởi tạo APM

⚠️ **APM phải được require/import đầu tiên**, trước Express, DB, Redis

#### Cách 1 – File riêng (khuyến nghị)

##### `apm.js`

```js
const apm = require('elastic-apm-node').start({
  serviceName: 'location-service',
  serverUrl: 'http://localhost:8200',
  environment: 'development',
  transactionSampleRate: 1.0, // 100% request
});

module.exports = apm;
```

##### `index.js`

```js
require('./apm'); // PHẢI đặt trên cùng

const express = require('express');
const app = express();

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(3000);
```

---

#### Cách 2 – Dùng biến môi trường (production chuẩn)

```bash
export ELASTIC_APM_SERVICE_NAME=location-service
export ELASTIC_APM_SERVER_URL=http://apm-server:8200
export ELASTIC_APM_ENVIRONMENT=production
export ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.2
```

```js
require('elastic-apm-node').start();
```

---

## 5. Kiểm tra dữ liệu trong Kibana

1. Truy cập:
   👉 `http://localhost:5601`
2. Menu → **Observability → APM**
3. Gọi API Node.js vài lần
4. Thấy service xuất hiện

---

## 6. Ví dụ APM hoạt động như thế nào?

---

### 6.1. Auto instrument (KHÔNG cần code)

APM tự bắt:

* HTTP request
* Express middleware
* MongoDB / MySQL / PostgreSQL
* Redis
* Axios / fetch / request

Ví dụ:

```js
await axios.get('https://api.external.com/data');
```

→ tự hiện trong APM trace

---

### 6.2. Custom Transaction (nâng cao)

Dùng khi:

* Background job
* Cron
* Consumer Kafka
* Queue worker

```js
const apm = require('./apm');

async function processJob() {
  const transaction = apm.startTransaction('sync_location', 'job');

  try {
    await heavyTask();
  } catch (err) {
    apm.captureError(err);
    throw err;
  } finally {
    transaction.end();
  }
}
```

---

### 6.3. Custom Span (bóc tách API chậm)

```js
app.get('/verify', async (req, res) => {
  const span = apm.startSpan('verify_latlng_logic');

  await verifyLatLng();

  span.end();
  res.send('OK');
});
```

Trong Kibana bạn sẽ thấy:

```
HTTP request
 └── verify_latlng_logic (span)
```

---

## 7. Bắt lỗi (Error Tracking)

### 7.1. Bắt lỗi tự động

```js
throw new Error('Invalid lat lng');
```

→ xuất hiện ở tab **Errors**

---

### 7.2. Bắt lỗi thủ công

```js
try {
  risky();
} catch (e) {
  apm.captureError(e, {
    custom: {
      input: payload,
      userId: 123
    }
  });
}
```

---

## 8. Performance tuning (RẤT QUAN TRỌNG)

### 8.1. Giảm sample rate (production)

```env
ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1
```

= 10% request

---

### 8.2. Ignore healthcheck

```js
require('elastic-apm-node').start({
  ignoreUrls: ['/health', '/ping'],
});
```

---

### 8.3. Disable APM theo môi trường

```js
require('elastic-apm-node').start({
  active: process.env.NODE_ENV === 'production'
});
```

---

## 9. Các lỗi thường gặp

### ❌ Không thấy data

Nguyên nhân phổ biến:

* APM require sau Express
* Sai `serverUrl`
* Container Node không connect được APM Server
* `transactionSampleRate = 0`

---

### ❌ p95 cao dù return sớm

Nguyên nhân:

* Event loop block
* Await promise treo
* GC / CPU spike
* Span bên dưới còn chạy

👉 APM trace sẽ chỉ chính xác **đang chậm ở span nào**

---

## 10. Khi nào nên dùng APM?

✅ NÊN:

* API latency cao
* Debug p95/p99
* Microservice
* Queue / Kafka / Worker

❌ KHÔNG NÊN:

* App nhỏ, traffic thấp
* Không cần trace

---

## 11. Tính năng mở rộng

Nếu bạn muốn, có thể tham khảo thêm:

* So sánh **APM vs log thường**
* Hướng dẫn **APM cho NestJS**
* Debug **case p95 cao dù return ngay**
* Tối ưu **APM cho Kafka / Queue / Cron**

Chỉ cần biết bạn đang dùng **Express / NestJS / Fastify** và chạy **local hay Kubernetes**.
