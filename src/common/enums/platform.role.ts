import { registerEnumType } from '@nestjs/graphql';

export enum PlatformRole {
  GLOBAL_ADMIN = 'global-admin',
  SUPPORT = 'support',
  COMMUNITY_READER = 'community-reader',
  BETA_TESTER = 'beta-tester',
}

registerEnumType(PlatformRole, {
  name: 'PlatformRole',
});
