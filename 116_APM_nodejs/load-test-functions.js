// Artillery Load Test Helper Functions
// Custom functions to support dynamic load testing

module.exports = {
  // Generate random user data for testing
  generateRandomUser: function(context, events, done) {
    const names = [
      'Nguyễn Văn Hải', 'Trần Thị Linh', 'Lê Văn Minh',
      'Phạm Thị Nga', 'Hoàng Văn Ông', 'Vũ Thị Phúc',
      'Đặng Văn Quang', 'Bùi Thị Rose', 'Ngô Văn Sơn', 'Lý Thị Tâm'
    ];
    
    const cities = [
      'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 
      'Hải Phòng', 'Nha Trang', 'Huế', 'Vũng Tàu'
    ];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const age = Math.floor(Math.random() * 40) + 20; // 20-60 years old
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}${Math.floor(Math.random() * 1000)}@test.com`;
    
    context.vars.randomUser = {
      name,
      email,
      age,
      city
    };
    
    return done();
  },

  // Generate random search query
  generateRandomSearch: function(context, events, done) {
    const queries = [
      'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng',
      'Hà Nội', 'Sài Gòn', 'Đà Nẵng',
      '@gmail', '@example', '.com'
    ];
    
    context.vars.searchQuery = queries[Math.floor(Math.random() * queries.length)];
    return done();
  },

  // Generate random computation workload
  generateRandomWorkload: function(context, events, done) {
    const workloads = [50000, 100000, 500000, 750000, 1000000];
    context.vars.iterations = workloads[Math.floor(Math.random() * workloads.length)];
    return done();
  },

  // Log response times for debugging
  logResponseTime: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log(`❌ Error ${response.statusCode} for ${requestParams.url}`);
    } else if (response.timings && response.timings.response > 1000) {
      console.log(`🐌 Slow response (${response.timings.response}ms) for ${requestParams.url}`);
    }
    
    return next();
  },

  // Add custom headers for tracing
  addCustomHeaders: function(requestParams, context, ee, next) {
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-Test-ID'] = `artillery-${context.vars.$uuid}`;
    requestParams.headers['X-Test-Scenario'] = context.scenario?.name || 'unknown';
    requestParams.headers['User-Agent'] = 'Artillery-Load-Test/1.0';
    
    return next();
  },

  // Capture APM trace ID from response
  captureTraceId: function(requestParams, response, context, ee, next) {
    if (response.body) {
      try {
        const body = JSON.parse(response.body);
        if (body.trace_id) {
          context.vars.lastTraceId = body.trace_id;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return next();
  },

  // Random delay to simulate user behavior
  randomDelay: function(context, events, done) {
    // Random delay between 100ms to 2000ms
    const delay = Math.floor(Math.random() * 1900) + 100;
    setTimeout(done, delay);
  },

  // Validate response data
  validateResponse: function(requestParams, response, context, ee, next) {
    // Skip validation for error test endpoints
    if (requestParams.url.includes('/api/error-test')) {
      return next();
    }
    
    if (response.statusCode === 200) {
      try {
        const body = JSON.parse(response.body);
        
        // Validate common response structure
        if (body.success === false && response.statusCode === 200) {
          console.warn(`⚠️  Response marked as unsuccessful but status 200: ${requestParams.url}`);
        }
        
        // Validate specific endpoints
        if (requestParams.url.includes('/api/users') && !requestParams.url.match(/\/\d+$/)) {
          if (!body.data || !Array.isArray(body.data)) {
            console.warn(`⚠️  Users endpoint missing data array: ${requestParams.url}`);
          }
        }
        
        if (requestParams.url.includes('/api/dashboard')) {
          if (!body.data || !body.data.users || !body.data.stats) {
            console.warn(`⚠️  Dashboard missing required data: ${requestParams.url}`);
          }
        }
        
      } catch (e) {
        console.warn(`⚠️  Invalid JSON response: ${requestParams.url}`);
      }
    }
    
    return next();
  },

  // Custom metrics collection
  collectMetrics: function(requestParams, response, context, ee, next) {
    const endpoint = requestParams.url.replace(/\/\d+$/, '/:id'); // Normalize IDs
    const responseTime = response.timings?.response || 0;
    
    // Emit custom metrics
    ee.emit('customStat', 'endpoint_response_time', responseTime, {
      endpoint: endpoint,
      status: response.statusCode
    });
    
    // Track slow queries
    if (responseTime > 1000) {
      ee.emit('customStat', 'slow_queries', 1, {
        endpoint: endpoint,
        response_time: responseTime
      });
    }
    
    // Track errors by endpoint
    if (response.statusCode >= 400) {
      ee.emit('customStat', 'errors_by_endpoint', 1, {
        endpoint: endpoint,
        status: response.statusCode
      });
    }
    
    return next();
  },

  // Print load test summary
  printSummary: function(stats) {
    console.log('\n🎯 Load Test Summary:');
    console.log('==================');
    console.log(`Total Requests: ${stats.requestsCompleted || 0}`);
    console.log(`Request Rate: ${(stats.requestsCompleted / stats.period) || 0} req/sec`);
    console.log(`Response Time P95: ${stats.latency?.p95 || 0}ms`);
    console.log(`Response Time P99: ${stats.latency?.p99 || 0}ms`);
    console.log(`Errors: ${stats.errors || 0}`);
    console.log(`Error Rate: ${((stats.errors / stats.requestsCompleted) * 100).toFixed(2) || 0}%`);
    console.log('==================\n');
  }
};

// Helper function to generate realistic Vietnamese names
function generateVietnameseName() {
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  const middleNames = ['Văn', 'Thị', 'Đức', 'Minh', 'Thanh', 'Thi'];
  const firstNames = ['An', 'Bình', 'Cường', 'Dung', 'Em', 'Phương', 'Giang', 'Hoa', 'Ích', 'Kim', 'Lan', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quang', 'Rose', 'Sơn', 'Tâm', 'Uyên', 'Vinh', 'Xuân', 'Yến', 'Zung'];
  
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  
  return `${lastName} ${middleName} ${firstName}`;
}
