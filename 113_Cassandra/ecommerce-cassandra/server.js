const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const database = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.ECOMMERCE_PORT || 3001;

// ===================================
// MIDDLEWARE SETUP
// ===================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Max 10 auth attempts per 15 minutes per IP
    message: {
        error: 'Too many authentication attempts',
        message: 'Please wait before trying to authenticate again.'
    }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';

        console.log(
            `[${new Date().toISOString()}] ${logLevel} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
        );

        // Log slow requests
        if (duration > 1000) {
            console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
        }
    });

    next();
});

// ===================================
// ROUTES
// ===================================

// Import route handlers
const authRoutes = require('./api/routes/auth');
const productRoutes = require('./api/routes/products');
const cartRoutes = require('./api/routes/cart');
const orderRoutes = require('./api/routes/orders');
const userRoutes = require('./api/routes/users');
const adminRoutes = require('./api/routes/admin');
const analyticsRoutes = require('./api/routes/analytics');

// Apply routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// ===================================
// HEALTH & INFO ENDPOINTS
// ===================================

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await database.healthCheck();
        const systemHealth = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.API_VERSION || '1.0.0',
            database: dbHealth,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        };

        const httpStatus = dbHealth.healthy ? 200 : 503;
        res.status(httpStatus).json(systemHealth);

    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API info endpoint
app.get('/', (req, res) => {
    res.json({
        name: '🛒 E-commerce API powered by Cassandra',
        version: '1.0.0',
        description: 'Production-ready e-commerce platform với advanced Cassandra patterns',

        endpoints: {
            authentication: '/api/auth',
            products: '/api/products',
            cart: '/api/cart',
            orders: '/api/orders',
            users: '/api/users',
            admin: '/api/admin',
            analytics: '/api/analytics',
            health: '/health'
        },

        features: [
            'User authentication và session management',
            'Product catalog với search',
            'Shopping cart với TTL expiration',
            'Order management với status tracking',
            'Real-time inventory management',
            'Advanced analytics và reporting',
            'Multi-datacenter ready',
            'Production performance optimized'
        ],

        documentation: {
            overview: 'ecommerce-cassandra/README.md',
            schema: 'ecommerce-cassandra/schemas/',
            api_docs: '/api/docs' // Future: API documentation
        },

        technologies: {
            database: 'Apache Cassandra',
            backend: 'Node.js + Express',
            patterns: [
                'Denormalization for read performance',
                'Time-series data modeling',
                'TTL for automatic cleanup',
                'Counter columns for real-time stats',
                'Batch operations for consistency'
            ]
        }
    });
});

// API documentation placeholder
app.get('/api/docs', (req, res) => {
    res.json({
        message: 'API Documentation',
        note: 'Comprehensive API docs will be available here',
        quick_examples: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login'
            },
            products: {
                search: 'GET /api/products/search?q=laptop',
                details: 'GET /api/products/:id',
                category: 'GET /api/products/category/:categoryId'
            },
            cart: {
                add: 'POST /api/cart/add',
                view: 'GET /api/cart/:cartId',
                checkout: 'POST /api/cart/checkout'
            },
            orders: {
                create: 'POST /api/orders',
                track: 'GET /api/orders/:orderId/track',
                history: 'GET /api/orders/user/:userId'
            }
        }
    });
});

// ===================================
// ERROR HANDLING
// ===================================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
        available_endpoints: [
            'GET /',
            'GET /health',
            'GET /api/docs',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/products/search',
            'GET /api/cart/:cartId',
            'POST /api/orders'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

process.on('SIGINT', async () => {
    console.log('\n🔄 Graceful shutdown initiated...');

    try {
        console.log('🔐 Closing database connections...');
        await database.disconnect();

        console.log('🛑 HTTP server closing...');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 SIGTERM received, shutting down gracefully...');
    await database.disconnect();
    process.exit(0);
});

// ===================================
// SERVER STARTUP
// ===================================

async function startServer() {
    try {
        console.log('🚀 Starting E-commerce API server...');

        // Connect to database first
        console.log('🔌 Connecting to Cassandra...');
        await database.connect();

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log('\n🎉 E-commerce API Server Started!');
            console.log(`📍 Server URL: http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
            console.log(`📖 API documentation: http://localhost:${PORT}/api/docs`);
            console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Database: Cassandra cluster`);
            console.log('\n🛒 E-commerce endpoints available:');
            console.log('   🔐 Authentication: /api/auth');
            console.log('   📦 Products: /api/products');
            console.log('   🛍️  Shopping Cart: /api/cart');
            console.log('   📋 Orders: /api/orders');
            console.log('   👤 Users: /api/users');
            console.log('   ⚙️  Admin: /api/admin');
            console.log('   📊 Analytics: /api/analytics');
            console.log('\n✨ Ready for e-commerce operations!\n');
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                console.error('💡 Try: lsof -ti:3001 | xargs kill');
                process.exit(1);
            } else {
                console.error('❌ Server error:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Check Cassandra is running: docker ps | grep cassandra');
        console.error('   2. Verify database setup: npm run setup-ecommerce');
        console.error('   3. Check .env configuration');
        process.exit(1);
    }
}

// Only start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
