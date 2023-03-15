import { registerEnumType } from '@nestjs/graphql';

export enum CommunityMembershipStatus {
  MEMBER = 'member',
  NOT_MEMBER = 'not-member',
  APPLICATION_PENDING = 'application-pending',
}

registerEnumType(CommunityMembershipStatus, {
  name: 'CommunityMembershipStatus',
});
