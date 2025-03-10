import { CommunityMembershipStatus } from '@common/enums/community.membership.status';

export type RoleSetCommunityMembershipStatus = {
  roleSetId: string;
  membershipStatus: CommunityMembershipStatus;
};
