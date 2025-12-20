@echo off
echo Starting SonarQube scan for Node.js project...

REM Check if SonarQube is running
echo Checking SonarQube connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:9000/api/system/status' -TimeoutSec 5; Write-Host 'SonarQube is running' -ForegroundColor Green } catch { Write-Host 'SonarQube is not accessible. Please start it first using: docker-compose up -d' -ForegroundColor Red; exit 1 }"

REM Run the scan (sử dụng cấu hình từ sonar-project.properties)
echo Running SonarQube Scanner...
echo Using configuration from sonar-project.properties
npx sonarqube-scanner

echo Scan completed! Check results at: http://localhost:9000
pause
