import { SystemClaims } from './claim.enum';
import { IClaim } from './claim.interface';

export class AlkemioUserClaim implements IClaim {
  private userID: string;
  private email: string;

  constructor({ email, userID }: { email: string; userID: string }) {
    this.userID = userID;
    this.email = email;
  }

  asClaimObject(): Record<string, any> {
    return {
      [`${SystemClaims.AlkemioUser}_userID`]: this.userID,
      [`${SystemClaims.AlkemioUser}_email`]: this.email,
    };
  }
}
