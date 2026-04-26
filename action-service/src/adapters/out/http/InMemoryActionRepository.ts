import { Action } from "../../../core/entities/Action";
import { ActionRepository } from "../../../core/ports/ActionRepository";

export class InMemoryActionRepository implements ActionRepository {
  private readonly items: Action[] = [];

  async create(action: Action): Promise<void> {
    this.items.unshift(action);
  }

  async list(limit: number): Promise<Action[]> {
    return this.items.slice(0, limit);
  }
}
