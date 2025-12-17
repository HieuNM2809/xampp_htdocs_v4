// APM must be started before any other modules are required/imported
const config = require('./config');

// Initialize Elastic APM
const apm = require('elastic-apm-node').start({
  serviceName: config.apm.serviceName,
  serverUrl: config.apm.serverUrl,
  environment: config.apm.environment,
  logLevel: config.apm.logLevel,
  logFile: config.apm.logFile,

  // Performance settings
  transactionSampleRate: config.apm.transactionSampleRate,
  captureBody: config.apm.captureBody,
  captureHeaders: config.apm.captureHeaders,

  // Error and debugging settings
  captureExceptions: config.apm.captureExceptions,
  captureSpanStackTraces: config.apm.captureSpanStackTraces,

  // Additional monitoring options
  active: true,
  instrument: true,
  asyncHooks: true,

  // Custom configuration for better monitoring
  usePathAsTransactionName: true,
  addPatch: true,

  centralConfig: false,
});

console.log('🔍 Elastic APM initialized successfully');
console.log(`📊 Service Name: ${config.apm.serviceName}`);
console.log(`🌐 Environment: ${config.apm.environment}`);
console.log(`📡 Server URL: ${config.apm.serverUrl}`);

module.exports = apm;
