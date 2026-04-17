import { TokenService } from "../ports/TokenService";
import { UserRepository } from "../ports/UserRepository";
import { AppError } from "../../shared/errors/AppError";

export class VerifyToken {
  constructor(
    private readonly tokenService: TokenService,
    private readonly users: UserRepository
  ) {}

  async execute(accessToken: string) {
    const payload = this.tokenService.verifyAccessToken(accessToken);

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new AppError("UNAUTHORIZED", "User not found", 401);
    }

    return { user: { id: user.id, email: user.email, name: user.name } };
  }
}
