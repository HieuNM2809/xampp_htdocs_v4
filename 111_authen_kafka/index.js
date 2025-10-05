const express = require('express');
const cors = require('cors');
const KafkaProducer = require('./producer');
const KafkaConsumer = require('./consumer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Khởi tạo Kafka Producer và Consumer
const producer = new KafkaProducer();
let consumers = {};

// Connect producer khi start app
producer.connect().catch(console.error);

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Node.js Kafka Example API',
    version: '1.0.0',
    endpoints: {
      'GET /': 'API info',
      'POST /produce': 'Send message to Kafka',
      'POST /produce/batch': 'Send batch messages to Kafka',
      'POST /consume/start': 'Start consuming messages',
      'POST /consume/stop': 'Stop consuming messages',
      'GET /health': 'Health check'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    kafka: {
      producer: producer.isConnected ? 'connected' : 'disconnected',
      consumers: Object.keys(consumers).length
    }
  });
});

// Produce single message
app.post('/produce', async (req, res) => {
  try {
    const { topic, key, message } = req.body;

    if (!topic || !message) {
      return res.status(400).json({
        error: 'Topic and message are required',
        example: {
          topic: 'user-events',
          key: 'user-123',
          message: { userId: 123, action: 'login' }
        }
      });
    }

    const result = await producer.sendMessage(topic, key, message);

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        topic,
        key,
        message,
        result: result[0]
      }
    });
  } catch (error) {
    console.error('Error producing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Produce batch messages
app.post('/produce/batch', async (req, res) => {
  try {
    const { topic, messages } = req.body;

    if (!topic || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Topic and messages array are required',
        example: {
          topic: 'order-events',
          messages: [
            { key: 'order-1', value: { orderId: '1', status: 'created' } },
            { key: 'order-2', value: { orderId: '2', status: 'confirmed' } }
          ]
        }
      });
    }

    const result = await producer.sendBatchMessages(topic, messages);

    res.json({
      success: true,
      message: `${messages.length} messages sent successfully`,
      data: {
        topic,
        messageCount: messages.length,
        result: result[0]
      }
    });
  } catch (error) {
    console.error('Error producing batch messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start consuming messages
app.post('/consume/start', async (req, res) => {
  try {
    const { topics, groupId = 'api-consumer-group' } = req.body;

    if (!topics || (!Array.isArray(topics) && typeof topics !== 'string')) {
      return res.status(400).json({
        error: 'Topics are required (string or array)',
        example: {
          topics: ['user-events', 'order-events'],
          groupId: 'my-consumer-group'
        }
      });
    }

    // Stop existing consumer with same groupId if exists
    if (consumers[groupId]) {
      await consumers[groupId].disconnect();
    }

    // Create new consumer
    const consumer = new KafkaConsumer(groupId);
    consumers[groupId] = consumer;

    await consumer.connect();
    await consumer.subscribe(topics);

    // Start consuming (không block API response)
    consumer.startConsuming(async (messageData) => {
      console.log(`[${groupId}] Processed message from ${messageData.topic}:`, messageData.value);
      // Có thể thêm logic xử lý message ở đây
    }).catch(error => {
      console.error(`Consumer ${groupId} error:`, error);
    });

    res.json({
      success: true,
      message: 'Consumer started successfully',
      data: {
        groupId,
        topics: Array.isArray(topics) ? topics : [topics],
        status: 'consuming'
      }
    });
  } catch (error) {
    console.error('Error starting consumer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop consuming messages
app.post('/consume/stop', async (req, res) => {
  try {
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({
        error: 'groupId is required'
      });
    }

    if (!consumers[groupId]) {
      return res.status(404).json({
        error: 'Consumer with this groupId not found'
      });
    }

    await consumers[groupId].disconnect();
    delete consumers[groupId];

    res.json({
      success: true,
      message: 'Consumer stopped successfully',
      data: {
        groupId,
        status: 'stopped'
      }
    });
  } catch (error) {
    console.error('Error stopping consumer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List active consumers
app.get('/consumers', (req, res) => {
  const consumerList = Object.keys(consumers).map(groupId => ({
    groupId,
    status: consumers[groupId].isConnected ? 'connected' : 'disconnected'
  }));

  res.json({
    success: true,
    data: {
      activeConsumers: consumerList.length,
      consumers: consumerList
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    // Disconnect all consumers
    for (const [groupId, consumer] of Object.entries(consumers)) {
      console.log(`Disconnecting consumer: ${groupId}`);
      await consumer.disconnect();
    }

    // Disconnect producer
    await producer.disconnect();

    console.log('✅ All Kafka connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`🎯 Kafka UI: http://localhost:8080`);
});

module.exports = app;
