import { Claim } from './claim.enum';
import { IClaim } from './claim.interface';

// The initial idea was to perform validations in the resolvers and derive the claim
export class CommunityMemberClaim implements IClaim {
  private communityID: string;
  private communityDisplayName: string;

  constructor({
    communityID,
    communityDisplayName,
  }: {
    communityID: string;
    communityDisplayName: string;
  }) {
    this.communityID = communityID;
    this.communityDisplayName = communityDisplayName;
  }

  asClaimObject(): Record<string, any> {
    return {
      [`${Claim.CommunityMember}_communityID`]: this.communityID,
      [`${Claim.CommunityMember}_communityDisplayName`]:
        this.communityDisplayName,
    };
  }
}
