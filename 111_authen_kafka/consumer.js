const { Kafka } = require('kafkajs');
require('dotenv').config();

// Cấu hình Kafka client
const kafkaConfig = {
  clientId: 'nodejs-kafka-consumer',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
};

// Thêm authentication nếu được cấu hình
if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
  kafkaConfig.sasl = {
    mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD
  };

  // Cấu hình SSL nếu cần
  if (process.env.KAFKA_SSL === 'true') {
    kafkaConfig.ssl = {
      ca: process.env.KAFKA_SSL_CA ? [process.env.KAFKA_SSL_CA] : undefined,
      key: process.env.KAFKA_SSL_KEY,
      cert: process.env.KAFKA_SSL_CERT,
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
  }

  console.log(`🔐 Kafka Consumer sử dụng SASL authentication: ${kafkaConfig.sasl.mechanism.toUpperCase()}`);
  console.log(`👤 Username: ${kafkaConfig.sasl.username}`);
}

const kafka = new Kafka(kafkaConfig);

class KafkaConsumer {
  constructor(groupId = 'nodejs-consumer-group') {
    this.groupId = groupId;
    this.consumer = kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      retry: {
        retries: 5
      }
    });
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log(`✅ Kafka Consumer đã kết nối thành công! (Group: ${this.groupId})`);
    } catch (error) {
      console.error('❌ Lỗi kết nối Kafka Consumer:', error);
      throw error;
    }
  }

  async subscribe(topics) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const topicList = Array.isArray(topics) ? topics : [topics];

      for (const topic of topicList) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        console.log(`📝 Đã subscribe topic: ${topic}`);
      }
    } catch (error) {
      console.error('❌ Lỗi subscribe topics:', error);
      throw error;
    }
  }

  async startConsuming(messageHandler) {
    if (!this.isConnected) {
      throw new Error('Consumer chưa kết nối. Hãy gọi connect() trước.');
    }

    try {
      await this.consumer.run({
        partitionsConsumedConcurrently: 1,
        eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
          try {
            // Heartbeat để duy trì session
            await heartbeat();

            const messageData = {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              value: this.parseMessage(message.value?.toString()),
              timestamp: message.timestamp,
              headers: this.parseHeaders(message.headers)
            };

            console.log('📥 Nhận được message:');
            console.log(`   Topic: ${topic}`);
            console.log(`   Partition: ${partition}`);
            console.log(`   Offset: ${message.offset}`);
            console.log(`   Key: ${messageData.key}`);
            console.log(`   Value:`, messageData.value);
            console.log(`   Headers:`, messageData.headers);
            console.log('   ---');

            // Gọi message handler tùy chỉnh
            if (messageHandler) {
              await messageHandler(messageData);
            }

          } catch (error) {
            console.error('❌ Lỗi xử lý message:', error);
            console.error('   Topic:', topic);
            console.error('   Partition:', partition);
            console.error('   Offset:', message.offset);

            // Có thể pause consumer tạm thời nếu có lỗi
            // pause();
            // setTimeout(() => consumer.resume([{ topic, partitions: [partition] }]), 5000);
          }
        }
      });
    } catch (error) {
      console.error('❌ Lỗi chạy consumer:', error);
      throw error;
    }
  }

  async consumeWithBatch(batchHandler, batchSize = 10, batchTimeout = 5000) {
    if (!this.isConnected) {
      throw new Error('Consumer chưa kết nối. Hãy gọi connect() trước.');
    }

    let messageBatch = [];
    let batchTimer = null;

    const processBatch = async () => {
      if (messageBatch.length > 0) {
        console.log(`🔄 Xử lý batch ${messageBatch.length} messages...`);
        try {
          await batchHandler([...messageBatch]);
          messageBatch = [];
        } catch (error) {
          console.error('❌ Lỗi xử lý batch:', error);
          // Giữ lại messages để retry
        }
      }
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
    };

    try {
      await this.consumer.run({
        partitionsConsumedConcurrently: 1,
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          await heartbeat();

          const messageData = {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: this.parseMessage(message.value?.toString()),
            timestamp: message.timestamp,
            headers: this.parseHeaders(message.headers)
          };

          messageBatch.push(messageData);

          // Xử lý batch nếu đủ kích thước
          if (messageBatch.length >= batchSize) {
            await processBatch();
          } else {
            // Set timer để xử lý batch sau timeout
            if (batchTimer) {
              clearTimeout(batchTimer);
            }
            batchTimer = setTimeout(processBatch, batchTimeout);
          }
        }
      });
    } catch (error) {
      console.error('❌ Lỗi chạy batch consumer:', error);
      throw error;
    }
  }

  parseMessage(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Trả về string nếu không parse được JSON
    }
  }

  parseHeaders(headers) {
    if (!headers) return {};

    const parsed = {};
    for (const [key, value] of Object.entries(headers)) {
      parsed[key] = value?.toString();
    }
    return parsed;
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('🔌 Kafka Consumer đã ngắt kết nối');
    } catch (error) {
      console.error('❌ Lỗi ngắt kết nối Kafka Consumer:', error);
    }
  }

  async commitOffsets() {
    try {
      await this.consumer.commitOffsets();
      console.log('✅ Đã commit offsets thành công');
    } catch (error) {
      console.error('❌ Lỗi commit offsets:', error);
    }
  }
}

// Ví dụ sử dụng
async function example() {
  const consumer = new KafkaConsumer('demo-consumer-group');

  try {
    await consumer.connect();
    await consumer.subscribe(['user-events', 'order-events', 'heartbeat']);

    console.log('🎧 Bắt đầu lắng nghe messages...');

    // Ví dụ 1: Xử lý từng message
    await consumer.startConsuming(async (messageData) => {
      // Xử lý business logic tùy theo topic
      switch (messageData.topic) {
        case 'user-events':
          console.log('👤 Xử lý user event:', messageData.value);
          // Xử lý user events (login, logout, etc.)
          break;

        case 'order-events':
          console.log('🛒 Xử lý order event:', messageData.value);
          // Xử lý order events (created, updated, shipped, etc.)
          break;

        case 'heartbeat':
          console.log('💓 Heartbeat:', messageData.value);
          break;

        default:
          console.log('📋 Message từ topic khác:', messageData.topic, messageData.value);
      }
    });

  } catch (error) {
    console.error('❌ Lỗi trong ví dụ consumer:', error);
    await consumer.disconnect();
  }
}

// Ví dụ batch processing
async function exampleBatch() {
  const batchConsumer = new KafkaConsumer('batch-consumer-group');

  try {
    await batchConsumer.connect();
    await batchConsumer.subscribe(['order-events']);

    console.log('🔄 Bắt đầu batch processing...');

    await batchConsumer.consumeWithBatch(async (messages) => {
      console.log(`📦 Xử lý batch ${messages.length} messages:`);

      // Giả lập xử lý batch (ví dụ: ghi vào database)
      for (const message of messages) {
        console.log(`  - Order ${message.value.orderId}: ${message.value.status}`);
      }

      // Giả lập thời gian xử lý
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Hoàn thành xử lý batch');

    }, 5, 3000); // Batch size: 5, timeout: 3s

  } catch (error) {
    console.error('❌ Lỗi trong batch consumer:', error);
    await batchConsumer.disconnect();
  }
}

// Xử lý thoát graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Nhận tín hiệu dừng, đang ngắt kết nối consumer...');
  process.exit(0);
});

// Chạy ví dụ nếu file được thực thi trực tiếp
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--batch')) {
    exampleBatch().catch(console.error);
  } else {
    example().catch(console.error);
  }
}

module.exports = KafkaConsumer;
