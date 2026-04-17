import { TokenHasher } from "../../../application/ports/TokenHasher";
import { hashRefreshToken } from "./refreshTokenHash";

export class CryptoSha256TokenHasher implements TokenHasher {
  hash(value: string): string {
    return hashRefreshToken(value);
  }
}
