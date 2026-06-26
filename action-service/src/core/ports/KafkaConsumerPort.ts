export interface KafkaConsumerPort {
  connect(): Promise<void>;
  subscribe(topics: string | string[]): Promise<void>;
  onMessage(handler: (message: unknown) => Promise<void>): void;
  disconnect(): Promise<void>;
}
