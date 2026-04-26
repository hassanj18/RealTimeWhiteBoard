import { Action } from "../../../core/entities/Action";
import { ActionEventPublisher } from "../../../core/ports/ActionEventPublisher";

export class NoopActionEventPublisher implements ActionEventPublisher {
  async publishActionCreated(_action: Action): Promise<void> {
    return;
  }
}
