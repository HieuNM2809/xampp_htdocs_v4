/**
 * Realistic Client Implementation
 * Client mã hóa data trước khi gửi, nhận response đã mã hóa và giải mã
 */

const axios = require('axios');
const crypto = require('crypto');
const NodeRSA = require('node-rsa');

// Màu sắc console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Secure API Client Class
 * Xử lý mã hóa client-side và giải mã response
 */
class SecureAPIClient {
  constructor(serverURL) {
    this.serverURL = serverURL;
    this.clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.clientPrivateKey = null;
    this.clientPublicKey = null;
    this.serverPublicKey = null;
    this.isSetup = false;
  }

  /**
   * Khởi tạo client - lấy keys và register với server
   */
  async setup() {
    try {
      log('🔧 Setting up secure client...', colors.cyan);
      
      // 1. Lấy server public key
      log('1. Getting server public key...', colors.blue);
      const serverKeyResponse = await axios.get(`${this.serverURL}/api/rsa/public-key`);
      this.serverPublicKey = serverKeyResponse.data.publicKey;
      log('   ✅ Server public key obtained', colors.green);
      
      // 2. Tạo client keypair
      log('2. Generating client keypair...', colors.blue);
      const clientKeyResponse = await axios.get(`${this.serverURL}/api/rsa/generate-keypair`);
      this.clientPrivateKey = clientKeyResponse.data.privateKey;
      this.clientPublicKey = clientKeyResponse.data.publicKey;
      log('   ✅ Client keypair generated', colors.green);
      
      // 3. Register client với server (nếu có endpoint)
      try {
        log('3. Registering client with server...', colors.blue);
        await axios.post(`${this.serverURL}/api/client/register`, {
          clientId: this.clientId,
          clientPublicKey: this.clientPublicKey
        });
        log('   ✅ Client registered successfully', colors.green);
      } catch (regError) {
        // Nếu endpoint chưa có, skip bước này
        log('   ⚠️ Client registration endpoint not available (OK for demo)', colors.yellow);
      }
      
      this.isSetup = true;
      log('🎉 Client setup completed!', colors.bright + colors.green);
      
      return {
        clientId: this.clientId,
        clientPublicKey: this.clientPublicKey,
        serverPublicKey: this.serverPublicKey
      };
      
    } catch (error) {
      log(`❌ Client setup failed: ${error.message}`, colors.red);
      throw error;
    }
  }

  /**
   * Encrypt data bằng AES
   */
  encryptAES(text, key, iv) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt data bằng AES
   */
  decryptAES(encryptedText, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Gửi request đã mã hóa lên server
   */
  async secureRequest(endpoint, data, options = {}) {
    if (!this.isSetup) {
      throw new Error('Client chưa được setup. Gọi setup() trước.');
    }

    try {
      log(`\n🔐 Preparing secure request to ${endpoint}`, colors.cyan);
      
      // === ENCRYPT REQUEST ===
      log('1. Encrypting request data...', colors.blue);
      
      const requestPayload = JSON.stringify(data);
      log(`   Original payload (${requestPayload.length} chars): ${requestPayload.substring(0, 100)}...`, colors.blue);
      
      // Tạo AES materials cho request
      const aesKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      // Mã hóa request data bằng AES
      const encryptedData = this.encryptAES(requestPayload, aesKey, iv);
      log(`   ✅ Data encrypted with AES (${encryptedData.length} chars)`, colors.green);
      
      // Mã hóa AES materials bằng server public key
      const serverRSA = new NodeRSA(this.serverPublicKey);
      const encryptedAESKey = serverRSA.encrypt(aesKey.toString('hex'), 'base64');
      const encryptedIV = serverRSA.encrypt(iv.toString('hex'), 'base64');
      log('   ✅ AES materials encrypted with RSA', colors.green);
      
      // === SEND ENCRYPTED REQUEST ===
      log('2. Sending encrypted request to server...', colors.blue);
      
      const requestBody = {
        clientId: this.clientId,
        encryptedData,
        encryptedAESKey,
        encryptedIV,
        timestamp: Date.now(),
        ...options
      };
      
      const startTime = Date.now();
      const response = await axios.post(`${this.serverURL}${endpoint}`, requestBody);
      const requestTime = Date.now() - startTime;
      
      log(`   ✅ Server responded in ${requestTime}ms`, colors.green);
      
      // === DECRYPT RESPONSE ===
      log('3. Decrypting server response...', colors.blue);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Server error');
      }
      
      const { 
        encryptedResponse, 
        encryptedAESKey: respAESKey, 
        encryptedIV: respIV 
      } = response.data;
      
      // Giải mã AES materials bằng client private key
      const clientRSA = new NodeRSA(this.clientPrivateKey);
      const responseAESKey = clientRSA.decrypt(respAESKey, 'utf8');
      const responseIV = clientRSA.decrypt(respIV, 'utf8');
      log('   ✅ Response AES materials decrypted', colors.green);
      
      // Giải mã response data bằng AES
      const decryptedResponse = this.decryptAES(
        encryptedResponse,
        Buffer.from(responseAESKey, 'hex'),
        Buffer.from(responseIV, 'hex')
      );
      log('   ✅ Response data decrypted', colors.green);
      
      const finalResult = JSON.parse(decryptedResponse);
      log('🎉 Secure request completed successfully!', colors.bright + colors.green);
      
      return {
        data: finalResult,
        metadata: {
          requestTime,
          clientId: this.clientId,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      log(`❌ Secure request failed: ${error.message}`, colors.red);
      throw error;
    }
  }

  /**
   * Utility: Gửi multiple requests song song
   */
  async batchSecureRequests(requests) {
    log(`\n📦 Processing ${requests.length} secure requests in batch...`, colors.cyan);
    
    const promises = requests.map((req, index) => 
      this.secureRequest(req.endpoint, req.data, { batchIndex: index })
        .then(result => ({ index, success: true, result }))
        .catch(error => ({ index, success: false, error: error.message }))
    );
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    
    log(`📊 Batch completed: ${successful}/${requests.length} successful`, 
        successful === requests.length ? colors.green : colors.yellow);
    
    return results;
  }
}

// ==================== DEMO FUNCTIONS ====================

/**
 * Demo 1: Basic secure communication
 */
async function basicSecureCommunicationDemo() {
  log('\n🔐 DEMO 1: Basic Secure Communication', colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    const client = new SecureAPIClient('http://localhost:3000');
    await client.setup();
    
    // Test data - business transaction
    const transactionData = {
      type: 'money_transfer',
      from: {
        account: '1234567890',
        name: 'John Doe',
        bank: 'ABC Bank'
      },
      to: {
        account: '9876543210', 
        name: 'Jane Smith',
        bank: 'XYZ Bank'
      },
      amount: 75000,
      currency: 'USD',
      description: 'Business payment for services',
      metadata: {
        ip: '192.168.1.100',
        device: 'Mobile App v2.1.0',
        location: 'New York, NY'
      }
    };
    
    log('💰 Processing secure money transfer...', colors.yellow);
    log(`Transfer: $${transactionData.amount} from ${transactionData.from.name} to ${transactionData.to.name}`, colors.blue);
    
    // Gửi secure request (sẽ fallback về /api/hybrid/encrypt vì chưa có /api/secure/process)
    const result = await client.secureRequest('/api/hybrid/encrypt', transactionData);
    
    log('✅ Transaction processed securely!', colors.green);
    log('Result preview:', colors.cyan);
    console.log(JSON.stringify(result.data, null, 2));
    
    return result;
    
  } catch (error) {
    log(`❌ Demo 1 failed: ${error.message}`, colors.red);
  }
}

/**
 * Demo 2: Batch processing
 */
async function batchProcessingDemo() {
  log('\n📦 DEMO 2: Batch Secure Processing', colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    const client = new SecureAPIClient('http://localhost:3000');
    await client.setup();
    
    // Multiple business operations
    const batchRequests = [
      {
        endpoint: '/api/hybrid/encrypt',
        data: {
          operation: 'user_login',
          username: 'admin@company.com',
          password: 'super_secret_password_123',
          mfa_token: '123456',
          session_data: { role: 'admin', permissions: ['read', 'write', 'delete'] }
        }
      },
      {
        endpoint: '/api/hybrid/encrypt', 
        data: {
          operation: 'database_query',
          query: 'SELECT * FROM sensitive_customer_data WHERE status = ?',
          params: ['active'],
          security_level: 'high'
        }
      },
      {
        endpoint: '/api/hybrid/encrypt',
        data: {
          operation: 'api_key_generation',
          user_id: 'user_12345',
          permissions: ['api_read', 'api_write'],
          expiry: '2024-12-31T23:59:59Z'
        }
      }
    ];
    
    log(`Processing ${batchRequests.length} different operations securely...`, colors.yellow);
    
    const results = await client.batchSecureRequests(batchRequests);
    
    log('\n📊 Batch Results:', colors.cyan);
    results.forEach((result, index) => {
      if (result.success) {
        log(`  ✅ Request ${index + 1}: Success`, colors.green);
      } else {
        log(`  ❌ Request ${index + 1}: ${result.error}`, colors.red);
      }
    });
    
    return results;
    
  } catch (error) {
    log(`❌ Demo 2 failed: ${error.message}`, colors.red);
  }
}

/**
 * Demo 3: Performance testing
 */
async function performanceDemo() {
  log('\n⏱️ DEMO 3: Performance Testing', colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    const client = new SecureAPIClient('http://localhost:3000');
    await client.setup();
    
    const testSizes = [
      { name: 'Small (1KB)', size: 1024 },
      { name: 'Medium (10KB)', size: 10 * 1024 },
      { name: 'Large (50KB)', size: 50 * 1024 }
    ];
    
    for (const test of testSizes) {
      log(`\n🧪 Testing ${test.name} payload...`, colors.yellow);
      
      // Tạo test payload
      const testPayload = {
        test_name: test.name,
        data: 'X'.repeat(test.size - 100), // Trừ đi metadata
        timestamp: Date.now(),
        checksum: crypto.randomBytes(16).toString('hex')
      };
      
      log(`   Payload size: ${JSON.stringify(testPayload).length} characters`, colors.blue);
      
      // Measure performance  
      const startTime = Date.now();
      const result = await client.secureRequest('/api/hybrid/encrypt', testPayload);
      const totalTime = Date.now() - startTime;
      
      log(`   ⚡ Total time: ${totalTime}ms`, colors.green);
      log(`   📊 Throughput: ${(test.size / totalTime * 1000 / 1024).toFixed(2)} KB/s`, colors.cyan);
    }
    
  } catch (error) {
    log(`❌ Demo 3 failed: ${error.message}`, colors.red);
  }
}

/**
 * Demo 4: Error handling
 */
async function errorHandlingDemo() {
  log('\n❌ DEMO 4: Error Handling', colors.bright + colors.red);
  log('='.repeat(60), colors.red);
  
  const client = new SecureAPIClient('http://localhost:3000');
  await client.setup();
  
  // Test 1: Invalid endpoint
  try {
    log('\n1. Testing invalid endpoint...', colors.yellow);
    await client.secureRequest('/api/invalid/endpoint', { test: 'data' });
  } catch (error) {
    log('   ✅ Correctly handled invalid endpoint', colors.green);
    log(`   Error: ${error.message}`, colors.cyan);
  }
  
  // Test 2: Server down
  try {
    log('\n2. Testing server connection (wrong port)...', colors.yellow);
    const badClient = new SecureAPIClient('http://localhost:9999');
    await badClient.setup();
  } catch (error) {
    log('   ✅ Correctly handled connection error', colors.green);
    log(`   Error: ${error.message.substring(0, 100)}...`, colors.cyan);
  }
  
  // Test 3: Invalid data
  try {
    log('\n3. Testing circular reference data...', colors.yellow);
    const circularData = { test: 'value' };
    circularData.circular = circularData; // Tạo circular reference
    
    await client.secureRequest('/api/hybrid/encrypt', circularData);
  } catch (error) {
    log('   ✅ Correctly handled circular reference', colors.green);
    log(`   Error: ${error.message}`, colors.cyan);
  }
}

/**
 * Main function để chạy tất cả demos
 */
async function runRealisticClientDemo() {
  log('\n🚀 REALISTIC CLIENT DEMO - SECURE API COMMUNICATION', colors.bright + colors.green);
  log('='.repeat(80), colors.green);
  log('This demo shows how client encrypts data before sending to server', colors.blue);
  log('and decrypts the encrypted response from server.', colors.blue);
  
  try {
    // Kiểm tra server
    await axios.get('http://localhost:3000/');
    log('✅ Server is running', colors.green);
    
    // Chạy các demos
    await basicSecureCommunicationDemo();
    await batchProcessingDemo();
    await performanceDemo();
    await errorHandlingDemo();
    
    log('\n🎊 ALL REALISTIC CLIENT DEMOS COMPLETED!', colors.bright + colors.green);
    log('='.repeat(80), colors.green);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌ Cannot connect to server!', colors.red);
      log('Please start the server first: npm start', colors.yellow);
    } else {
      log(`❌ Demo failed: ${error.message}`, colors.red);
    }
  }
}

// Export cho sử dụng trong file khác
module.exports = {
  SecureAPIClient,
  basicSecureCommunicationDemo,
  batchProcessingDemo,
  performanceDemo,
  errorHandlingDemo,
  runRealisticClientDemo
};

// Chạy demo nếu file được gọi trực tiếp
if (require.main === module) {
  runRealisticClientDemo();
}
