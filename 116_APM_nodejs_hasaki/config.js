// APM and Application Configuration
require('dotenv').config();

const config = {
  // Application settings
  app: {
    port: 3000,
    env: 'development',
  },

  // Elastic APM Configuration
  apm: {
    serviceName: 'hsknow-services-qc',
    serverUrl: 'https://apm-server.inshasaki.com',
    environment: 'qc',
    logLevel: 'debug',
    logFile: 'stderr',

    // Additional APM options
    transactionSampleRate: 1.0,
    captureBody: 'all',
    captureHeaders: true,

    // Error handling
    captureExceptions: true,
    captureSpanStackTraces: true,
  }
};

module.exports = config;

// "ELASTIC_APM_ENVIRONMENT": "qc",
// "ELASTIC_APM_LOG_FILE": "stderr",
// "ELASTIC_APM_LOG_LEVEL": "debug",
// "ELASTIC_APM_SERVER_URL": "https://apm-server.inshasaki.com",
// "ELASTIC_APM_SERVICE_NAME": "ffm-gateway_QC",
