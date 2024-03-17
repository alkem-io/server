import { registerEnumType } from '@nestjs/graphql';

export enum CommunityMembershipPolicy {
  OPEN = 'open',
  INVITATIONS = 'invitations',
  APPLICATIONS = 'applications',
  INHERIT = 'inherit',
}

registerEnumType(CommunityMembershipPolicy, {
  name: 'CommunityMembershipPolicy',
});
