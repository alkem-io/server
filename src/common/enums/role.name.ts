import { registerEnumType } from '@nestjs/graphql';

export enum RoleName {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
  ASSOCIATE = 'associate',
  OWNER = 'owner',
  GLOBAL_ADMIN = 'global-admin',
  GLOBAL_SUPPORT = 'global-support', // Platform management; can be allowed to act as a SpaceAdmin depending on Space settings
  GLOBAL_LICENSE_MANAGER = 'global-license-manager',
  GLOBAL_COMMUNITY_READER = 'global-community-reader',
  GLOBAL_SPACES_READER = 'global-spaces-reader',
  PLATFORM_BETA_TESTER = 'platform-beta-tester',
  PLATFORM_VC_CAMPAIGN = 'platform-vc-campaign',
}

registerEnumType(RoleName, {
  name: 'RoleName',
});
