#!/bin/bash

# Script to create SCRAM-SHA-256 users in Kafka
# Run this script after Kafka is started

KAFKA_CONTAINER="kafka"
BOOTSTRAP_SERVER="localhost:29092"

echo "🔐 Creating SCRAM-SHA-256 users..."

# Create admin user
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=admin-secret],SCRAM-SHA-512=[password=admin-secret]' \
  --entity-type users \
  --entity-name admin

# Create kafka-admin user
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=kafka-admin-secret],SCRAM-SHA-512=[password=kafka-admin-secret]' \
  --entity-type users \
  --entity-name kafka-admin

# Create producer user
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=producer-secret]' \
  --entity-type users \
  --entity-name producer

# Create consumer user
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=consumer-secret]' \
  --entity-type users \
  --entity-name consumer

# Create nodejs-app user
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=nodejs-app-secret]' \
  --entity-type users \
  --entity-name nodejs-app

# Create demo user
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --alter \
  --add-config 'SCRAM-SHA-256=[password=demo-password]' \
  --entity-type users \
  --entity-name demo-user

echo "✅ SCRAM users created successfully!"

# List all SCRAM users
echo "📋 Listing all SCRAM users:"
docker exec $KAFKA_CONTAINER kafka-configs \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --describe \
  --entity-type users
