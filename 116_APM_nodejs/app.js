// Khởi tạo APM agent TRƯỚC khi import các module khác
let apm = null;
const apmEnabled = process.env.ELASTIC_APM_ACTIVE !== 'false' && process.env.NODE_ENV !== 'test';

if (apmEnabled) {
  try {
    apm = require('elastic-apm-node').start({
      // Cấu hình APM
      serviceName: 'nodejs-apm-example',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // URL của APM Server
      serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200',
      
      // Secret token để bảo mật (tuỳ chọn)
      secretToken: process.env.ELASTIC_APM_SECRET_TOKEN || '',
      
      // Tắt logging hoàn toàn để tránh spam
      logLevel: 'off',
      
      // Cấu hình timeout và retry
      serverTimeout: '5s',
      apiRequestTime: '5s',
      apiRequestSize: '768kb',
      
      // Tắt verify cert cho development
      verifyServerCert: false,
      
      // Cấu hình để giảm load khi server không available
      centralConfig: false,  // Tắt central config polling
      captureExceptions: true,
      captureSpanStackTraces: false,  // Giảm overhead
      
      // Sampling để giảm data
      transactionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Disable một số features không cần thiết để giảm requests
      disableInstrumentations: process.env.NODE_ENV === 'development' ? [] : ['fs']
    });
    
    console.log('✅ APM agent khởi tạo thành công (silent mode)');
    
  } catch (error) {
    console.warn('⚠️  Không thể khởi tạo APM agent:', error.message);
    apm = null;
  }
}

// Tạo mock APM object nếu APM không available hoặc disabled
if (!apm) {
  console.log('ℹ️  APM monitoring đã tắt - chạy ở chế độ standalone');
  apm = {
    startSpan: () => ({ 
      end: () => {}, 
      setLabel: () => {},
      addLabels: () => {} 
    }),
    captureError: () => {},
    setLabel: () => {},
    addLabels: () => {},
    setUserContext: () => {},
    setCustomContext: () => {},
    setTransactionName: () => {},
    flush: (callback) => callback && callback(),
    conf: { serverUrl: 'disabled' }
  };
}

// Import các dependencies sau khi khởi tạo APM
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes cơ bản
app.get('/', (req, res) => {
  res.json({
    message: 'APM Node.js Example API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Route đơn giản
app.get('/api/users', async (req, res) => {
  // Tạo custom span để tracking
  const span = apm.startSpan('fetch-users');
  
  try {
    // Giả lập việc gọi database
    await simulateDBQuery('SELECT * FROM users', 100);
    
    const users = [
      { id: 1, name: 'Nguyen Van A', email: 'a@example.com' },
      { id: 2, name: 'Tran Thi B', email: 'b@example.com' },
      { id: 3, name: 'Le Van C', email: 'c@example.com' }
    ];
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    // APM tự động track lỗi
    apm.captureError(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (span) span.end();
  }
});

// Route có thể gây lỗi để test error tracking
app.get('/api/error', (req, res) => {
  const shouldError = Math.random() > 0.5;
  
  if (shouldError) {
    const error = new Error('Lỗi ngẫu nhiên để test APM error tracking');
    apm.captureError(error);
    throw error;
  }
  
  res.json({
    message: 'Không có lỗi lần này!',
    timestamp: new Date().toISOString()
  });
});

// Route chậm để test performance monitoring
app.get('/api/slow', async (req, res) => {
  const span = apm.startSpan('slow-operation');
  
  try {
    // Giả lập operation chậm
    const delay = parseInt(req.query.delay) || 2000;
    await simulateSlowOperation(delay);
    
    res.json({
      message: `Operation hoàn thành sau ${delay}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apm.captureError(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (span) span.end();
  }
});

// Route với custom metrics
app.get('/api/metrics', (req, res) => {
  // Tạo custom metric
  apm.setLabel('custom_metric', Math.floor(Math.random() * 100));
  apm.setLabel('user_type', 'premium');
  
  res.json({
    message: 'Custom metrics đã được gửi đến APM',
    randomValue: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const apmStatus = apm && apm.conf && apm.conf.serverUrl !== 'disabled' ? 'enabled' : 'disabled';
  
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.version,
    apm: {
      status: apmStatus,
      serverUrl: apm && apm.conf ? apm.conf.serverUrl : 'N/A'
    }
  });
});

// APM status endpoint
app.get('/apm-status', (req, res) => {
  const isEnabled = apm && apm.conf && apm.conf.serverUrl !== 'disabled';
  
  res.json({
    enabled: isEnabled,
    serverUrl: isEnabled ? apm.conf.serverUrl : 'disabled',
    serviceName: isEnabled ? 'nodejs-apm-example' : 'N/A',
    environment: process.env.NODE_ENV || 'development',
    message: isEnabled ? 'APM monitoring is active' : 'APM monitoring is disabled'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  // APM sẽ tự động capture lỗi
  apm.captureError(err);
  
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Helper functions
async function simulateDBQuery(query, delay = 50) {
  const span = apm.startSpan('db-query');
  span.setLabel('query', query);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (span) span.end();
      resolve();
    }, delay);
  });
}

async function simulateSlowOperation(delay) {
  const span = apm.startSpan('slow-operation');
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (span) span.end();
      resolve();
    }, delay);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  apm.flush(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Shutting down gracefully...');
  apm.flush(() => {
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  
  // APM status
  const isApmEnabled = apm && apm.conf && apm.conf.serverUrl !== 'disabled';
  if (isApmEnabled) {
    console.log(`📊 APM monitoring: ENABLED (silent mode)`);
    console.log(`🔗 APM Server: ${apm.conf.serverUrl}`);
  } else {
    console.log(`📊 APM monitoring: DISABLED`);
  }
  
  console.log(`\n🔍 Available endpoints:`);
  console.log(`   GET  /health      - Health check + APM status`);
  console.log(`   GET  /apm-status  - Detailed APM information`);
  console.log(`   GET  /api/users   - Demo endpoint with monitoring`);
  console.log(`\n💡 Tip: Set ELASTIC_APM_ACTIVE=false to disable APM completely`);
});

module.exports = app;
