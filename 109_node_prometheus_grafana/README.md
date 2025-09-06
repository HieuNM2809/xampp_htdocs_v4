# Node.js Monitoring với Prometheus và Grafana

Đây là một ví dụ hoàn chỉnh về ứng dụng Node.js với hệ thống monitoring nâng cao sử dụng Prometheus, Grafana, và các công cụ observability khác.

## 🚀 Tính năng chính

### Ứng dụng Node.js
- **RESTful API** với Express.js
- **Metrics tùy chỉnh** với Prometheus client
- **Business logic** mô phỏng (Users, Orders, Analytics)
- **Caching** với Redis simulation
- **Database integration** với PostgreSQL simulation
- **Logging** có cấu trúc với Winston
- **Health checks** và ready checks
- **Rate limiting** và security middleware

### Monitoring & Observability
- **Prometheus** - Thu thập metrics
- **Grafana** - Dashboard và visualization
- **Alertmanager** - Quản lý alerts
- **Loki** - Log aggregation
- **Promtail** - Log collection
- **Jaeger** - Distributed tracing
- **Node Exporter** - System metrics
- **cAdvisor** - Container metrics

### Metrics được theo dõi

#### HTTP Metrics
- Request rate và response time
- Error rates theo status code
- Active connections
- Request/response size distribution

#### Business Metrics
- User registrations và logins
- Order creation và processing
- Revenue tracking
- Conversion rates
- Inventory levels

#### System Metrics
- CPU và Memory usage
- Database performance
- Cache hit/miss rates
- Queue sizes
- Worker thread counts

#### SLI/SLO Metrics
- Service availability
- Latency percentiles
- Error budget tracking

## 🛠️ Cài đặt và chạy

### Prerequisites
- Docker và Docker Compose
- Node.js 18+ (nếu chạy local)
- Git

### 1. Clone repository
```bash
git clone <repository-url>
cd nodejs-prometheus-grafana-monitoring
```

### 2. Chạy với Docker Compose
```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f app

# Stop tất cả services
docker-compose down

# Rebuild và restart
docker-compose up -d --build
```

### 3. Chạy development mode (local)
```bash
# Install dependencies
npm install

# Start PostgreSQL và Redis (nếu cần)
docker-compose up -d postgres redis

# Start ứng dụng
npm run dev
```

## 🌐 Truy cập các services

| Service | URL | Credentials |
|---------|-----|-------------|
| Node.js App | http://localhost:3000 | - |
| Grafana | http://localhost:3001 | admin/admin123 |
| Prometheus | http://localhost:9090 | - |
| Alertmanager | http://localhost:9093 | - |
| Jaeger | http://localhost:16686 | - |
| PostgreSQL | localhost:5432 | app_user/app_password |
| Redis | localhost:6379 | - |

## 📊 API Endpoints

### Health & Metrics
```bash
# Health check
GET /health

# Ready check  
GET /ready

# Prometheus metrics
GET /metrics
```

### Users API
```bash
# Get users (paginated)
GET /api/users?page=1&limit=10

# Get user by ID
GET /api/users/{id}

# Create user
POST /api/users
{
  "email": "user@example.com",
  "name": "User Name",
  "country": "VN",
  "source": "api"
}

# Update user
PUT /api/users/{id}
{
  "name": "Updated Name"
}

# Delete user
DELETE /api/users/{id}

# User login
POST /api/users/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# User analytics
GET /api/users/analytics/overview

# Cache stats
GET /api/users/cache/stats
```

### Orders API
```bash
# Get orders (paginated)
GET /api/orders?page=1&limit=10&status=pending

# Get order by ID
GET /api/orders/{id}

# Create order
POST /api/orders
{
  "userId": 1,
  "items": [
    {
      "productId": 1,
      "name": "Product Name",
      "category": "electronics",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "paymentMethod": "credit_card"
}

# Update order status
PATCH /api/orders/{id}/status
{
  "status": "processing"
}

# Cancel order
POST /api/orders/{id}/cancel
{
  "reason": "Customer request"
}

# Process payment
POST /api/orders/{id}/payment
{
  "method": "credit_card",
  "amount": 199.98,
  "cardToken": "tok_xxx"
}

# Order analytics
GET /api/orders/analytics/overview

# Search orders
GET /api/orders/search?q=john&status=delivered
```

### Analytics API
```bash
# Dashboard overview
GET /api/analytics/dashboard

# Revenue analytics
GET /api/analytics/revenue?period=30d&groupBy=day

# User behavior
GET /api/analytics/users/behavior?segment=all&period=7d

# Performance analytics
GET /api/analytics/performance

# Real-time metrics
GET /api/analytics/realtime
```

### Simulation Endpoints
```bash
# Simulate load
POST /api/simulate/load
{
  "requests": 1000,
  "delay": 100
}

# Simulate errors
POST /api/simulate/error
{
  "errorType": "server_error",
  "probability": 0.3
}
```

## 🎯 Dashboard Grafana

### Dashboards có sẵn
1. **Node.js Application Monitoring** - Overview tổng quan
2. **Business Metrics** - KPIs và business logic
3. **Infrastructure Monitoring** - System và container metrics
4. **SLI/SLO Dashboard** - Service level objectives

### Panels chính
- **Application Status** - Uptime và health
- **Request Metrics** - Rate, latency, errors
- **Business KPIs** - Orders, revenue, users
- **System Resources** - CPU, memory, disk
- **Database Performance** - Query time, connections
- **Cache Performance** - Hit rates, size
- **Alert Status** - Active alerts và trends

## 🚨 Alerting

### Alert Rules
- **Application Down** - Critical
- **High Error Rate** - Critical (>5%)
- **High Response Time** - Warning (>1s)
- **Database Issues** - Warning/Critical
- **Low Cache Hit Rate** - Warning (<70%)
- **Business KPI Alerts** - Revenue drop, low conversion

### Notification Channels
- Email notifications
- Slack integration
- PagerDuty webhooks
- Custom webhook endpoints

## 📈 Metrics chi tiết

### HTTP Metrics
```
http_requests_total{method, route, status_code}
http_request_duration_seconds{method, route, status_code}
http_request_size_bytes{method, route}
http_response_size_bytes{method, route, status_code}
http_active_connections
```

### Business Metrics
```
business_operations_total{operation_type, status}
business_operation_duration_seconds{operation_type}
user_registrations_total{source, country}
user_logins_total{method, success}
order_value_dollars{category, payment_method}
```

### System Metrics
```
system_cpu_usage_percent
system_memory_usage_bytes{type}
system_disk_usage_bytes{device, type}
database_connections_active
database_query_duration_seconds{query_type, table}
cache_hits_total{cache_type, key_pattern}
cache_misses_total{cache_type, key_pattern}
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
DB_HOST=postgres
REDIS_HOST=redis
PROMETHEUS_URL=http://prometheus:9090
LOG_LEVEL=info
```

### Custom Metrics
Để thêm custom metrics mới:

1. Extend `MetricsCollector` class
2. Register metric trong constructor
3. Add recording methods
4. Update Prometheus scraping config
5. Create Grafana panels

### Alert Rules
Thêm alert rules mới trong `prometheus/rules/`:

```yaml
- alert: CustomAlert
  expr: custom_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom alert triggered"
    description: "Custom metric is {{ $value }}"
```

## 🧪 Testing

### Load Testing
```bash
# Simulate high load
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/simulate/load \
    -H "Content-Type: application/json" \
    -d '{"requests": 1000, "delay": 50}' &
done
```

### Error Testing
```bash
# Trigger errors
curl -X POST http://localhost:3000/api/simulate/error \
  -H "Content-Type: application/json" \
  -d '{"errorType": "server_error", "probability": 0.8}'
```

### Metrics Validation
```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=up'
```

## 🐛 Troubleshooting

### Common Issues

1. **Container startup issues**
   ```bash
   docker-compose logs [service-name]
   docker-compose ps
   ```

2. **Metrics not showing**
   - Check Prometheus targets: http://localhost:9090/targets
   - Verify scraping config
   - Check application logs

3. **Dashboard not loading**
   - Verify Grafana datasource connection
   - Check Prometheus query syntax
   - Import dashboard again

4. **Database connection issues**
   ```bash
   docker-compose exec postgres psql -U app_user -d monitoring_app
   ```

### Performance Optimization
- Increase scrape intervals for better performance
- Use recording rules for complex queries
- Optimize database queries và indexes
- Configure proper resource limits

## 🚀 Production Deployment

### Security Considerations
- Enable authentication cho Grafana
- Secure Prometheus với reverse proxy
- Use HTTPS cho all services  
- Implement proper RBAC
- Regular security updates

### Scaling
- Use external storage cho Prometheus
- Implement HA setup
- Load balance application instances
- Monitor resource usage

### Backup & Recovery
- Regular database backups
- Prometheus data retention policy
- Grafana dashboard exports
- Configuration versioning

## 📚 Tài liệu tham khảo

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Prometheus Client for Node.js](https://github.com/siimon/prom-client)
- [Express.js Monitoring](https://expressjs.com/en/advanced/best-practice-performance.html)

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Implement changes với tests
4. Update documentation
5. Submit pull request

## 📝 License

MIT License - xem file LICENSE để biết thêm chi tiết.

---

**Happy Monitoring! 📊✨**

Nếu có bất kỳ câu hỏi nào, vui lòng tạo issue hoặc liên hệ team development.
