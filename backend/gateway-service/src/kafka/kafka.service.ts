import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const broker = this.config.get('KAFKA_BROKER_URL') || 'localhost:9092';
    const username = this.config.get('KAFKA_USERNAME') || '';
    const password = this.config.get('KAFKA_PASSWORD') || '';

    try {
      this.kafka = new Kafka({
        clientId: this.config.get('KAFKA_CLIENT_ID') || 'clinova-gateway',
        brokers: [broker],
        ssl: !!username,
        sasl: username ? { mechanism: 'scram-sha-256', username, password } : undefined,
      });

      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        allowAutoTopicCreation: false,
      });

      await this.producer.connect();
      this.logger.log('✅ Kafka producer connected');
    } catch (e) {
      this.logger.warn(`⚠️ Kafka unavailable — running without event streaming: ${e.message}`);
    }
  }

  async publish(topic: string, message: Record<string, any>, key?: string): Promise<void> {
    if (!this.producer) return;
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: key || null,
          value: JSON.stringify({ ...message, timestamp: new Date().toISOString() }),
        }],
      });
      this.logger.debug(`📤 Kafka event → ${topic}`);
    } catch (e) {
      this.logger.error(`Kafka publish failed for topic ${topic}: ${e.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.producer) await this.producer.disconnect();
  }
}
