import { Action } from "../../../core/entities/Action";
import { ActionEventPublisher } from "../../../core/ports/ActionEventPublisher";
import { KafkaProducerPort } from "../../../core/ports/KafkaProducerPort";

export class KafkaActionEventPublisherAdapter implements ActionEventPublisher {
  constructor(private readonly kafkaProducer: KafkaProducerPort) {}

  async publishActionCreated(action: Action): Promise<void> {
    await this.kafkaProducer.publish("actions", {
      type: "ActionCreated",
      payload: {
        id: action.id,
        type: action.type,
        payload: action.payload,
        createdAt: action.createdAt.toISOString(),
      },
    });
  }
}
