# Kafka Authentication Setup Guide

## 🔐 Setup Authentication

### 1. Cấu hình môi trường

**Không authentication (mặc định):**
```bash
cp .env.example .env
# KAFKA_BROKERS=localhost:9092
```

**Có authentication:**
```bash
cp .env.auth.example .env
# Uncomment và cấu hình:
# KAFKA_BROKERS=localhost:9093
# KAFKA_USERNAME=nodejs-app
# KAFKA_PASSWORD=nodejs-app-secret
# KAFKA_SASL_MECHANISM=plain
```

### 2. Start services

```bash
# Start tất cả services
docker-compose up -d

# Check containers status
docker-compose ps
```

### 3. Tạo SCRAM users (Optional - nâng cao)

```bash
# Chạy script tạo SCRAM users
./kafka-config/create-scram-users.sh

# Hoặc manual:
docker exec kafka kafka-configs \
  --bootstrap-server localhost:29092 \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=nodejs-app-secret]' \
  --entity-type users \
  --entity-name nodejs-app
```

### 4. Test authentication

```bash
# Test với authentication
curl -X POST http://localhost:3000/produce \
  -H "Content-Type: application/json" \
  -d '{"topic":"test-auth","key":"key1","message":{"text":"Hello Secured Kafka!"}}'
```

## 🛡️ Available Users

### PLAIN Authentication
- **admin** / admin-secret (super user)
- **kafka-admin** / kafka-admin-secret (super user)
- **nodejs-app** / nodejs-app-secret (app user)
- **producer** / producer-secret (producer only)
- **consumer** / consumer-secret (consumer only)
- **demo-user** / demo-password (demo/test)

### SASL Mechanisms
- **plain** - Username/password (simple)
- **scram-sha-256** - Hashed passwords (secure)
- **scram-sha-512** - Even more secure

## 🚨 Production Notes

1. **Change default passwords** in production
2. **Use SCRAM** instead of PLAIN for security
3. **Enable SSL/TLS** for encrypted connections
4. **Set proper ACLs** to restrict access
5. **Monitor authentication** logs

## 🔧 Troubleshooting

### Authentication Failures
```bash
# Check Kafka logs
docker-compose logs kafka

# Test connectivity
docker exec nodejs-kafka-app telnet kafka 29093

# List SCRAM users
docker exec kafka kafka-configs \
  --bootstrap-server localhost:29092 \
  --describe --entity-type users
```

### Reset Authentication
```bash
# Stop và xóa volumes
docker-compose down -v

# Start lại
docker-compose up -d
```
