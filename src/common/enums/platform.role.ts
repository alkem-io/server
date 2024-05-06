import { registerEnumType } from '@nestjs/graphql';

export enum PlatformRole {
  GLOBAL_ADMIN = 'global-admin',
  SUPPORT = 'support',
  LICENSE_MANAGER = 'license-manager',
  COMMUNITY_READER = 'community-reader',
  SPACES_READER = 'spaces-reader',
  BETA_TESTER = 'beta-tester',
}

registerEnumType(PlatformRole, {
  name: 'PlatformRole',
});
