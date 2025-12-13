const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Màu sắc cho console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, colors.cyan);
  log(`${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(50)}`, colors.cyan);
}

function logStep(step, description) {
  log(`\n${step}. ${description}`, colors.yellow);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demoRSA() {
  logSection('🔑 RSA ENCRYPTION DEMO');
  
  try {
    // Test 1: Demo với server key (cũ)
    logStep('1a', 'Demo với Server Key (Backward compatibility)');
    const message1 = 'Hello RSA! Server key demo.';
    log(`Original message: "${message1}"`, colors.blue);
    
    const encryptResponse1 = await axios.post(`${BASE_URL}/api/rsa/encrypt`, {
      message: message1
    });
    
    const encryptedMessage1 = encryptResponse1.data.encryptedMessage;
    log(`Encrypted: ${encryptedMessage1.substring(0, 50)}...`, colors.magenta);
    log('✅ Message encrypted with server key', colors.green);
    
    const decryptResponse1 = await axios.post(`${BASE_URL}/api/rsa/decrypt`, {
      encryptedMessage: encryptedMessage1
    });
    
    log(`Decrypted: "${decryptResponse1.data.decryptedMessage}"`, colors.blue);
    log('✅ Message decrypted with server key', colors.green);
    
    await sleep(1000);
    
    // Test 2: Demo với keypair riêng (mới)
    logStep('1b', 'Demo với Client Keypair (Realistic scenario)');
    
    // Tạo keypair mới
    const keypairResponse = await axios.get(`${BASE_URL}/api/rsa/generate-keypair`);
    const { publicKey, privateKey } = keypairResponse.data;
    log('✅ Generated new RSA keypair for client', colors.green);
    
    const message2 = 'Hello RSA! Client keypair demo.';
    log(`Original message: "${message2}"`, colors.blue);
    
    // Mã hóa với public key riêng
    const encryptResponse2 = await axios.post(`${BASE_URL}/api/rsa/encrypt`, {
      message: message2,
      publicKey: publicKey
    });
    
    const encryptedMessage2 = encryptResponse2.data.encryptedMessage;
    log(`Encrypted with client public key: ${encryptedMessage2.substring(0, 50)}...`, colors.magenta);
    log('✅ Message encrypted with client public key', colors.green);
    
    // Giải mã với private key riêng
    const decryptResponse2 = await axios.post(`${BASE_URL}/api/rsa/decrypt`, {
      encryptedMessage: encryptedMessage2,
      privateKey: privateKey
    });
    
    log(`Decrypted with client private key: "${decryptResponse2.data.decryptedMessage}"`, colors.blue);
    log('✅ Message decrypted with client private key', colors.green);
    
    // Kiểm tra tính chính xác
    if (message1 === decryptResponse1.data.decryptedMessage && 
        message2 === decryptResponse2.data.decryptedMessage) {
      log('🎉 RSA Encryption/Decryption tests PASSED!', colors.bright + colors.green);
    } else {
      log('❌ RSA Encryption/Decryption tests FAILED!', colors.red);
    }
    
  } catch (error) {
    log(`❌ Error in RSA demo: ${error.message}`, colors.red);
  }
}

async function demoAES() {
  logSection('🔐 AES ENCRYPTION DEMO');
  
  try {
    // Bước 1: Tạo AES key
    logStep(1, 'Tạo AES Key và IV');
    const keyResponse = await axios.get(`${BASE_URL}/api/aes/generate-key`);
    const { aesKey, iv } = keyResponse.data;
    
    log(`AES Key: ${aesKey.substring(0, 20)}...`, colors.cyan);
    log(`IV: ${iv.substring(0, 20)}...`, colors.cyan);
    log('✅ AES key and IV generated successfully', colors.green);
    
    await sleep(1000);
    
    // Bước 2: Mã hóa message
    logStep(2, 'Mã hóa message bằng AES');
    const message = 'Hello AES! This is a very long secret message that can be encrypted efficiently with AES symmetric encryption algorithm.';
    log(`Original message: "${message}"`, colors.blue);
    
    const encryptResponse = await axios.post(`${BASE_URL}/api/aes/encrypt`, {
      message: message,
      aesKey: aesKey,
      iv: iv
    });
    
    const encryptedMessage = encryptResponse.data.encryptedMessage;
    log(`Encrypted: ${encryptedMessage.substring(0, 50)}...`, colors.magenta);
    log('✅ Message encrypted successfully', colors.green);
    
    await sleep(1000);
    
    // Bước 3: Giải mã message
    logStep(3, 'Giải mã message bằng AES');
    const decryptResponse = await axios.post(`${BASE_URL}/api/aes/decrypt`, {
      encryptedMessage: encryptedMessage,
      aesKey: aesKey,
      iv: iv
    });
    
    log(`Decrypted: "${decryptResponse.data.decryptedMessage}"`, colors.blue);
    log('✅ Message decrypted successfully', colors.green);
    
    // Kiểm tra tính chính xác
    if (message === decryptResponse.data.decryptedMessage) {
      log('🎉 AES Encryption/Decryption test PASSED!', colors.bright + colors.green);
    } else {
      log('❌ AES Encryption/Decryption test FAILED!', colors.red);
    }
    
  } catch (error) {
    log(`❌ Error in AES demo: ${error.message}`, colors.red);
  }
}

async function demoHybrid() {
  logSection('🔄 HYBRID ENCRYPTION DEMO (RSA + AES)');
  
  try {
    // Bước 1: Mã hóa hybrid
    logStep(1, 'Mã hóa message bằng Hybrid Encryption');
    const message = 'Hello Hybrid! This is a demonstration of hybrid encryption combining the security of RSA with the efficiency of AES. This message can be as long as needed because AES handles large data efficiently, while RSA securely encrypts the AES key. This approach is commonly used in secure communications like HTTPS, VPNs, and secure messaging applications.';
    log(`Original message: "${message}"`, colors.blue);
    
    const encryptResponse = await axios.post(`${BASE_URL}/api/hybrid/encrypt`, {
      message: message
    });
    
    const { encryptedMessage, encryptedAESKey, encryptedIV } = encryptResponse.data;
    
    log(`Encrypted Message: ${encryptedMessage.substring(0, 50)}...`, colors.magenta);
    log(`Encrypted AES Key: ${encryptedAESKey.substring(0, 50)}...`, colors.cyan);
    log(`Encrypted IV: ${encryptedIV.substring(0, 50)}...`, colors.cyan);
    log('✅ Message encrypted successfully with Hybrid encryption', colors.green);
    
    await sleep(1500);
    
    // Bước 2: Giải mã hybrid
    logStep(2, 'Giải mã message bằng Hybrid Decryption');
    const decryptResponse = await axios.post(`${BASE_URL}/api/hybrid/decrypt`, {
      encryptedMessage: encryptedMessage,
      encryptedAESKey: encryptedAESKey,
      encryptedIV: encryptedIV
    });
    
    log(`Decrypted: "${decryptResponse.data.decryptedMessage}"`, colors.blue);
    log('✅ Message decrypted successfully with Hybrid decryption', colors.green);
    
    // Kiểm tra tính chính xác
    if (message === decryptResponse.data.decryptedMessage) {
      log('🎉 Hybrid Encryption/Decryption test PASSED!', colors.bright + colors.green);
    } else {
      log('❌ Hybrid Encryption/Decryption test FAILED!', colors.red);
    }
    
  } catch (error) {
    log(`❌ Error in Hybrid demo: ${error.message}`, colors.red);
  }
}

async function showAPIInfo() {
  logSection('📖 API INFORMATION');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/info`);
    const info = response.data.info;
    
    log('RSA Information:', colors.yellow);
    log(`  Description: ${info.rsa.description}`, colors.blue);
    log(`  Key Size: ${info.rsa.keySize}`, colors.blue);
    log(`  Advantages: ${info.rsa.advantages.join(', ')}`, colors.green);
    log(`  Disadvantages: ${info.rsa.disadvantages.join(', ')}`, colors.red);
    
    log('\nAES Information:', colors.yellow);
    log(`  Description: ${info.aes.description}`, colors.blue);
    log(`  Key Size: ${info.aes.keySize}`, colors.blue);
    log(`  Advantages: ${info.aes.advantages.join(', ')}`, colors.green);
    log(`  Disadvantages: ${info.aes.disadvantages.join(', ')}`, colors.red);
    
    log('\nHybrid Encryption Process:', colors.yellow);
    info.hybrid.process.forEach(step => {
      log(`  ${step}`, colors.blue);
    });
    
  } catch (error) {
    log(`❌ Error getting API info: ${error.message}`, colors.red);
  }
}

async function runDemo() {
  log('\n🚀 Starting RSA & AES Encryption Demo...', colors.bright + colors.green);
  log('Make sure the server is running at http://localhost:3000', colors.yellow);
  
  try {
    // Kiểm tra server có hoạt động không
    await axios.get(`${BASE_URL}/`);
    log('✅ Server is running!', colors.green);
    
    await sleep(2000);
    
    // Chạy các demo
    await showAPIInfo();
    await sleep(2000);
    
    await demoRSA();
    await sleep(2000);
    
    await demoAES();
    await sleep(2000);
    
    await demoHybrid();
    
    logSection('🎊 DEMO COMPLETED');
    log('All encryption and decryption tests have been completed!', colors.bright + colors.green);
    log('Check the results above to see how RSA, AES, and Hybrid encryption work.', colors.blue);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌ Cannot connect to server!', colors.red);
      log('Please make sure the server is running:', colors.yellow);
      log('  npm start', colors.cyan);
    } else {
      log(`❌ Demo failed: ${error.message}`, colors.red);
    }
  }
}

// Chạy demo nếu file này được gọi trực tiếp
if (require.main === module) {
  runDemo();
}

module.exports = {
  runDemo,
  demoRSA,
  demoAES,
  demoHybrid,
  showAPIInfo
};
