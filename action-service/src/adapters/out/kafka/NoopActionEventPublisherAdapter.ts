import { Action } from "../../../core/entities/Action";
import { ActionEventPublisher } from "../../../core/ports/ActionEventPublisher";

export class NoopActionEventPublisherAdapter implements ActionEventPublisher {
  async publishActionCreated(action: Action): Promise<void> {
    // Do nothing - for testing/development when Kafka is not available
    console.log(`NoopActionEventPublisher: Would publish ActionCreated for action ${action.id}`);
  }
}
