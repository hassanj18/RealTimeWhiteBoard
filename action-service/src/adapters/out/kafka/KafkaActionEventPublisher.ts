import { Kafka, Producer } from "kafkajs";
import { Action } from "../../../core/entities/Action";
import { ActionEventPublisher } from "../../../core/ports/ActionEventPublisher";

export class KafkaActionEventPublisher implements ActionEventPublisher {
  private producer: Producer;

  constructor(
    brokers: string[],
    private readonly clientId: string,
    private readonly topic: string
  ) {
    const kafka = new Kafka({ brokers, clientId });
    this.producer = kafka.producer();
  }

  async connect() {
    await this.producer.connect();
  }

  async disconnect() {
    await this.producer.disconnect();
  }

  async publishActionCreated(action: Action): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: action.id,
          value: JSON.stringify({
            event: "ActionCreated",
            data: {
              id: action.id,
              type: action.type,
              payload: action.payload,
              createdAt: action.createdAt.toISOString(),
            },
          }),
        },
      ],
    });
  }
}
