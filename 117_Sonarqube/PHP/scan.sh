#!/bin/bash

echo "Starting SonarQube scan for PHP project..."

# Check if SonarQube is running
echo "Checking SonarQube connection..."
if ! curl -f -s http://localhost:9000/api/system/status > /dev/null 2>&1; then
    echo "[ERROR] SonarQube is not accessible. Please start it first using: docker-compose up -d"
    exit 1
else
    echo "[SUCCESS] SonarQube is running"
fi

# Run the scan using Docker
echo "Running SonarQube Scanner via Docker..."
echo "Using configuration from sonar-project.properties"

echo "Mounting current directory and running scan..."

# Detect platform and set appropriate host URL
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    HOST_URL="http://host.docker.internal:9000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    HOST_URL="http://172.17.0.1:9000"
else
    # Default/Windows
    HOST_URL="http://host.docker.internal:9000"
fi

docker run --rm \
    -v "$(pwd)":/usr/src \
    -w /usr/src \
    sonarsource/sonar-scanner-cli:latest \
    sonar-scanner \
    -Dsonar.host.url="$HOST_URL" \
    -Dsonar.token=squ_d7b67816e257b0ce40d69777b08a94531b68fccd \
    -Dsonar.projectKey=php-sonarqube-demo \
    -Dsonar.projectName="PHP SonarQube Demo" \
    -Dsonar.sources=src \
    -Dsonar.tests=tests \
    -Dsonar.exclusions=vendor/**,public/**

echo "Scan completed! Check results at: http://localhost:9000"
