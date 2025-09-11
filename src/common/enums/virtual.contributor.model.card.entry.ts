import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorModelCardEntry {
  SPACE_CAPABILITIES = 'space-capabilities',
  SPACE_DATA_ACCESS = 'space-data-access',
  SPACE_ROLE_REQUIRED = 'space-role-required',
}

registerEnumType(VirtualContributorModelCardEntry, {
  name: 'VirtualContributorModelCardEntry',
});
