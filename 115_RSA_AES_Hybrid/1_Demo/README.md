# RSA & AES Encryption Demo API

Ứng dụng Node.js demo về cơ chế mã hóa RSA và AES thông qua REST API.

## 🔐 Giới thiệu

Ứng dụng này minh họa cách sử dụng hai thuật toán mã hóa phổ biến:

- **RSA (Rivest-Shamir-Adleman)**: Thuật toán mã hóa bất đối xứng (asymmetric)
- **AES (Advanced Encryption Standard)**: Thuật toán mã hóa đối xứng (symmetric)
- **Hybrid Encryption**: Kết hợp RSA và AES để tận dụng ưu điểm của cả hai

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js (version 14 hoặc cao hơn)
- npm hoặc yarn

### Cài đặt dependencies
```bash
npm install
```

### Chạy ứng dụng
```bash
# Chế độ production
npm start

# Chế độ development (với nodemon)
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## 📚 API Documentation

### 🏠 Home Endpoint
```
GET /
```
Trả về thông tin tổng quan về API.

### ℹ️ Information Endpoint
```
GET /api/info
```
Trả về thông tin chi tiết về các thuật toán mã hóa và danh sách endpoints.

## 🔑 RSA Endpoints

### 💡 RSA Hoạt động như thế nào?

Ứng dụng hỗ trợ **2 modes** để demo RSA:

1. **Demo Mode** (Backward compatibility):
   - Không cần truyền public/private key
   - Sử dụng keypair có sẵn trên server
   - Phù hợp để test nhanh API

2. **Realistic Mode** (Recommended):
   - Yêu cầu truyền public key khi mã hóa
   - Yêu cầu truyền private key khi giải mã
   - Phản ánh đúng cách RSA hoạt động thực tế

⚠️ **Trong thực tế**: 
- Người gửi cần có **public key** của người nhận để mã hóa
- Chỉ người có **private key** mới có thể giải mã
- Private key phải được giữ bí mật tuyệt đối

### Lấy Public Key của Server
```
GET /api/rsa/public-key
```

**Response:**
```json
{
  "success": true,
  "publicKey": "-----BEGIN RSA PUBLIC KEY-----...",
  "message": "Server public key retrieved successfully"
}
```

### Tạo Cặp Khóa RSA Mới
```
GET /api/rsa/generate-keypair
```

**Response:**
```json
{
  "success": true,
  "publicKey": "-----BEGIN RSA PUBLIC KEY-----...",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----...",
  "keySize": "2048 bits",
  "message": "New RSA keypair generated successfully",
  "note": "Keep your private key secure! Never share it with anyone."
}
```

### Mã hóa RSA
```
POST /api/rsa/encrypt
```

**Request Body (với public key riêng):**
```json
{
  "message": "Hello World!",
  "publicKey": "-----BEGIN RSA PUBLIC KEY-----..."
}
```

**Request Body (dùng server key - demo mode):**
```json
{
  "message": "Hello World!"
}
```

**Response:**
```json
{
  "success": true,
  "originalMessage": "Hello World!",
  "encryptedMessage": "base64_encrypted_string...",
  "usedPublicKey": "client-provided",
  "message": "Message encrypted successfully with provided public key"
}
```

### Giải mã RSA
```
POST /api/rsa/decrypt
```

**Request Body (với private key riêng):**
```json
{
  "encryptedMessage": "base64_encrypted_string...",
  "privateKey": "-----BEGIN RSA PRIVATE KEY-----..."
}
```

**Request Body (dùng server key - demo mode):**
```json
{
  "encryptedMessage": "base64_encrypted_string..."
}
```

**Response:**
```json
{
  "success": true,
  "encryptedMessage": "base64_encrypted_string...",
  "decryptedMessage": "Hello World!",
  "usedPrivateKey": "client-provided",
  "message": "Message decrypted successfully with provided private key"
}
```

## 🔐 AES Endpoints

### Tạo AES Key
```
GET /api/aes/generate-key
```

**Response:**
```json
{
  "success": true,
  "aesKey": "hex_key_string...",
  "iv": "hex_iv_string...",
  "message": "AES key and IV generated successfully"
}
```

### Mã hóa AES
```
POST /api/aes/encrypt
```

**Request Body:**
```json
{
  "message": "Hello World!",
  "aesKey": "hex_key_string...",
  "iv": "hex_iv_string..."
}
```

**Response:**
```json
{
  "success": true,
  "originalMessage": "Hello World!",
  "encryptedMessage": "hex_encrypted_string...",
  "aesKey": "hex_key_string...",
  "iv": "hex_iv_string...",
  "message": "Message encrypted successfully with AES"
}
```

### Giải mã AES
```
POST /api/aes/decrypt
```

**Request Body:**
```json
{
  "encryptedMessage": "hex_encrypted_string...",
  "aesKey": "hex_key_string...",
  "iv": "hex_iv_string..."
}
```

**Response:**
```json
{
  "success": true,
  "encryptedMessage": "hex_encrypted_string...",
  "decryptedMessage": "Hello World!",
  "message": "Message decrypted successfully with AES"
}
```

## 🔄 Hybrid Encryption Endpoints

### Mã hóa Hybrid (RSA + AES)
```
POST /api/hybrid/encrypt
```

**Request Body:**
```json
{
  "message": "Hello World! This is a long message..."
}
```

**Response:**
```json
{
  "success": true,
  "originalMessage": "Hello World! This is a long message...",
  "encryptedMessage": "hex_encrypted_data...",
  "encryptedAESKey": "base64_encrypted_aes_key...",
  "encryptedIV": "base64_encrypted_iv...",
  "message": "Message encrypted successfully using hybrid encryption (RSA + AES)"
}
```

### Giải mã Hybrid
```
POST /api/hybrid/decrypt
```

**Request Body:**
```json
{
  "encryptedMessage": "hex_encrypted_data...",
  "encryptedAESKey": "base64_encrypted_aes_key...",
  "encryptedIV": "base64_encrypted_iv..."
}
```

**Response:**
```json
{
  "success": true,
  "encryptedMessage": "hex_encrypted_data...",
  "decryptedMessage": "Hello World! This is a long message...",
  "message": "Message decrypted successfully using hybrid decryption (RSA + AES)"
}
```

## 🧪 Ví dụ sử dụng với curl

### 1. Lấy thông tin API
```bash
curl -X GET http://localhost:3000/api/info
```

### 2. Test RSA Encryption

#### 2a. Demo mode (dùng server key)
```bash
# Mã hóa
curl -X POST http://localhost:3000/api/rsa/encrypt \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello RSA!"}'

# Giải mã (sử dụng encryptedMessage từ response trên)
curl -X POST http://localhost:3000/api/rsa/decrypt \
  -H "Content-Type: application/json" \
  -d '{"encryptedMessage": "your_encrypted_message_here"}'
```

#### 2b. Realistic mode (dùng keypair riêng)
```bash
# Tạo keypair mới
curl -X GET http://localhost:3000/api/rsa/generate-keypair

# Mã hóa với public key riêng
curl -X POST http://localhost:3000/api/rsa/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello RSA!",
    "publicKey": "-----BEGIN RSA PUBLIC KEY-----..."
  }'

# Giải mã với private key riêng
curl -X POST http://localhost:3000/api/rsa/decrypt \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedMessage": "your_encrypted_message_here",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----..."
  }'
```

### 3. Test AES Encryption
```bash
# Tạo AES key
curl -X GET http://localhost:3000/api/aes/generate-key

# Mã hóa
curl -X POST http://localhost:3000/api/aes/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello AES!",
    "aesKey": "your_aes_key_here",
    "iv": "your_iv_here"
  }'

# Giải mã
curl -X POST http://localhost:3000/api/aes/decrypt \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedMessage": "your_encrypted_message_here",
    "aesKey": "your_aes_key_here",
    "iv": "your_iv_here"
  }'
```

### 4. Test Hybrid Encryption
```bash
# Mã hóa hybrid
curl -X POST http://localhost:3000/api/hybrid/encrypt \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Hybrid Encryption! This is a very long message that demonstrates the power of combining RSA and AES."}'

# Giải mã hybrid
curl -X POST http://localhost:3000/api/hybrid/decrypt \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedMessage": "your_encrypted_message_here",
    "encryptedAESKey": "your_encrypted_aes_key_here",
    "encryptedIV": "your_encrypted_iv_here"
  }'
```

## 🔍 So sánh RSA vs AES vs Hybrid

| Thuật toán | Loại | Tốc độ | Kích thước key | Phù hợp cho |
|------------|------|---------|----------------|-------------|
| RSA | Bất đối xứng | Chậm | 2048 bits | Dữ liệu nhỏ, trao đổi khóa |
| AES | Đối xứng | Nhanh | 256 bits | Dữ liệu lớn |
| Hybrid | Kết hợp | Tối ưu | RSA 2048 + AES 256 | Mọi loại dữ liệu |

## 🛡️ Bảo mật

⚠️ **Lưu ý quan trọng**: Đây là ứng dụng demo cho mục đích học tập. Trong môi trường production:

- Không bao giờ expose private key
- Sử dụng HTTPS
- Implement proper key management
- Add authentication và authorization
- Validate input data kỹ lưỡng
- Use secure random number generators
- Implement proper error handling

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
