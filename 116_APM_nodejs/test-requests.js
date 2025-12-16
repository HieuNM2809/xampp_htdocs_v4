/**
 * Script để test các API endpoints và tạo dữ liệu cho APM monitoring
 * Chạy: node test-requests.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const REQUESTS_COUNT = 50;
const DELAY_BETWEEN_REQUESTS = 500; // ms

// Helper function để make HTTP request
function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'APM-Test-Script/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          path: path
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Helper function để delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test scenarios
const TEST_SCENARIOS = [
  { path: '/', name: 'Home' },
  { path: '/health', name: 'Health Check' },
  { path: '/api/users', name: 'Users List' },
  { path: '/api/slow?delay=1000', name: 'Slow Operation (1s)' },
  { path: '/api/slow?delay=2000', name: 'Slow Operation (2s)' },
  { path: '/api/slow?delay=3000', name: 'Slow Operation (3s)' },
  { path: '/api/error', name: 'Random Error' },
  { path: '/api/metrics', name: 'Custom Metrics' },
  { path: '/api/nonexistent', name: '404 Error' }
];

async function runTests() {
  console.log('🚀 Bắt đầu test APM monitoring...\n');
  console.log(`Sẽ gửi ${REQUESTS_COUNT} requests với delay ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log(`Tổng thời gian dự kiến: ~${(REQUESTS_COUNT * DELAY_BETWEEN_REQUESTS / 1000).toFixed(1)} giây\n`);
  
  const results = {
    total: 0,
    success: 0,
    error: 0,
    timeouts: 0,
    scenarios: {}
  };

  for (let i = 1; i <= REQUESTS_COUNT; i++) {
    // Random chọn scenario
    const scenario = TEST_SCENARIOS[Math.floor(Math.random() * TEST_SCENARIOS.length)];
    
    try {
      console.log(`[${i.toString().padStart(2, '0')}/${REQUESTS_COUNT}] Testing ${scenario.name} (${scenario.path})`);
      
      const startTime = Date.now();
      const response = await makeRequest(scenario.path);
      const duration = Date.now() - startTime;
      
      results.total++;
      
      if (response.statusCode < 500) {
        results.success++;
        console.log(`  ✅ Status: ${response.statusCode} | Duration: ${duration}ms`);
      } else {
        results.error++;
        console.log(`  ❌ Status: ${response.statusCode} | Duration: ${duration}ms`);
      }
      
      // Track scenario stats
      if (!results.scenarios[scenario.name]) {
        results.scenarios[scenario.name] = { count: 0, success: 0, error: 0 };
      }
      results.scenarios[scenario.name].count++;
      
      if (response.statusCode < 500) {
        results.scenarios[scenario.name].success++;
      } else {
        results.scenarios[scenario.name].error++;
      }
      
    } catch (error) {
      results.total++;
      results.timeouts++;
      console.log(`  ⏰ Timeout/Error: ${error.message}`);
    }
    
    // Delay between requests
    if (i < REQUESTS_COUNT) {
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 KẾT QUẢ TỔNG KẾT');
  console.log('='.repeat(50));
  console.log(`Tổng requests: ${results.total}`);
  console.log(`Thành công: ${results.success} (${(results.success/results.total*100).toFixed(1)}%)`);
  console.log(`Lỗi server: ${results.error} (${(results.error/results.total*100).toFixed(1)}%)`);
  console.log(`Timeout: ${results.timeouts} (${(results.timeouts/results.total*100).toFixed(1)}%)`);
  
  console.log('\n📈 CHI TIẾT THEO SCENARIO:');
  Object.entries(results.scenarios).forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.success}/${stats.count} thành công`);
  });
  
  console.log('\n💡 HƯỚNG DẪN:');
  console.log('1. Truy cập Kibana: http://localhost:5601');
  console.log('2. Vào Observability → APM');
  console.log('3. Chọn service "nodejs-apm-example"');
  console.log('4. Explore traces, errors, và metrics!');
  console.log('\n✨ APM test completed!');
}

// Kiểm tra server có đang chạy không
async function checkServer() {
  try {
    await makeRequest('/health');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Kiểm tra server...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server không chạy tại http://localhost:3000');
    console.log('Hãy chạy: npm start hoặc npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server đang chạy!');
  console.log('⏳ Bắt đầu test sau 2 giây...\n');
  
  await delay(2000);
  await runTests();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run
main().catch(console.error);
