export interface KafkaProducerPort {
  publish(topic: string, event: unknown): Promise<void>;
}
