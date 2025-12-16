// ⚠️ File này PHẢI được import đầu tiên, trước tất cả modules khác
require('dotenv').config();

const apm = require('elastic-apm-node').start({
  // Service name - hiển thị trong Kibana
  serviceName: process.env.ELASTIC_APM_SERVICE_NAME || 'nodejs-app',
  
  // APM Server URL
  serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200',
  
  // Environment (development, staging, production)
  environment: process.env.ELASTIC_APM_ENVIRONMENT || 'development',
  
  // Sample rate: 1.0 = 100%, 0.1 = 10%
  transactionSampleRate: parseFloat(process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE) || 1.0,
  
  // Enable/disable APM
  active: process.env.ELASTIC_APM_ACTIVE === 'true',
  
  // Ignore health check endpoints
  ignoreUrls: ['/health', '/ping', '/status', '/metrics'],
  
  // Ignore static assets
  ignoreUserAgents: [
    /curl/,
    /wget/,
    /spider/,
    /bot/,
    /crawl/,
    /slurp/,
    /sogouspider/,
    /bingbot/,
    /facebookexternalhit/,
    /twitterbot/,
    /rogerbot/,
    /linkedinbot/,
    /embedly/,
    /bufferbot/,
    /quora/,
    /showyoubot/,
    /outbrain/,
    /pinterest/,
    /slackbot/,
    /vkShare/,
    /W3C_Validator/,
    /redditbot/,
    /applebot/,
    /whatsapp/,
    /flipboard/,
    /tumblr/,
    /bitlybot/,
    /skypeuripreview/,
    /nuzzel/,
    /discordbot/,
    /qwantify/,
    /pinterestbot/,
    /bitrix/
  ],
  
  // Log level
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  
  // Capture body untuk debugging (chỉ development)
  captureBody: process.env.NODE_ENV === 'development' ? 'all' : 'errors',
  
  // Error filters
  errorOnAbortedRequests: false,
  
  // Transaction filters  
  filterHttpHeaders: true,
  
  // Span configuration
  spanFramesMinDuration: '5ms',
  
  // Custom configuration
  captureExceptions: true,
  captureErrorLogStackTraces: true,
  
  // Labels để group services
  globalLabels: {
    version: process.env.npm_package_version || '1.0.0',
    region: process.env.AWS_REGION || 'local',
    instance: process.env.HOSTNAME || 'localhost'
  }
});

// Custom error handler
apm.handleUncaughtExceptions((err) => {
  console.error('Uncaught Exception captured by APM:', err);
  process.exit(1);
});

// Helper functions
const createCustomTransaction = (name, type = 'custom') => {
  return apm.startTransaction(name, type);
};

const createCustomSpan = (name, type = 'custom') => {
  return apm.startSpan(name, type);
};

const captureError = (error, options = {}) => {
  return apm.captureError(error, options);
};

const addLabels = (labels) => {
  return apm.addLabels(labels);
};

const setUserContext = (user) => {
  return apm.setUserContext(user);
};

const setCustomContext = (context) => {
  return apm.setCustomContext(context);
};

// Export APM instance và helper functions
module.exports = {
  apm,
  createCustomTransaction,
  createCustomSpan,
  captureError,
  addLabels,
  setUserContext,
  setCustomContext
};

console.log(`🚀 Elastic APM initialized for service: ${apm.serviceName} (${apm.environment})`);
