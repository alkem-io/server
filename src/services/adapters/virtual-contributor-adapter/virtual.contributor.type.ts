import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorType {
  COMMUNITY_MANAGER = 'community-manager',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
}

registerEnumType(VirtualContributorType, {
  name: 'VirtualContributorType',
});
