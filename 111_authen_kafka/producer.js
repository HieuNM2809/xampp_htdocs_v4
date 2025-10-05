const { Kafka } = require('kafkajs');
require('dotenv').config();

// Cấu hình Kafka client
const kafka = new Kafka({
  clientId: 'nodejs-kafka-producer',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
});

class KafkaProducer {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      await producer.connect();
      this.isConnected = true;
      console.log('✅ Kafka Producer đã kết nối thành công!');
    } catch (error) {
      console.error('❌ Lỗi kết nối Kafka Producer:', error);
      throw error;
    }
  }

  async sendMessage(topic, key, message) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await producer.send({
        topic: topic,
        messages: [{
          key: key,
          value: JSON.stringify(message),
          timestamp: Date.now(),
          headers: {
            'source': 'nodejs-producer',
            'version': '1.0.0'
          }
        }]
      });

      console.log('📤 Message đã được gửi thành công:');
      console.log(`   Topic: ${topic}`);
      console.log(`   Key: ${key}`);
      console.log(`   Message: ${JSON.stringify(message)}`);
      console.log(`   Result:`, result);

      return result;
    } catch (error) {
      console.error('❌ Lỗi gửi message:', error);
      throw error;
    }
  }

  async sendBatchMessages(topic, messages) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const kafkaMessages = messages.map(msg => ({
        key: msg.key || null,
        value: JSON.stringify(msg.value),
        timestamp: Date.now(),
        headers: {
          'source': 'nodejs-producer',
          'version': '1.0.0'
        }
      }));

      const result = await producer.send({
        topic: topic,
        messages: kafkaMessages
      });

      console.log(`📤 ${messages.length} messages đã được gửi thành công đến topic: ${topic}`);
      return result;
    } catch (error) {
      console.error('❌ Lỗi gửi batch messages:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await producer.disconnect();
      this.isConnected = false;
      console.log('🔌 Kafka Producer đã ngắt kết nối');
    } catch (error) {
      console.error('❌ Lỗi ngắt kết nối Kafka Producer:', error);
    }
  }
}

// Ví dụ sử dụng
async function example() {
  const kafkaProducer = new KafkaProducer();

  try {
    // Gửi message đơn lẻ
    await kafkaProducer.sendMessage('user-events', 'user-123', {
      userId: 123,
      action: 'login',
      timestamp: new Date().toISOString(),
      metadata: {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      }
    });

    // Gửi nhiều messages cùng lúc
    const batchMessages = [
      {
        key: 'order-001',
        value: { orderId: '001', userId: 123, amount: 99.99, status: 'pending' }
      },
      {
        key: 'order-002',
        value: { orderId: '002', userId: 456, amount: 149.99, status: 'confirmed' }
      },
      {
        key: 'order-003',
        value: { orderId: '003', userId: 789, amount: 79.99, status: 'shipped' }
      }
    ];

    await kafkaProducer.sendBatchMessages('order-events', batchMessages);

    // Gửi messages định kỳ (demo)
    console.log('🚀 Bắt đầu gửi messages định kỳ...');
    let counter = 1;
    const interval = setInterval(async () => {
      try {
        await kafkaProducer.sendMessage('heartbeat', `heartbeat-${counter}`, {
          counter: counter,
          timestamp: new Date().toISOString(),
          message: `This is heartbeat message #${counter}`
        });
        counter++;

        if (counter > 10) {
          clearInterval(interval);
          await kafkaProducer.disconnect();
          console.log('✅ Demo hoàn thành!');
        }
      } catch (error) {
        console.error('❌ Lỗi trong heartbeat:', error);
        clearInterval(interval);
        await kafkaProducer.disconnect();
      }
    }, 2000);

  } catch (error) {
    console.error('❌ Lỗi trong ví dụ:', error);
    await kafkaProducer.disconnect();
  }
}

// Xử lý thoát graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Nhận tín hiệu dừng, đang ngắt kết nối...');
  await producer.disconnect();
  process.exit(0);
});

// Chạy ví dụ nếu file được thực thi trực tiếp
if (require.main === module) {
  example().catch(console.error);
}

module.exports = KafkaProducer;
