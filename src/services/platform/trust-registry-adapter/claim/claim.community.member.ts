import { SystemClaims } from './claim.enum';
import { IClaim } from './claim.interface';

// The initial idea was to perform validations in the resolvers and derive the claim
export class CommunityMemberClaim implements IClaim {
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
