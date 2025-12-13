const express = require('express');
const crypto = require('crypto');
const NodeRSA = require('node-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Tạo cặp khóa RSA mới
const rsaKey = new NodeRSA({ b: 2048 });
const publicKey = rsaKey.exportKey('public');
const privateKey = rsaKey.exportKey('private');

console.log(publicKey);
console.log(privateKey);

console.log('RSA Keys Generated Successfully');

// ==================== RSA ENDPOINTS ====================

// Lấy public key của server
app.get('/api/rsa/public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: publicKey,
    message: 'Server public key retrieved successfully'
  });
});

// Tạo cặp khóa RSA mới cho client
app.get('/api/rsa/generate-keypair', (req, res) => {
  try {
    const newKey = new NodeRSA({ b: 2048 });
    const newPublicKey = newKey.exportKey('public');
    const newPrivateKey = newKey.exportKey('private');
    
    res.json({
      success: true,
      publicKey: newPublicKey,
      privateKey: newPrivateKey,
      keySize: '2048 bits',
      message: 'New RSA keypair generated successfully',
      note: 'Keep your private key secure! Never share it with anyone.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mã hóa RSA (yêu cầu public key)
app.post('/api/rsa/encrypt', (req, res) => {
  try {
    const { message, publicKey: clientPublicKey } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Nếu client cung cấp public key riêng, sử dụng nó
    if (clientPublicKey) {
      try {
        const clientRSA = new NodeRSA();
        clientRSA.importKey(clientPublicKey, 'public');
        const encrypted = clientRSA.encrypt(message, 'base64');
        
        return res.json({
          success: true,
          originalMessage: message,
          encryptedMessage: encrypted,
          usedPublicKey: 'client-provided',
          message: 'Message encrypted successfully with provided public key'
        });
      } catch (keyError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid public key format: ' + keyError.message
        });
      }
    }

    // Fallback: Sử dụng public key của server (cho demo)
    const encrypted = rsaKey.encrypt(message, 'base64');
    
    res.json({
      success: true,
      originalMessage: message,
      encryptedMessage: encrypted,
      usedPublicKey: 'server-default',
      message: 'Message encrypted successfully with server public key (demo mode)',
      note: 'In real applications, you should provide the recipient\'s public key'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Giải mã RSA (yêu cầu private key)
app.post('/api/rsa/decrypt', (req, res) => {
  try {
    const { encryptedMessage, privateKey: clientPrivateKey } = req.body;
    
    if (!encryptedMessage) {
      return res.status(400).json({
        success: false,
        error: 'Encrypted message is required'
      });
    }

    // Nếu client cung cấp private key riêng, sử dụng nó
    if (clientPrivateKey) {
      try {
        const clientRSA = new NodeRSA();
        clientRSA.importKey(clientPrivateKey, 'private');
        const decrypted = clientRSA.decrypt(encryptedMessage, 'utf8');
        
        return res.json({
          success: true,
          encryptedMessage: encryptedMessage,
          decryptedMessage: decrypted,
          usedPrivateKey: 'client-provided',
          message: 'Message decrypted successfully with provided private key'
        });
      } catch (keyError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid private key or decryption failed: ' + keyError.message
        });
      }
    }

    // Fallback: Sử dụng private key của server (cho demo)
    const decrypted = rsaKey.decrypt(encryptedMessage, 'utf8');
    
    res.json({
      success: true,
      encryptedMessage: encryptedMessage,
      decryptedMessage: decrypted,
      usedPrivateKey: 'server-default',
      message: 'Message decrypted successfully with server private key (demo mode)',
      note: 'In real applications, only the recipient should have the private key'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== AES ENDPOINTS ====================

// Tạo khóa AES ngẫu nhiên
app.get('/api/aes/generate-key', (req, res) => {
  const aesKey = crypto.randomBytes(32).toString('hex'); // 256-bit key
  const iv = crypto.randomBytes(16).toString('hex'); // 128-bit IV
  
  res.json({
    success: true,
    aesKey: aesKey,
    iv: iv,
    message: 'AES key and IV generated successfully'
  });
});

// Mã hóa AES
app.post('/api/aes/encrypt', (req, res) => {
  try {
    const { message, aesKey, iv } = req.body;
    
    if (!message || !aesKey || !iv) {
      return res.status(400).json({ 
        success: false,
        error: 'Message, AES key, and IV are required'
      });
    }

    // Chuyển đổi hex string thành Buffer
    const keyBuffer = Buffer.from(aesKey, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    res.json({
      success: true,
      originalMessage: message,
      encryptedMessage: encrypted,
      aesKey: aesKey,
      iv: iv,
      message: 'Message encrypted successfully with AES'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Giải mã AES
app.post('/api/aes/decrypt', (req, res) => {
  try {
    const { encryptedMessage, aesKey, iv } = req.body;
    
    if (!encryptedMessage || !aesKey || !iv) {
      return res.status(400).json({
        success: false,
        error: 'Encrypted message, AES key, and IV are required'
      });
    }

    // Chuyển đổi hex string thành Buffer
    const keyBuffer = Buffer.from(aesKey, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedMessage, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    res.json({
      success: true,
      encryptedMessage: encryptedMessage,
      decryptedMessage: decrypted,
      message: 'Message decrypted successfully with AES'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== HYBRID ENCRYPTION (RSA + AES) ====================

// Demo hybrid encryption: Sử dụng RSA để mã hóa AES key, và AES để mã hóa data
app.post('/api/hybrid/encrypt', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Tạo AES key và IV ngẫu nhiên
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Mã hóa message bằng AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedMessage = cipher.update(message, 'utf8', 'hex');
    encryptedMessage += cipher.final('hex');
    
    // Mã hóa AES key bằng RSA
    const encryptedAESKey = rsaKey.encrypt(aesKey.toString('hex'), 'base64');
    const encryptedIV = rsaKey.encrypt(iv.toString('hex'), 'base64');
    
    res.json({
      success: true,
      originalMessage: message,
      encryptedMessage: encryptedMessage,
      encryptedAESKey: encryptedAESKey,
      encryptedIV: encryptedIV,
      message: 'Message encrypted successfully using hybrid encryption (RSA + AES)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Demo hybrid decryption
app.post('/api/hybrid/decrypt', (req, res) => {
  try {
    const { encryptedMessage, encryptedAESKey, encryptedIV } = req.body;
    
    if (!encryptedMessage || !encryptedAESKey || !encryptedIV) {
      return res.status(400).json({
        success: false,
        error: 'Encrypted message, encrypted AES key, and encrypted IV are required'
      });
    }

    // Giải mã AES key và IV bằng RSA
    const aesKey = rsaKey.decrypt(encryptedAESKey, 'utf8');
    const iv = rsaKey.decrypt(encryptedIV, 'utf8');
    
    // Giải mã message bằng AES
    const aesKeyBuffer = Buffer.from(aesKey, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKeyBuffer, ivBuffer);
    let decryptedMessage = decipher.update(encryptedMessage, 'hex', 'utf8');
    decryptedMessage += decipher.final('utf8');
    
    res.json({
      success: true,
      encryptedMessage: encryptedMessage,
      decryptedMessage: decryptedMessage,
      message: 'Message decrypted successfully using hybrid decryption (RSA + AES)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== INFORMATION ENDPOINTS ====================

// Endpoint để lấy thông tin về các thuật toán
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    info: {
      rsa: {
        description: 'RSA là thuật toán mã hóa bất đối xứng (asymmetric)',
        keySize: '2048 bits',
        usage: 'Phù hợp cho mã hóa dữ liệu nhỏ, trao đổi khóa, chữ ký số',
        advantages: ['Bảo mật cao', 'Không cần chia sẻ khóa bí mật'],
        disadvantages: ['Chậm hơn AES', 'Kích thước dữ liệu mã hóa giới hạn']
      },
      aes: {
        description: 'AES là thuật toán mã hóa đối xứng (symmetric)',
        keySize: '256 bits',
        usage: 'Phù hợp cho mã hóa dữ liệu lớn',
        advantages: ['Nhanh', 'Hiệu quả với dữ liệu lớn'],
        disadvantages: ['Cần chia sẻ khóa bí mật an toàn']
      },
      hybrid: {
        description: 'Kết hợp RSA và AES để tận dụng ưu điểm của cả hai',
        process: [
          '1. Tạo khóa AES ngẫu nhiên',
          '2. Mã hóa dữ liệu bằng AES',
          '3. Mã hóa khóa AES bằng RSA',
          '4. Gửi cả dữ liệu mã hóa AES và khóa AES mã hóa RSA'
        ]
      }
    },
    endpoints: {
      rsa: [
        'GET /api/rsa/public-key',
        'POST /api/rsa/encrypt',
        'POST /api/rsa/decrypt'
      ],
      aes: [
        'GET /api/aes/generate-key',
        'POST /api/aes/encrypt',
        'POST /api/aes/decrypt'
      ],
      hybrid: [
        'POST /api/hybrid/encrypt',
        'POST /api/hybrid/decrypt'
      ]
    }
  });
});

// Home endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RSA & AES Encryption Demo API',
    version: '1.0.0',
    endpoints: {
      info: 'GET /api/info',
      rsa: {
        publicKey: 'GET /api/rsa/public-key',
        generateKeypair: 'GET /api/rsa/generate-keypair',
        encrypt: 'POST /api/rsa/encrypt',
        decrypt: 'POST /api/rsa/decrypt'
      },
      aes: {
        generateKey: 'GET /api/aes/generate-key',
        encrypt: 'POST /api/aes/encrypt',
        decrypt: 'POST /api/aes/decrypt'
      },
      hybrid: {
        encrypt: 'POST /api/hybrid/encrypt',
        decrypt: 'POST /api/hybrid/decrypt'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/info`);
  console.log(`🔑 RSA Key Size: 2048 bits`);
  console.log(`🔐 AES Key Size: 256 bits\n`);
});

module.exports = app;
