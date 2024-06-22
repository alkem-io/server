import { registerEnumType } from '@nestjs/graphql';

export enum CommunityContributorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL = 'virtual',
}

registerEnumType(CommunityContributorType, {
  name: 'CommunityContributorType',
});
