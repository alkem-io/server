import { registerEnumType } from '@nestjs/graphql';

export enum PlatformRole {
  GLOBAL_ADMIN = 'global-admin',
  SUPPORT = 'support', // Platform management; can be allowed to act as a SpaceAdmin depending on Space settings
  LICENSE_MANAGER = 'license-manager',
  COMMUNITY_READER = 'community-reader',
  SPACES_READER = 'spaces-reader',
  BETA_TESTER = 'beta-tester',
}

registerEnumType(PlatformRole, {
  name: 'PlatformRole',
});
