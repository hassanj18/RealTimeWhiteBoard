import { Action } from "../entities/Action";
import { ActionEventPublisher } from "../ports/ActionEventPublisher";
import { ActionRepository } from "../ports/ActionRepository";
import { AppError } from "../../shared/errors/AppError";

export type CreateActionCommand = {
  type: string;
  payload: Record<string, unknown>;
};

export class CreateAction {
  constructor(
    private readonly actions: ActionRepository,
    private readonly publisher: ActionEventPublisher
  ) {}

  async execute(cmd: CreateActionCommand) {
    const type = cmd.type.trim();
    if (!type) {
      throw new AppError("VALIDATION_ERROR", "type is required", 400);
    }

    const action: Action = {
      id: crypto.randomUUID(),
      type,
      payload: cmd.payload ?? {},
      createdAt: new Date(),
    };

    await this.actions.create(action);
    await this.publisher.publishActionCreated(action);

    return action;
  }
}
