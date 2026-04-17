import { UserRepository } from "../../../../../application/ports/UserRepository";
import { User } from "../../../../../domain/entities/User";
import { UserModel } from "../models/UserModel";

function toDomain(doc: any): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
    name: doc.name,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() })
      .select("+passwordHash")
      .exec();
    if (!doc) return null;
    return toDomain(doc);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).exec();
    if (!doc) return null;
    return toDomain(doc);
  }

  async create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const doc = await UserModel.create({
      email: user.email.toLowerCase().trim(),
      passwordHash: user.passwordHash,
      name: user.name,
      isActive: user.isActive,
    });

    const reloaded = await UserModel.findById(doc._id).select("+passwordHash").exec();
    if (!reloaded) {
      throw new Error("Failed to load created user");
    }
    return toDomain(reloaded);
  }
}
