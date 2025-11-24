const express = require('express');
const router = express.Router();
const EcommerceUser = require('../../models/EcommerceUser');

// ===================================
// AUTHENTICATION ROUTES
// ===================================

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email, password, firstName, và lastName là bắt buộc'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
                message: 'Vui lòng nhập email hợp lệ'
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Mật khẩu phải có ít nhất 8 ký tự'
            });
        }

        const userData = {
            email: email.toLowerCase().trim(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone?.trim(),
            privacySettings: {
                email_marketing: req.body.emailMarketing || false,
                sms_marketing: req.body.smsMarketing || false
            }
        };

        const user = await EcommerceUser.registerUser(userData);

        // Remove sensitive data from response
        delete user.password_hash;

        res.status(201).json({
            success: true,
            data: user,
            message: 'Đăng ký thành công! Vui lòng xác thực email.'
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.message.includes('Email đã được sử dụng')) {
            return res.status(409).json({
                error: 'Email already exists',
                message: 'Email này đã được sử dụng'
            });
        }

        res.status(500).json({
            error: 'Registration failed',
            message: 'Đăng ký không thành công, vui lòng thử lại'
        });
    }
});

// POST /api/auth/login - User authentication
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Email và password là bắt buộc'
            });
        }

        // Session context for security tracking
        const sessionContext = {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            deviceInfo: {
                platform: req.get('sec-ch-ua-platform'),
                mobile: req.get('sec-ch-ua-mobile') === '?1'
            },
            rememberMe: rememberMe || false,
            deviceType: this.detectDeviceType(req.get('User-Agent'))
        };

        const authResult = await EcommerceUser.authenticateUser(
            email.toLowerCase().trim(),
            password,
            sessionContext
        );

        // Remove sensitive data
        delete authResult.user.password_hash;

        res.json({
            success: true,
            data: {
                user: authResult.user,
                session: authResult.session
            },
            message: 'Đăng nhập thành công'
        });

    } catch (error) {
        console.error('Login error:', error);

        // Handle specific error cases
        if (error.message.includes('Email không tồn tại')) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Email không tồn tại trong hệ thống'
            });
        }

        if (error.message.includes('Mật khẩu không đúng')) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Mật khẩu không chính xác'
            });
        }

        if (error.message.includes('Tài khoản đã bị khóa')) {
            return res.status(403).json({
                error: 'Account locked',
                message: 'Tài khoản đã bị khóa do quá nhiều lần đăng nhập sai'
            });
        }

        res.status(500).json({
            error: 'Authentication failed',
            message: 'Đăng nhập không thành công'
        });
    }
});

// POST /api/auth/logout - Session termination
router.post('/logout', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing session ID',
                message: 'Session ID là bắt buộc'
            });
        }

        await EcommerceUser.invalidateSession(sessionId);

        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: 'Đăng xuất không thành công'
        });
    }
});

// POST /api/auth/forgot-password - Password reset request
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Missing email',
                message: 'Email là bắt buộc'
            });
        }

        const resetInfo = await EcommerceUser.createPasswordResetToken(email.toLowerCase().trim());

        res.json({
            success: true,
            data: {
                expiresAt: resetInfo.expiresAt
            },
            message: 'Link đặt lại mật khẩu đã được gửi đến email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);

        if (error.message.includes('Email không tồn tại')) {
            // Don't reveal that email doesn't exist for security
            return res.json({
                success: true,
                message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi'
            });
        }

        res.status(500).json({
            error: 'Password reset failed',
            message: 'Không thể gửi email đặt lại mật khẩu'
        });
    }
});

// GET /api/auth/session/:sessionId - Validate session
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await EcommerceUser.getValidSession(sessionId);

        if (!session) {
            return res.status(404).json({
                error: 'Invalid session',
                message: 'Session không tồn tại hoặc đã hết hạn'
            });
        }

        res.json({
            success: true,
            data: {
                valid: true,
                userId: session.user_id,
                userEmail: session.user_email,
                userName: session.user_name,
                lastActivity: session.last_activity,
                sessionId: session.session_id
            }
        });

    } catch (error) {
        console.error('Session validation error:', error);
        res.status(500).json({
            error: 'Session validation failed',
            message: 'Không thể xác thực session'
        });
    }
});

// ===================================
// MIDDLEWARE HELPERS
// ===================================

// Detect device type from user agent
router.detectDeviceType = function(userAgent) {
    if (!userAgent) return 'unknown';

    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
};

// Session authentication middleware
router.authenticateSession = async function(req, res, next) {
    try {
        const sessionId = req.headers['x-session-id'] || req.headers['authorization']?.replace('Bearer ', '');

        if (!sessionId) {
            return res.status(401).json({
                error: 'No session provided',
                message: 'Session ID required in X-Session-ID header'
            });
        }

        const session = await EcommerceUser.getValidSession(sessionId);

        if (!session) {
            return res.status(401).json({
                error: 'Invalid session',
                message: 'Session không hợp lệ hoặc đã hết hạn'
            });
        }

        // Add session info to request object
        req.session = session;
        req.user = {
            userId: session.user_id,
            email: session.user_email,
            name: session.user_name,
            role: session.user_role
        };

        next();

    } catch (error) {
        console.error('Session authentication error:', error);
        res.status(500).json({
            error: 'Authentication error',
            message: 'Lỗi xác thực session'
        });
    }
};

module.exports = router;
