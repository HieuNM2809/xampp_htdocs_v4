/**
 * Realistic Server Implementation  
 * Server nhận encrypted data từ client, giải mã, xử lý business logic,
 * rồi mã hóa response trả về client
 */

const express = require('express');
const crypto = require('crypto');
const NodeRSA = require('node-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001; // Khác port với demo server

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Tăng limit cho large payloads
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== SERVER INITIALIZATION ====================

// Tạo server RSA keypair
const serverRSA = new NodeRSA({ b: 2048 });
const serverPublicKey = serverRSA.exportKey('public');
const serverPrivateKey = serverRSA.exportKey('private');

console.log('\n🔑 Server RSA Keys Generated');
console.log('📖 Public Key Preview:', serverPublicKey.substring(0, 100) + '...');

// In-memory storage cho client public keys (production nên dùng database)
const registeredClients = new Map();

// ==================== UTILITY FUNCTIONS ====================

/**
 * Encrypt data với AES
 */
function encryptAES(text, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypt data với AES
 */
function decryptAES(encryptedText, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Simulate business logic processing
 */
async function processBusinessLogic(requestData) {
  console.log('⚙️ Processing business logic for:', requestData.type || requestData.operation || 'unknown');
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  
  const result = {
    success: true,
    processedAt: new Date().toISOString(),
    requestId: 'req_' + Math.random().toString(36).substr(2, 9),
    originalRequest: {
      type: requestData.type || requestData.operation,
      size: JSON.stringify(requestData).length
    }
  };
  
  // Business logic dựa trên request type
  if (requestData.type === 'money_transfer') {
    result.transaction = {
      id: 'txn_' + Date.now(),
      status: 'completed',
      from: requestData.from?.account,
      to: requestData.to?.account, 
      amount: requestData.amount,
      currency: requestData.currency,
      fee: requestData.amount * 0.02, // 2% fee
      finalAmount: requestData.amount * 0.98,
      processedBy: 'Secure Payment Gateway v2.1'
    };
  } else if (requestData.operation === 'user_login') {
    result.session = {
      sessionId: 'sess_' + Date.now(),
      userId: 'user_' + Math.random().toString(36).substr(2, 8),
      role: requestData.session_data?.role || 'user',
      permissions: requestData.session_data?.permissions || ['read'],
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      token: 'bearer_' + crypto.randomBytes(32).toString('hex')
    };
  } else if (requestData.operation === 'database_query') {
    result.query = {
      executed: true,
      query: requestData.query,
      rowCount: Math.floor(Math.random() * 1000),
      executionTime: Math.random() * 100,
      security: {
        level: requestData.security_level,
        audited: true,
        sanitized: true
      }
    };
  } else if (requestData.operation === 'api_key_generation') {
    result.apiKey = {
      keyId: 'key_' + Date.now(),
      key: 'sk_' + crypto.randomBytes(32).toString('hex'),
      userId: requestData.user_id,
      permissions: requestData.permissions,
      createdAt: new Date().toISOString(),
      expiresAt: requestData.expiry,
      rateLimit: '1000 requests/hour'
    };
  } else {
    // Generic processing
    result.processed = {
      dataReceived: true,
      dataSize: JSON.stringify(requestData).length,
      checksum: crypto.createHash('sha256').update(JSON.stringify(requestData)).digest('hex'),
      message: 'Data processed successfully'
    };
  }
  
  console.log('✅ Business logic completed:', result.requestId);
  return result;
}

// ==================== API ENDPOINTS ====================

/**
 * Get server public key
 */
app.get('/api/rsa/public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: serverPublicKey,
    message: 'Server public key retrieved successfully',
    keyInfo: {
      size: '2048 bits',
      type: 'RSA',
      usage: 'Encrypt AES keys for secure communication'
    }
  });
});

/**
 * Generate keypair for client
 */
app.get('/api/rsa/generate-keypair', (req, res) => {
  try {
    const clientRSA = new NodeRSA({ b: 2048 });
    const clientPublicKey = clientRSA.exportKey('public');
    const clientPrivateKey = clientRSA.exportKey('private');
    
    res.json({
      success: true,
      publicKey: clientPublicKey,
      privateKey: clientPrivateKey,
      keySize: '2048 bits',
      message: 'Client RSA keypair generated successfully',
      note: 'Keep your private key secure! Never share it with anyone.',
      usage: 'Use public key for others to encrypt data for you, use private key to decrypt'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Register client public key
 */
app.post('/api/client/register', (req, res) => {
  try {
    const { clientId, clientPublicKey } = req.body;
    
    if (!clientId || !clientPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'clientId and clientPublicKey are required'
      });
    }
    
    // Validate public key format
    try {
      new NodeRSA(clientPublicKey, 'public');
    } catch (keyError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key format'
      });
    }
    
    // Store client public key
    registeredClients.set(clientId, {
      publicKey: clientPublicKey,
      registeredAt: new Date().toISOString(),
      lastUsed: null
    });
    
    console.log(`📝 Client registered: ${clientId}`);
    
    res.json({
      success: true,
      message: 'Client registered successfully',
      clientId: clientId,
      registeredClients: registeredClients.size
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Main endpoint: Xử lý encrypted request và trả encrypted response
 */
app.post('/api/secure/process', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      clientId,
      encryptedData,
      encryptedAESKey,
      encryptedIV,
      timestamp
    } = req.body;
    
    // Validate required fields
    if (!clientId || !encryptedData || !encryptedAESKey || !encryptedIV) {
      return res.status(400).json({
        success: false,
        error: 'clientId, encryptedData, encryptedAESKey, and encryptedIV are required'
      });
    }
    
    console.log(`\n🔓 Processing secure request from client: ${clientId}`);
    
    // === DECRYPT REQUEST ===
    console.log('1. Decrypting request...');
    
    // Giải mã AES materials bằng server private key
    const aesKey = serverRSA.decrypt(encryptedAESKey, 'utf8');
    const iv = serverRSA.decrypt(encryptedIV, 'utf8');
    console.log('   ✅ AES materials decrypted');
    
    // Giải mã request data bằng AES
    const requestDataStr = decryptAES(
      encryptedData,
      Buffer.from(aesKey, 'hex'),
      Buffer.from(iv, 'hex')
    );
    const requestData = JSON.parse(requestDataStr);
    console.log('   ✅ Request data decrypted');
    console.log('   📋 Request type:', requestData.type || requestData.operation || 'unknown');
    
    // === PROCESS BUSINESS LOGIC ===
    console.log('2. Processing business logic...');
    const processedResult = await processBusinessLogic(requestData);
    
    // === ENCRYPT RESPONSE ===
    console.log('3. Encrypting response...');
    
    // Lấy client public key để mã hóa response
    const clientInfo = registeredClients.get(clientId);
    if (!clientInfo) {
      // Fallback: Nếu client chưa register, dùng server key để demo
      console.log('   ⚠️ Client not registered, using server key for demo');
      
      const responseAESKey = crypto.randomBytes(32);
      const responseIV = crypto.randomBytes(16);
      
      const encryptedResponse = encryptAES(
        JSON.stringify(processedResult),
        responseAESKey,
        responseIV
      );
      
      const encryptedResponseAESKey = serverRSA.encrypt(responseAESKey.toString('hex'), 'base64');
      const encryptedResponseIV = serverRSA.encrypt(responseIV.toString('hex'), 'base64');
      
      console.log('   ✅ Response encrypted with server key (demo mode)');
      
      const processingTime = Date.now() - startTime;
      
      return res.json({
        success: true,
        encryptedResponse,
        encryptedAESKey: encryptedResponseAESKey,
        encryptedIV: encryptedResponseIV,
        message: 'Request processed and response encrypted successfully (demo mode)',
        metadata: {
          clientId,
          processingTime: processingTime + 'ms',
          timestamp: Date.now(),
          encryptionMode: 'server_key_demo'
        }
      });
    }
    
    // Normal flow: Mã hóa response bằng client public key
    const clientPublicKey = clientInfo.publicKey;
    const clientRSA = new NodeRSA(clientPublicKey, 'public');
    
    // Update last used
    clientInfo.lastUsed = new Date().toISOString();
    
    // Tạo AES materials mới cho response
    const responseAESKey = crypto.randomBytes(32);
    const responseIV = crypto.randomBytes(16);
    
    // Mã hóa response data bằng AES
    const encryptedResponse = encryptAES(
      JSON.stringify(processedResult),
      responseAESKey,
      responseIV
    );
    
    // Mã hóa AES materials bằng client public key
    const encryptedResponseAESKey = clientRSA.encrypt(responseAESKey.toString('hex'), 'base64');
    const encryptedResponseIV = clientRSA.encrypt(responseIV.toString('hex'), 'base64');
    
    console.log('   ✅ Response encrypted with client public key');
    
    const processingTime = Date.now() - startTime;
    console.log(`🎉 Request processed successfully in ${processingTime}ms`);
    
    res.json({
      success: true,
      encryptedResponse,
      encryptedAESKey: encryptedResponseAESKey,
      encryptedIV: encryptedResponseIV,
      message: 'Request processed and response encrypted successfully',
      metadata: {
        clientId,
        processingTime: processingTime + 'ms',
        timestamp: Date.now(),
        encryptionMode: 'client_key'
      }
    });
    
  } catch (error) {
    console.error('❌ Secure processing failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Secure processing failed: ' + error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'Realistic Secure API Server',
    version: '1.0.0',
    status: 'running',
    uptime: process.uptime(),
    registeredClients: registeredClients.size,
    timestamp: Date.now()
  });
});

/**
 * API Info endpoint
 */
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    service: 'Realistic Secure API Server',
    description: 'Server that receives encrypted requests, processes them, and returns encrypted responses',
    features: [
      'Client-side encryption before sending',
      'Server-side decryption and processing',
      'Server-side encryption before response',
      'Client-side decryption of response',
      'RSA + AES hybrid encryption',
      'Client registration and key management'
    ],
    endpoints: {
      setup: [
        'GET /api/rsa/public-key - Get server public key',
        'GET /api/rsa/generate-keypair - Generate client keypair',
        'POST /api/client/register - Register client public key'
      ],
      secure: [
        'POST /api/secure/process - Process encrypted request'
      ],
      utility: [
        'GET /api/health - Health check',
        'GET /api/info - This endpoint'
      ]
    },
    flow: [
      '1. Client gets server public key',
      '2. Client generates own keypair', 
      '3. Client registers public key with server',
      '4. Client encrypts request data with AES',
      '5. Client encrypts AES materials with server public key',
      '6. Client sends encrypted request to server',
      '7. Server decrypts AES materials with server private key',
      '8. Server decrypts request data with AES',
      '9. Server processes business logic',
      '10. Server encrypts response data with new AES',
      '11. Server encrypts AES materials with client public key',
      '12. Server sends encrypted response to client',
      '13. Client decrypts response'
    ]
  });
});

/**
 * Home endpoint
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Realistic Secure API Server',
    version: '1.0.0',
    description: 'Demonstrates proper client-server hybrid encryption flow',
    documentation: 'GET /api/info',
    health: 'GET /api/health',
    demo: 'Use realistic-client.js to test secure communication'
  });
});

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log(`\n🚀 Realistic Secure API Server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/info`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 RSA Key Size: 2048 bits`);
  console.log(`🔐 AES Key Size: 256 bits`);
  console.log(`👥 Registered Clients: ${registeredClients.size}`);
  console.log(`\n💡 This server demonstrates the realistic flow:`);
  console.log(`   Client encrypts → Server decrypts & processes → Server encrypts response → Client decrypts`);
  console.log(`\n🧪 Test with: node realistic-client.js\n`);
});

module.exports = app;
