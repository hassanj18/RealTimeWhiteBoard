import { JtiGenerator } from "../../../application/ports/JtiGenerator";
import { generateJti } from "./jti";

export class CryptoJtiGenerator implements JtiGenerator {
  generate(): string {
    return generateJti();
  }
}
