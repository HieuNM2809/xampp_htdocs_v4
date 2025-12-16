#!/usr/bin/env node

/**
 * Script kiểm tra APM Server có sẵn sàng không
 * Chạy: node check-apm.js
 */

const http = require('http');

const APM_SERVER_URL = process.env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200';
const ELASTICSEARCH_URL = 'http://localhost:9200';
const KIBANA_URL = 'http://localhost:5601';

// Helper function để check service
function checkService(url, serviceName) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        url,
        serviceName,
        status: 'OK',
        statusCode: res.statusCode,
        available: res.statusCode < 400
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        serviceName,
        status: 'ERROR',
        error: error.message,
        available: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        serviceName,
        status: 'TIMEOUT',
        error: 'Connection timeout',
        available: false
      });
    });

    req.end();
  });
}

async function checkAllServices() {
  console.log('🔍 Kiểm tra Elastic Stack services...\n');

  const services = [
    { url: ELASTICSEARCH_URL, name: 'Elasticsearch' },
    { url: APM_SERVER_URL, name: 'APM Server' },
    { url: `${KIBANA_URL}/api/status`, name: 'Kibana' }
  ];

  const results = await Promise.all(
    services.map(service => checkService(service.url, service.name))
  );

  let allAvailable = true;
  
  results.forEach(result => {
    const status = result.available ? '✅' : '❌';
    const statusText = result.available ? 'AVAILABLE' : 'NOT AVAILABLE';
    
    console.log(`${status} ${result.serviceName}: ${statusText}`);
    console.log(`   URL: ${result.url}`);
    
    if (!result.available) {
      console.log(`   Error: ${result.error || result.status}`);
      allAvailable = false;
    }
    
    if (result.statusCode) {
      console.log(`   Status Code: ${result.statusCode}`);
    }
    
    console.log('');
  });

  return { allAvailable, results };
}

async function main() {
  try {
    const { allAvailable } = await checkAllServices();

    if (allAvailable) {
      console.log('🎉 Tất cả services đều sẵn sàng!');
      console.log('✨ Bạn có thể chạy ứng dụng Node.js với APM monitoring');
      console.log('\nNext steps:');
      console.log('1. npm start (hoặc npm run dev)');
      console.log('2. Truy cập http://localhost:3000');
      console.log('3. Truy cập Kibana: http://localhost:5601');
      process.exit(0);
    } else {
      console.log('⚠️  Một số services chưa sẵn sàng');
      console.log('\n🛠️  Hướng dẫn khắc phục:');
      console.log('1. Khởi động Elastic Stack:');
      console.log('   docker-compose up -d');
      console.log('\n2. Chờ services khởi động (2-3 phút):');
      console.log('   docker-compose ps');
      console.log('\n3. Kiểm tra logs nếu có lỗi:');
      console.log('   docker-compose logs elasticsearch');
      console.log('   docker-compose logs apm-server');
      console.log('   docker-compose logs kibana');
      console.log('\n4. Chạy lại script này để kiểm tra:');
      console.log('   node check-apm.js');
      
      console.log('\nℹ️  Lưu ý: Ứng dụng Node.js vẫn có thể chạy mà không cần APM server,');
      console.log('   chỉ là sẽ không có monitoring data.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra services:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Bye!');
  process.exit(0);
});

main().catch(console.error);
