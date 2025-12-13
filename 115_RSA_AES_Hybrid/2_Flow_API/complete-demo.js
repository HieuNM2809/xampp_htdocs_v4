/**
 * Complete Demo - Realistic Hybrid Encryption Flow
 * 
 * Kịch bản hoàn chỉnh:
 * 1. Start server
 * 2. Client setup (key exchange) 
 * 3. Client encrypts data → sends to server
 * 4. Server decrypts → processes → encrypts response
 * 5. Client receives → decrypts response
 */

const { spawn } = require('child_process');
const axios = require('axios');
const { SecureAPIClient } = require('./realistic-client');

// Màu sắc console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logStep(step, description) {
  log(`\n${step}. ${description}`, colors.yellow);
}

/**
 * Start server in background
 */
function startServer() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting realistic secure server...', colors.blue);
    
    const server = spawn('node', ['realistic-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });
    
    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      // Log server output với prefix
      data.toString().split('\n').forEach(line => {
        if (line.trim()) {
          log(`[SERVER] ${line}`, colors.blue);
        }
      });
      
      // Server ready when listening message appears
      if (output.includes('running on http://localhost:3001')) {
        log('✅ Server is ready!', colors.green);
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      log(`[SERVER ERROR] ${data}`, colors.red);
    });
    
    server.on('error', (error) => {
      log(`❌ Failed to start server: ${error.message}`, colors.red);
      reject(error);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!output.includes('running on http://localhost:3001')) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get('http://localhost:3001/api/health');
      return true;
    } catch (error) {
      log(`⏳ Waiting for server... (attempt ${i + 1}/${maxRetries})`, colors.yellow);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Server not ready after maximum retries');
}

/**
 * Demo scenario: E-commerce transaction
 */
async function ecommerceScenarioDemo() {
  logSection('🛍️ E-COMMERCE SCENARIO DEMO');
  
  try {
    // Setup client
    const client = new SecureAPIClient('http://localhost:3001');
    await client.setup();
    
    logStep(1, 'Customer places secure order');
    
    const orderData = {
      type: 'place_order',
      customer: {
        id: 'cust_12345',
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+1-555-0123'
      },
      order: {
        id: 'order_' + Date.now(),
        items: [
          { product: 'iPhone 15 Pro', quantity: 1, price: 999 },
          { product: 'AirPods Pro', quantity: 1, price: 249 },
          { product: 'Lightning Cable', quantity: 2, price: 29 }
        ],
        subtotal: 1306,
        tax: 104.48,
        shipping: 9.99,
        total: 1420.47
      },
      payment: {
        method: 'credit_card',
        card_number: '4532-1234-5678-9012', // This will be encrypted!
        exp_date: '12/25',
        cvv: '123',
        billing_address: {
          street: '123 Main Street',
          city: 'Anytown',
          state: 'CA',
          zip: '90210',
          country: 'USA'
        }
      },
      shipping_address: {
        street: '456 Oak Avenue',  
        city: 'Somewhere',
        state: 'NY',
        zip: '10001',
        country: 'USA'
      }
    };
    
    log('🔒 Sensitive order data (credit card, personal info) will be encrypted before sending...', colors.magenta);
    log(`Order total: $${orderData.order.total}`, colors.cyan);
    
    const result = await client.secureRequest('/api/secure/process', orderData);
    
    log('✅ Order processed securely!', colors.green);
    log('📄 Order confirmation:', colors.cyan);
    console.log(JSON.stringify(result.data, null, 2));
    
    return result;
    
  } catch (error) {
    log(`❌ E-commerce demo failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Demo scenario: Banking transaction
 */
async function bankingScenarioDemo() {
  logSection('🏦 BANKING SCENARIO DEMO');
  
  try {
    const client = new SecureAPIClient('http://localhost:3001');
    await client.setup();
    
    logStep(1, 'Customer initiates secure money transfer');
    
    const transferData = {
      type: 'money_transfer',
      from: {
        account: '1234567890',
        name: 'Alice Johnson',
        bank: 'First National Bank',
        routing: '021000021'
      },
      to: {
        account: '9876543210',
        name: 'Bob Smith', 
        bank: 'Second Federal Bank',
        routing: '121042882'
      },
      amount: 2500.00,
      currency: 'USD',
      description: 'Rent payment - Apartment 4B',
      reference: 'RENT-2024-01-' + Date.now(),
      metadata: {
        channel: 'mobile_app',
        device_id: 'device_abc123',
        ip_address: '192.168.1.100',
        location: 'New York, NY',
        two_factor_code: '782156'
      }
    };
    
    log('💰 High-value transfer data will be encrypted end-to-end...', colors.magenta);
    log(`Transfer amount: $${transferData.amount.toLocaleString()}`, colors.cyan);
    log(`From: ${transferData.from.name} (${transferData.from.account})`, colors.blue);
    log(`To: ${transferData.to.name} (${transferData.to.account})`, colors.blue);
    
    const result = await client.secureRequest('/api/secure/process', transferData);
    
    log('✅ Money transfer processed securely!', colors.green);
    log('🧾 Transaction receipt:', colors.cyan);
    console.log(JSON.stringify(result.data, null, 2));
    
    return result;
    
  } catch (error) {
    log(`❌ Banking demo failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Demo scenario: Healthcare data
 */
async function healthcareScenarioDemo() {
  logSection('🏥 HEALTHCARE SCENARIO DEMO');
  
  try {
    const client = new SecureAPIClient('http://localhost:3001');
    await client.setup();
    
    logStep(1, 'Doctor submits patient medical records');
    
    const medicalData = {
      type: 'medical_record',
      patient: {
        id: 'patient_67890',
        name: 'Sarah Wilson',
        ssn: '123-45-6789', // Highly sensitive!
        dob: '1985-03-15',
        gender: 'Female',
        contact: {
          phone: '+1-555-0199',
          email: 'sarah.w@email.com',
          address: '789 Health Street, Medical City, MC 12345'
        }
      },
      visit: {
        id: 'visit_' + Date.now(),
        date: '2024-01-15',
        doctor: 'Dr. Emily Chen, MD',
        facility: 'City General Hospital',
        department: 'Internal Medicine'
      },
      diagnosis: [
        { code: 'E11.9', description: 'Type 2 diabetes without complications' },
        { code: 'I10', description: 'Essential hypertension' }
      ],
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
        { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' }
      ],
      lab_results: {
        blood_glucose: '145 mg/dL',
        hba1c: '7.2%',
        blood_pressure: '138/88 mmHg',
        cholesterol: '198 mg/dL'
      },
      notes: 'Patient shows good compliance with medication regimen. Recommend lifestyle modifications including diet and exercise. Follow-up in 3 months.'
    };
    
    log('🔒 HIPAA-protected medical data will be encrypted...', colors.magenta);
    log(`Patient: ${medicalData.patient.name}`, colors.cyan);
    log(`Diagnoses: ${medicalData.diagnosis.length} conditions`, colors.blue);
    log(`Medications: ${medicalData.medications.length} prescriptions`, colors.blue);
    
    const result = await client.secureRequest('/api/secure/process', medicalData);
    
    log('✅ Medical records processed securely!', colors.green);
    log('📋 Processing summary:', colors.cyan);
    console.log(JSON.stringify(result.data, null, 2));
    
    return result;
    
  } catch (error) {
    log(`❌ Healthcare demo failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Performance comparison demo
 */
async function performanceComparisonDemo() {
  logSection('⚡ PERFORMANCE COMPARISON');
  
  try {
    const client = new SecureAPIClient('http://localhost:3001');
    await client.setup();
    
    const testSizes = [
      { name: 'Small (1KB)', data: 'X'.repeat(1024) },
      { name: 'Medium (10KB)', data: 'Y'.repeat(10240) },
      { name: 'Large (50KB)', data: 'Z'.repeat(51200) }
    ];
    
    log('🧪 Testing encryption performance with different payload sizes...', colors.blue);
    
    const results = [];
    
    for (const test of testSizes) {
      logStep(`Testing ${test.name}`, 'payload encryption and processing');
      
      const testPayload = {
        type: 'performance_test',
        test_name: test.name,
        payload: test.data,
        timestamp: Date.now(),
        checksum: require('crypto').createHash('md5').update(test.data).digest('hex')
      };
      
      const startTime = Date.now();
      const result = await client.secureRequest('/api/secure/process', testPayload);
      const totalTime = Date.now() - startTime;
      
      const throughput = (test.data.length / totalTime * 1000 / 1024).toFixed(2);
      
      log(`   ⚡ Total time: ${totalTime}ms`, colors.green);
      log(`   📊 Throughput: ${throughput} KB/s`, colors.cyan);
      
      results.push({
        size: test.name,
        time: totalTime,
        throughput: parseFloat(throughput)
      });
    }
    
    log('\n📈 Performance Summary:', colors.yellow);
    results.forEach(r => {
      log(`   ${r.size}: ${r.time}ms (${r.throughput} KB/s)`, colors.blue);
    });
    
    return results;
    
  } catch (error) {
    log(`❌ Performance demo failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main demo orchestrator
 */
async function runCompleteDemo() {
  logSection('🚀 COMPLETE REALISTIC HYBRID ENCRYPTION DEMO');
  log('This demo shows the complete flow:', colors.blue);
  log('Client encrypts → Server decrypts & processes → Server encrypts response → Client decrypts', colors.blue);
  
  let server = null;
  
  try {
    // Start server
    server = await startServer();
    
    // Wait for server to be ready
    await waitForServer();
    
    // Run demo scenarios
    await ecommerceScenarioDemo();
    await bankingScenarioDemo();
    await healthcareScenarioDemo();
    await performanceComparisonDemo();
    
    logSection('🎊 ALL DEMOS COMPLETED SUCCESSFULLY');
    log('Key takeaways:', colors.green);
    log('✅ Client data is encrypted before transmission', colors.green);
    log('✅ Server never sees plaintext data in transit', colors.green);
    log('✅ Server processes business logic on decrypted data', colors.green);
    log('✅ Response is encrypted before sending back', colors.green);
    log('✅ Client decrypts response to get final result', colors.green);
    log('✅ Each request uses unique AES keys for perfect forward secrecy', colors.green);
    
  } catch (error) {
    log(`❌ Complete demo failed: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // Cleanup server
    if (server) {
      log('\n🔄 Stopping server...', colors.yellow);
      server.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
      log('✅ Server stopped', colors.green);
    }
  }
}

// Export for use in other files
module.exports = {
  startServer,
  waitForServer,
  ecommerceScenarioDemo,
  bankingScenarioDemo,
  healthcareScenarioDemo,
  performanceComparisonDemo,
  runCompleteDemo
};

// Run demo if file called directly
if (require.main === module) {
  runCompleteDemo();
}
