#!/bin/bash

echo "Starting SonarQube scan for Node.js project..."

# Check if SonarQube is running
echo "Checking SonarQube connection..."
if curl -f -s http://localhost:9000/api/system/status > /dev/null; then
    echo "✓ SonarQube is running"
else
    echo "✗ SonarQube is not accessible. Please start it first using: docker-compose up -d"
    exit 1
fi

# Run the scan (sử dụng cấu hình từ sonar-project.properties)
echo "Running SonarQube Scanner..."
echo "Using configuration from sonar-project.properties"
npx sonarqube-scanner

echo "Scan completed! Check results at: http://localhost:9000"
