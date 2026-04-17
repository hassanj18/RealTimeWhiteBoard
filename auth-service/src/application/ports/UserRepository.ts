import { User } from "../../domain/entities/User";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
}
