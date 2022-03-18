import { Claim } from './claim.enum';
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
      [`${Claim.AlkemioUser}_userID`]: this.userID,
      [`${Claim.AlkemioUser}_email`]: this.email,
    };
  }
}
