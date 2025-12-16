#!/usr/bin/env node

/**
 * Script để control APM monitoring
 * Usage: 
 *   node apm-control.js on    - Enable APM
 *   node apm-control.js off   - Disable APM
 *   node apm-control.js status - Check APM status
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');

function readEnvFile() {
  try {
    if (!fs.existsSync(ENV_FILE)) {
      return {};
    }
    
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const lines = content.split('\n');
    const env = {};
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=');
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error('Error reading .env file:', error.message);
    return {};
  }
}

function writeEnvFile(env) {
  try {
    const lines = [];
    lines.push('# APM Configuration');
    lines.push(`ELASTIC_APM_SERVER_URL=${env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200'}`);
    lines.push(`ELASTIC_APM_SECRET_TOKEN=${env.ELASTIC_APM_SECRET_TOKEN || ''}`);
    lines.push(`ELASTIC_APM_ACTIVE=${env.ELASTIC_APM_ACTIVE || 'true'}`);
    lines.push('');
    lines.push('# Application Configuration');
    lines.push(`NODE_ENV=${env.NODE_ENV || 'development'}`);
    lines.push(`PORT=${env.PORT || '3000'}`);
    lines.push('');
    lines.push('# Logging');
    lines.push(`LOG_LEVEL=${env.LOG_LEVEL || 'info'}`);
    
    fs.writeFileSync(ENV_FILE, lines.join('\n'));
    console.log('✅ .env file updated successfully');
  } catch (error) {
    console.error('❌ Error writing .env file:', error.message);
  }
}

function showStatus() {
  const env = readEnvFile();
  const apmActive = env.ELASTIC_APM_ACTIVE !== 'false';
  
  console.log('\n📊 APM Status:');
  console.log(`   Active: ${apmActive ? '✅ YES' : '❌ NO'}`);
  console.log(`   Server URL: ${env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200'}`);
  console.log(`   Environment: ${env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${env.PORT || '3000'}`);
  
  if (apmActive) {
    console.log('\n💡 To disable APM: node apm-control.js off');
  } else {
    console.log('\n💡 To enable APM: node apm-control.js on');
  }
}

function enableAPM() {
  const env = readEnvFile();
  env.ELASTIC_APM_ACTIVE = 'true';
  writeEnvFile(env);
  
  console.log('\n✅ APM đã được BẬT');
  console.log('🔄 Restart ứng dụng để áp dụng: npm run dev');
}

function disableAPM() {
  const env = readEnvFile();
  env.ELASTIC_APM_ACTIVE = 'false';
  writeEnvFile(env);
  
  console.log('\n❌ APM đã được TẮT');
  console.log('🔄 Restart ứng dụng để áp dụng: npm run dev');
  console.log('ℹ️  Ứng dụng sẽ chạy mà không có APM monitoring');
}

function showHelp() {
  console.log('\n🛠️  APM Control Script');
  console.log('\nUsage:');
  console.log('  node apm-control.js on      - Enable APM monitoring');
  console.log('  node apm-control.js off     - Disable APM monitoring');
  console.log('  node apm-control.js status  - Show current APM status');
  console.log('  node apm-control.js help    - Show this help');
  console.log('\nExamples:');
  console.log('  node apm-control.js off     # Tắt APM để tránh lỗi 503');
  console.log('  node apm-control.js status  # Xem trạng thái hiện tại');
  console.log('  node apm-control.js on      # Bật lại APM khi server sẵn sàng');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'on':
  case 'enable':
    enableAPM();
    break;
    
  case 'off':
  case 'disable':
    disableAPM();
    break;
    
  case 'status':
    showStatus();
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    console.log('❌ Invalid command. Use: on, off, status, or help');
    showHelp();
    process.exit(1);
}

console.log(''); // Empty line for better formatting
