import { SystemClaims } from './claim.enum';

export interface IClaim {
  asClaimObject(): Record<string, any>;
}

// The initial idea was to perform validations in the resolvers and derive the claim
export class ReadCommunityClaim implements IClaim {
  private communityID: string;

  constructor({ communityID }: { communityID: string }) {
    this.communityID = communityID;
  }

  asClaimObject(): Record<string, any> {
    return {
      [`${SystemClaims.CommunityMember}_communityID`]: this.communityID,
    };
  }
}

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
