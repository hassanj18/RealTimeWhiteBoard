import { Kafka, Producer } from "kafkajs";
import { KafkaProducerPort } from "../../../core/ports/KafkaProducerPort";

export class KafkaProducerAdapter implements KafkaProducerPort {
  private producer: Producer;
  private connected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(
    private readonly brokers: string[],
    private readonly clientId: string
  ) {
    const kafka = new Kafka({ brokers, clientId });
    this.producer = kafka.producer();
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    
    if (!this.connectionPromise) {
      this.connectionPromise = this.doConnect();
    }
    
    try {
      await this.connectionPromise;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  private async doConnect(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      console.log("Kafka producer connected");
    } catch (error) {
      console.warn("Failed to connect to Kafka:", error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.connected) return;
    await this.producer.disconnect();
    this.connected = false;
    this.connectionPromise = null;
  }

  async publish(topic: string, event: unknown): Promise<void> {
    try {
      await this.ensureConnected();
      const serialized = JSON.stringify(event);
      await this.producer.send({
        topic,
        messages: [{ value: serialized }],
      });
    } catch (error) {
      console.warn("Failed to publish to Kafka, message lost:", error);
      // Don't throw - just log the error so the service continues
    }
  }
}
