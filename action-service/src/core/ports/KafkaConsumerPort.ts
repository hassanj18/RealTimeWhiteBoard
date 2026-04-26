export interface KafkaConsumerPort {
  connect(): Promise<void>;
  subscribe(topic: string): Promise<void>;
  onMessage(handler: (message: unknown) => Promise<void>): void;
  disconnect(): Promise<void>;
}
