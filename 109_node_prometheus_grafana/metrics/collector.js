const promClient = require('prom-client');
const os = require('os');

class MetricsCollector {
  constructor() {
    this.register = new promClient.Registry();
    this.initializeMetrics();
    
    // Add default Node.js metrics
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'nodejs_'
    });
  }

  initializeMetrics() {
    // HTTP Request Metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.httpRequestSizeBytes = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    this.httpResponseSizeBytes = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000]
    });

    // Active Connections
    this.activeConnections = new promClient.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections'
    });

    // Business Logic Metrics
    this.businessOperations = new promClient.Counter({
      name: 'business_operations_total',
      help: 'Total number of business operations',
      labelNames: ['operation_type', 'status']
    });

    this.businessOperationDuration = new promClient.Histogram({
      name: 'business_operation_duration_seconds',
      help: 'Duration of business operations in seconds',
      labelNames: ['operation_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30]
    });

    // Database Metrics
    this.databaseConnections = new promClient.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections'
    });

    this.databaseQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    });

    this.databaseQueriesTotal = new promClient.Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['query_type', 'table', 'status']
    });

    // Cache Metrics
    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_pattern']
    });

    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_pattern']
    });

    this.cacheSize = new promClient.Gauge({
      name: 'cache_size_bytes',
      help: 'Current cache size in bytes',
      labelNames: ['cache_type']
    });

    // Error Metrics
    this.errorRate = new promClient.Counter({
      name: 'application_errors_total',
      help: 'Total number of application errors',
      labelNames: ['error_type', 'severity', 'component']
    });

    // Custom Business Metrics
    this.userRegistrations = new promClient.Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['source', 'country']
    });

    this.userLogins = new promClient.Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['method', 'success']
    });

    this.orderValue = new promClient.Histogram({
      name: 'order_value_dollars',
      help: 'Value of orders in dollars',
      labelNames: ['category', 'payment_method'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
    });

    this.inventoryLevel = new promClient.Gauge({
      name: 'inventory_level',
      help: 'Current inventory levels',
      labelNames: ['product_id', 'category', 'warehouse']
    });

    // System Resource Metrics
    this.systemCpuUsage = new promClient.Gauge({
      name: 'system_cpu_usage_percent',
      help: 'Current CPU usage percentage'
    });

    this.systemMemoryUsage = new promClient.Gauge({
      name: 'system_memory_usage_bytes',
      help: 'Current memory usage in bytes',
      labelNames: ['type']
    });

    this.systemDiskUsage = new promClient.Gauge({
      name: 'system_disk_usage_bytes',
      help: 'Current disk usage in bytes',
      labelNames: ['device', 'type']
    });

    // Application-specific Metrics
    this.queueSize = new promClient.Gauge({
      name: 'queue_size',
      help: 'Number of items in various queues',
      labelNames: ['queue_name', 'priority']
    });

    this.workerThreads = new promClient.Gauge({
      name: 'worker_threads_active',
      help: 'Number of active worker threads',
      labelNames: ['worker_type']
    });

    // SLI/SLO Metrics
    this.sliLatency = new promClient.Histogram({
      name: 'sli_latency_seconds',
      help: 'Service Level Indicator for latency',
      labelNames: ['service', 'endpoint'],
      buckets: [0.1, 0.2, 0.5, 1, 2, 5]
    });

    this.sliAvailability = new promClient.Gauge({
      name: 'sli_availability_ratio',
      help: 'Service Level Indicator for availability',
      labelNames: ['service']
    });

    this.sliErrorRate = new promClient.Gauge({
      name: 'sli_error_rate_ratio',
      help: 'Service Level Indicator for error rate',
      labelNames: ['service', 'endpoint']
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestsTotal);
    this.register.registerMetric(this.httpRequestSizeBytes);
    this.register.registerMetric(this.httpResponseSizeBytes);
    this.register.registerMetric(this.activeConnections);
    this.register.registerMetric(this.businessOperations);
    this.register.registerMetric(this.businessOperationDuration);
    this.register.registerMetric(this.databaseConnections);
    this.register.registerMetric(this.databaseQueryDuration);
    this.register.registerMetric(this.databaseQueriesTotal);
    this.register.registerMetric(this.cacheHits);
    this.register.registerMetric(this.cacheMisses);
    this.register.registerMetric(this.cacheSize);
    this.register.registerMetric(this.errorRate);
    this.register.registerMetric(this.userRegistrations);
    this.register.registerMetric(this.userLogins);
    this.register.registerMetric(this.orderValue);
    this.register.registerMetric(this.inventoryLevel);
    this.register.registerMetric(this.systemCpuUsage);
    this.register.registerMetric(this.systemMemoryUsage);
    this.register.registerMetric(this.systemDiskUsage);
    this.register.registerMetric(this.queueSize);
    this.register.registerMetric(this.workerThreads);
    this.register.registerMetric(this.sliLatency);
    this.register.registerMetric(this.sliAvailability);
    this.register.registerMetric(this.sliErrorRate);
  }

  // HTTP Request Tracking
  recordRequestDuration(method, path, statusCode, duration) {
    const durationInSeconds = duration / 1000;
    this.httpRequestDuration.observe(
      { method, route: path, status_code: statusCode },
      durationInSeconds
    );
    this.httpRequestsTotal.inc({ method, route: path, status_code: statusCode });
  }

  recordResponseTime(method, path, statusCode, time) {
    this.httpRequestDuration.observe(
      { method, route: path, status_code: statusCode },
      time / 1000
    );
  }

  incrementActiveRequests() {
    this.activeConnections.inc();
  }

  decrementActiveRequests() {
    this.activeConnections.dec();
  }

  // Business Operations
  recordBusinessOperation(operationType, duration, success = true) {
    this.businessOperations.inc({
      operation_type: operationType,
      status: success ? 'success' : 'error'
    });
    this.businessOperationDuration.observe(
      { operation_type: operationType },
      duration / 1000
    );
  }

  // Database Metrics
  recordDatabaseQuery(queryType, table, duration, success = true) {
    this.databaseQueryDuration.observe(
      { query_type: queryType, table },
      duration / 1000
    );
    this.databaseQueriesTotal.inc({
      query_type: queryType,
      table,
      status: success ? 'success' : 'error'
    });
  }

  setDatabaseConnections(count) {
    this.databaseConnections.set(count);
  }

  // Cache Metrics
  recordCacheHit(cacheType, keyPattern) {
    this.cacheHits.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheMiss(cacheType, keyPattern) {
    this.cacheMisses.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  setCacheSize(cacheType, sizeBytes) {
    this.cacheSize.set({ cache_type: cacheType }, sizeBytes);
  }

  // Error Tracking
  recordError(errorType, severity, component) {
    this.errorRate.inc({
      error_type: errorType,
      severity,
      component
    });
  }

  // User Metrics
  recordUserRegistration(source, country) {
    this.userRegistrations.inc({ source, country });
  }

  recordUserLogin(method, success) {
    this.userLogins.inc({ method, success: success.toString() });
  }

  // Order Metrics
  recordOrder(value, category, paymentMethod) {
    this.orderValue.observe(
      { category, payment_method: paymentMethod },
      value
    );
  }

  // Inventory
  setInventoryLevel(productId, category, warehouse, level) {
    this.inventoryLevel.set(
      { product_id: productId, category, warehouse },
      level
    );
  }

  // System Metrics Collection
  collectSystemMetrics() {
    // CPU Usage
    const cpuUsage = process.cpuUsage();
    this.systemCpuUsage.set(
      (cpuUsage.user + cpuUsage.system) / 1000000 * 100
    );

    // Memory Usage
    const memUsage = process.memoryUsage();
    this.systemMemoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.systemMemoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
    this.systemMemoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
    this.systemMemoryUsage.set({ type: 'external' }, memUsage.external);

    // System-wide metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    this.systemMemoryUsage.set({ type: 'system_total' }, totalMem);
    this.systemMemoryUsage.set({ type: 'system_free' }, freeMem);
    this.systemMemoryUsage.set({ type: 'system_used' }, totalMem - freeMem);
  }

  // Queue Metrics
  setQueueSize(queueName, priority, size) {
    this.queueSize.set({ queue_name: queueName, priority }, size);
  }

  // Worker Thread Metrics
  setWorkerThreads(workerType, count) {
    this.workerThreads.set({ worker_type: workerType }, count);
  }

  // SLI/SLO Metrics
  recordSLILatency(service, endpoint, latency) {
    this.sliLatency.observe({ service, endpoint }, latency);
  }

  setSLIAvailability(service, ratio) {
    this.sliAvailability.set({ service }, ratio);
  }

  setSLIErrorRate(service, endpoint, rate) {
    this.sliErrorRate.set({ service, endpoint }, rate);
  }

  // Get metrics for Prometheus
  async getMetrics() {
    return await this.register.metrics();
  }

  // Convenience methods for common operations
  recordHealthCheck(success) {
    this.recordBusinessOperation('health_check', 1, success);
  }

  incrementSimulationRequests() {
    this.businessOperations.inc({
      operation_type: 'simulation',
      status: 'started'
    });
  }

  recordSimulationTime(duration) {
    this.businessOperationDuration.observe(
      { operation_type: 'simulation' },
      duration / 1000
    );
  }

  incrementErrorSimulation(errorType) {
    this.recordError(errorType, 'warning', 'simulation');
  }

  incrementUnhandledErrors() {
    this.recordError('unhandled_exception', 'error', 'application');
  }

  increment404Errors() {
    this.recordError('not_found', 'info', 'http');
  }

  recordDatabaseMetrics(dbMetrics) {
    if (dbMetrics.connectionCount) {
      this.setDatabaseConnections(dbMetrics.connectionCount);
    }
    if (dbMetrics.queryCount) {
      this.businessOperations.inc({
        operation_type: 'database_query',
        status: 'completed'
      }, dbMetrics.queryCount);
    }
  }

  recordBusinessMetrics(businessMetrics) {
    if (businessMetrics.totalUsers) {
      this.businessOperations.inc({
        operation_type: 'user_count_update',
        status: 'success'
      });
    }
    if (businessMetrics.totalOrders) {
      this.businessOperations.inc({
        operation_type: 'order_count_update',
        status: 'success'
      });
    }
    if (businessMetrics.totalRevenue) {
      this.businessOperations.inc({
        operation_type: 'revenue_update',
        status: 'success'
      });
    }
  }
}

module.exports = MetricsCollector;
