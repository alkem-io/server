import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorModelCardEntryFlagName {
  SPACE_DATA_ACCESS_ABOUT = 'space-data-access-about',
  SPACE_DATA_ACCESS_CONTENT = 'space-data-access-content',
  SPACE_DATA_ACCESS_SUBSPACES = 'space-data-access-subspaces',
  SPACE_CAPABILITY_TAGGING = 'space-capability-tagging',
  SPACE_CAPABILITY_CREATE_CONTENT = 'space-capability-create-content',
  SPACE_CAPABILITY_COMMUNITY_MANAGEMENT = 'space-capability-community-management',
  SPACE_ROLE_MEMBER = 'space-role-member',
  SPACE_ROLE_ADMIN = 'space-role-admin',
}

registerEnumType(VirtualContributorModelCardEntryFlagName, {
  name: 'VirtualContributorModelCardEntryFlagName',
});
