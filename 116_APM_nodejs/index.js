// ⚠️ QUAN TRỌNG: APM phải được import đầu tiên
const { apm, captureError, addLabels, setUserContext, setCustomContext, createCustomSpan } = require('./apm');

// Sau đó mới import các modules khác
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const axios = require('axios');

// Import services
const DatabaseService = require('./services/DatabaseService');
const RedisService = require('./services/RedisService');
const UserService = require('./services/UserService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom morgan format với APM trace ID
morgan.token('trace-id', (req) => {
  return apm.currentTraceIds['trace.id'] || 'no-trace';
});

app.use(morgan(':method :url :status :res[content-length] - :response-time ms [trace: :trace-id]'));

// Initialize services
const dbService = new DatabaseService();
const redisService = new RedisService();
const userService = new UserService(dbService, redisService);

// Middleware để add APM context
app.use((req, res, next) => {
  // Add user context nếu có
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    if (token) {
      // Giả lập decode JWT (trong thực tế dùng jwt.verify)
      setUserContext({
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser'
      });
    }
  }

  // Add custom context
  setCustomContext({
    request_id: req.headers['x-request-id'] || `req-${Date.now()}`,
    user_agent: req.headers['user-agent'],
    ip_address: req.ip,
    method: req.method,
    path: req.path
  });

  // Add labels
  addLabels({
    endpoint: req.path,
    method: req.method,
    version: 'v1'
  });

  next();
});

// Health Check (ignored by APM)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 🔥 API EXAMPLES VỚI APM TRACING

// 1. Simple API
app.get('/api/ping', (req, res) => {
  res.json({ 
    message: 'pong', 
    timestamp: Date.now(),
    trace_id: apm.currentTraceIds['trace.id']
  });
});

// 2. API với Database operation
app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    captureError(error, {
      custom: {
        endpoint: '/api/users',
        method: 'GET'
      }
    });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 3. API với Cache (Redis)
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  try {
    // Custom span để trace cache lookup
    const cacheSpan = createCustomSpan('cache_lookup', 'cache');
    let user = await redisService.get(`user:${userId}`);
    cacheSpan.end();

    if (!user) {
      // Custom span để trace database query
      const dbSpan = createCustomSpan('user_fetch_from_db', 'database');
      user = await userService.getUserById(userId);
      dbSpan.end();

      if (user) {
        // Cache user data
        await redisService.set(`user:${userId}`, user, 300); // 5 minutes
      }
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user,
      cached: !!user.fromCache
    });
  } catch (error) {
    captureError(error, {
      custom: {
        userId,
        endpoint: '/api/users/:id'
      }
    });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. API với External HTTP call
app.get('/api/external-data', async (req, res) => {
  try {
    // External API call (tự động được trace bởi APM)
    const response = await axios.get(`${process.env.EXTERNAL_API_URL}/posts`, {
      timeout: 5000
    });

    // Simulate processing
    const processSpan = createCustomSpan('process_external_data', 'custom');
    await new Promise(resolve => setTimeout(resolve, 100)); // simulate work
    const processedData = response.data.slice(0, 10); // take first 10
    processSpan.end();

    res.json({
      success: true,
      data: processedData,
      total: response.data.length,
      processed: processedData.length
    });
  } catch (error) {
    captureError(error, {
      custom: {
        external_api: process.env.EXTERNAL_API_URL,
        timeout: 5000
      }
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch external data' 
    });
  }
});

// 5. API with heavy computation (để test performance)
app.post('/api/heavy-task', async (req, res) => {
  const { iterations = 1000000 } = req.body;
  
  try {
    const computationSpan = createCustomSpan('heavy_computation', 'custom');
    
    // Simulate heavy CPU task
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i);
    }
    
    computationSpan.end();

    res.json({
      success: true,
      result: Math.round(result),
      iterations,
      message: 'Heavy computation completed'
    });
  } catch (error) {
    captureError(error, {
      custom: {
        iterations,
        task_type: 'heavy_computation'
      }
    });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 6. API với multiple async operations
app.get('/api/dashboard', async (req, res) => {
  try {
    // Parallel operations với custom spans
    const [users, stats, externalData] = await Promise.all([
      (async () => {
        const span = createCustomSpan('fetch_users', 'database');
        const result = await userService.getAllUsers();
        span.end();
        return result;
      })(),
      
      (async () => {
        const span = createCustomSpan('calculate_stats', 'custom');
        // Simulate stats calculation
        await new Promise(resolve => setTimeout(resolve, 50));
        const result = {
          total_requests: Math.floor(Math.random() * 1000),
          active_users: Math.floor(Math.random() * 100),
          error_rate: (Math.random() * 5).toFixed(2)
        };
        span.end();
        return result;
      })(),
      
      (async () => {
        const span = createCustomSpan('fetch_external_summary', 'http');
        try {
          const response = await axios.get(`${process.env.EXTERNAL_API_URL}/posts?_limit=5`);
          span.end();
          return response.data;
        } catch (error) {
          span.end();
          return [];
        }
      })()
    ]);

    res.json({
      success: true,
      data: {
        users: users.slice(0, 5), // First 5 users
        stats,
        recent_posts: externalData
      }
    });
  } catch (error) {
    captureError(error, {
      custom: {
        endpoint: '/api/dashboard',
        parallel_operations: ['users', 'stats', 'external_data']
      }
    });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 7. API that intentionally throws error (để test error tracking)
app.get('/api/error-test', (req, res) => {
  const errorType = req.query.type || 'generic';
  
  switch (errorType) {
    case 'timeout':
      setTimeout(() => {
        throw new Error('Async timeout error');
      }, 100);
      break;
      
    case 'validation':
      const validationError = new Error('Validation failed: email is required');
      validationError.statusCode = 400;
      throw validationError;
      
    case 'database':
      const dbError = new Error('Database connection failed');
      dbError.code = 'CONN_FAILED';
      throw dbError;
      
    default:
      throw new Error('Generic test error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  // APM tự động capture lỗi, nhưng ta có thể add thêm context
  captureError(err, {
    custom: {
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers
    }
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message,
    trace_id: apm.currentTraceIds['trace.id']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  dbService.close();
  redisService.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  dbService.close();
  redisService.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Kibana APM: http://localhost:5601/app/apm`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Test APIs:`);
  console.log(`  • GET  /api/ping`);
  console.log(`  • GET  /api/users`);
  console.log(`  • GET  /api/users/1`);
  console.log(`  • GET  /api/external-data`);
  console.log(`  • POST /api/heavy-task`);
  console.log(`  • GET  /api/dashboard`);
  console.log(`  • GET  /api/error-test?type=validation`);
});
