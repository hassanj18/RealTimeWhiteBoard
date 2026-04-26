import { Action } from "../entities/Action";

export interface ActionEventPublisher {
  publishActionCreated(action: Action): Promise<void>;
}
