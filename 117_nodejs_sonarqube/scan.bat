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

REM Run the scan (sử dụng cấu hình từ sonar-project.properties)
echo Running SonarQube Scanner...
echo Using configuration from sonar-project.properties
npx sonarqube-scanner

echo Scan completed! Check results at: http://localhost:9000
pause
