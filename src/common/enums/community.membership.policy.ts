import { registerEnumType } from '@nestjs/graphql';

export enum CommunityMembershipPolicy {
  OPEN = 'open',
  INVITATIONS = 'invitations',
  APPLICATIONS = 'applications',
}

registerEnumType(CommunityMembershipPolicy, {
  name: 'CommunityMembershipPolicy',
});
