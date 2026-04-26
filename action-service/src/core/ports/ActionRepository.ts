import { Action } from "../entities/Action";

export interface ActionRepository {
  create(action: Action): Promise<void>;
  list(limit: number): Promise<Action[]>;
}
