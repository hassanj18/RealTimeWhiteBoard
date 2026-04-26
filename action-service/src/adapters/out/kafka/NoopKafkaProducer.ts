import { KafkaProducerPort } from "../../../core/ports/KafkaProducerPort";

export class NoopKafkaProducer implements KafkaProducerPort {
  async publish(topic: string, event: unknown): Promise<void> {
    // Do nothing - for testing/development when Kafka is not available
    console.log(`NoopKafkaProducer: Would publish to topic "${topic}":`, event);
  }
}
