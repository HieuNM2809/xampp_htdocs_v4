@echo off
echo Starting SonarQube scan for Node.js project...

REM Check if SonarQube is running
echo Checking SonarQube connection...
curl -f -s http://localhost:9000/api/system/status >nul 2>&1
if errorlevel 1 (
    echo [ERROR] SonarQube is not accessible. Please start it first using: docker-compose up -d
    pause
    exit /b 1
) else (
    echo [SUCCESS] SonarQube is running
)

REM Run the scan (sử dụng Docker để tránh lỗi username có space)
echo Running SonarQube Scanner via Docker...
echo Using configuration from sonar-project.properties

echo Mounting current directory and running scan...
  docker run --rm ^
    -v "%cd%":/usr/src ^
    -w /usr/src ^
    sonarsource/sonar-scanner-cli:latest ^
    sonar-scanner ^
    -Dsonar.host.url=http://host.docker.internal:9000 ^
    -Dsonar.token=squ_d7b67816e257b0ce40d69777b08a94531b68fccd

echo Scan completed! Check results at: http://localhost:9000
pause
