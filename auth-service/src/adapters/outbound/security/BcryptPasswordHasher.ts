import bcrypt from "bcryptjs";
import { PasswordHasher } from "../../../application/ports/PasswordHasher";

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number = 12) {}

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.rounds);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
