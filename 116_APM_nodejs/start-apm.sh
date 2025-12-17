#!/bin/bash

# Script khởi chạy APM Stack
echo "🚀 Khởi chạy Elastic APM Stack..."

# Kiểm tra Docker
if ! docker --version > /dev/null 2>&1; then
    echo "❌ Docker chưa được cài đặt!"
    exit 1
fi

if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ Docker Compose chưa được cài đặt!"
    exit 1
fi

# Khởi chạy services
echo "📦 Đang khởi chạy Elasticsearch, Kibana và APM Server..."
docker-compose up -d

# Đợi services sẵn sàng
echo "⏳ Đợi services khởi động..."
sleep 30

# Kiểm tra health
echo "🔍 Kiểm tra trạng thái services..."

# Check Elasticsearch
if curl -s http://localhost:9200 > /dev/null; then
    echo "✅ Elasticsearch: http://localhost:9200"
else
    echo "❌ Elasticsearch chưa sẵn sàng"
fi

# Check APM Server
if curl -s http://localhost:8200 > /dev/null; then
    echo "✅ APM Server: http://localhost:8200"
else
    echo "❌ APM Server chưa sẵn sàng"
fi

# Check Kibana (takes longer to start)
echo "⏳ Đợi Kibana khởi động (có thể mất 1-2 phút)..."
for i in {1..30}; do
    if curl -s http://localhost:5601/api/status > /dev/null; then
        echo "✅ Kibana: http://localhost:5601"
        break
    fi
    echo "   Đợi Kibana... ($i/30)"
    sleep 10
done

echo ""
echo "🎉 APM Stack đã sẵn sàng!"
echo "📊 Truy cập Kibana APM: http://localhost:5601/app/apm"
echo "📈 APM Server endpoint: http://localhost:8200"
echo ""
echo "💡 Để xem logs: docker-compose logs -f"
echo "🛑 Để dừng: docker-compose down"
