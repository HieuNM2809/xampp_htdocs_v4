const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours  
}));

// Khởi tạo database SQLite
const db = new sqlite3.Database('users.db');

// Tạo bảng users
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        totp_secret TEXT,
        is_2fa_enabled INTEGER DEFAULT 0,
        backup_codes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Helper function: Generate backup codes
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}

// Helper function: Hash backup codes
function hashBackupCodes(codes) {
    return codes.map(code => bcrypt.hashSync(code, 10));
}

// Routes

// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
               [username, email, hashedPassword],
               function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username hoặc email đã tồn tại' });
                }
                return res.status(500).json({ error: 'Lỗi server' });
            }
            res.json({ success: true, message: 'Đăng ký thành công' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Đăng nhập
app.post('/api/login', (req, res) => {
    const { username, password, totpCode } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập username và password' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi server' });
        }

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Username hoặc password không đúng' });
        }

        // Kiểm tra 2FA nếu đã được kích hoạt
        if (user.is_2fa_enabled) {
            if (!totpCode) {
                return res.status(200).json({
                    requires2FA: true,
                    message: 'Vui lòng nhập mã 2FA'
                });
            }

            // Verify TOTP code
            const verified = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: 'base32',
                token: totpCode,
                window: 2
            });

            if (!verified) {
                // Kiểm tra backup codes
                if (user.backup_codes) {
                    const backupCodes = JSON.parse(user.backup_codes);
                    let validBackupCode = false;
                    let remainingCodes = [];

                    for (let hashedCode of backupCodes) {
                        if (await bcrypt.compare(totpCode, hashedCode)) {
                            validBackupCode = true;
                            // Không thêm backup code đã sử dụng vào danh sách còn lại
                        } else {
                            remainingCodes.push(hashedCode);
                        }
                    }

                    if (validBackupCode) {
                        // Cập nhật backup codes (loại bỏ code đã sử dụng)
                        db.run('UPDATE users SET backup_codes = ? WHERE id = ?',
                               [JSON.stringify(remainingCodes), user.id]);
                    } else {
                        return res.status(401).json({ error: 'Mã 2FA không đúng' });
                    }
                } else {
                    return res.status(401).json({ error: 'Mã 2FA không đúng' });
                }
            }
        }

        // Đăng nhập thành công
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is2FAEnabled: user.is_2fa_enabled
            }
        });
    });
});

// Đăng xuất
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Không thể đăng xuất' });
        }
        res.json({ success: true, message: 'Đã đăng xuất' });
    });
});

// Middleware kiểm tra đăng nhập
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }
    next();
};

// Lấy thông tin user hiện tại
app.get('/api/me', requireAuth, (req, res) => {
    db.get('SELECT id, username, email, is_2fa_enabled FROM users WHERE id = ?',
           [req.session.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi server' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User không tồn tại' });
        }
        res.json({ user });
    });
});

// Setup 2FA - Tạo secret và QR code
app.post('/api/setup-2fa', requireAuth, (req, res) => {
    const secret = speakeasy.generateSecret({
        name: `2FA Demo (${req.session.username})`,
        issuer: '2FA Demo App'
    });

    // Lưu tạm secret vào session (chưa lưu vào DB)
    req.session.tempTOTPSecret = secret.base32;

    // Tạo QR code
    QRCode.toDataURL(secret.otpauth_url, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Không thể tạo QR code' });
        }

        res.json({
            secret: secret.base32,
            qrCode: data,
            manualEntryKey: secret.base32
        });
    });
});

// Xác nhận và kích hoạt 2FA
app.post('/api/enable-2fa', requireAuth, (req, res) => {
    const { totpCode } = req.body;

    if (!req.session.tempTOTPSecret) {
        return res.status(400).json({ error: 'Vui lòng setup 2FA trước' });
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
        secret: req.session.tempTOTPSecret,
        encoding: 'base32',
        token: totpCode,
        window: 2
    });

    if (!verified) {
        return res.status(400).json({ error: 'Mã TOTP không đúng' });
    }

    // Tạo backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = hashBackupCodes(backupCodes);

    // Lưu vào database
    db.run('UPDATE users SET totp_secret = ?, is_2fa_enabled = 1, backup_codes = ? WHERE id = ?',
           [req.session.tempTOTPSecret, JSON.stringify(hashedBackupCodes), req.session.userId],
           (err) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi khi lưu 2FA' });
        }

        // Xóa temp secret
        delete req.session.tempTOTPSecret;

        res.json({
            success: true,
            message: '2FA đã được kích hoạt',
            backupCodes: backupCodes
        });
    });
});

// Tắt 2FA
app.post('/api/disable-2fa', requireAuth, (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Vui lòng nhập password để xác nhận' });
    }

    db.get('SELECT password FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi server' });
        }

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Password không đúng' });
        }

        // Tắt 2FA
        db.run('UPDATE users SET totp_secret = NULL, is_2fa_enabled = 0, backup_codes = NULL WHERE id = ?',
               [req.session.userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Lỗi khi tắt 2FA' });
            }

            res.json({ success: true, message: '2FA đã được tắt' });
        });
    });
});

// Tạo backup codes mới
app.post('/api/regenerate-backup-codes', requireAuth, (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Vui lòng nhập password để xác nhận' });
    }

    db.get('SELECT password, is_2fa_enabled FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi server' });
        }

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Password không đúng' });
        }

        if (!user.is_2fa_enabled) {
            return res.status(400).json({ error: '2FA chưa được kích hoạt' });
        }

        // Tạo backup codes mới
        const backupCodes = generateBackupCodes();
        const hashedBackupCodes = hashBackupCodes(backupCodes);

        db.run('UPDATE users SET backup_codes = ? WHERE id = ?',
               [JSON.stringify(hashedBackupCodes), req.session.userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Lỗi khi tạo backup codes mới' });
            }

            res.json({
                success: true,
                message: 'Backup codes mới đã được tạo',
                backupCodes: backupCodes
            });
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Có lỗi xảy ra!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log('📱 Hỗ trợ 2FA với TOTP (Google Authenticator, Authy, etc.)');
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});
