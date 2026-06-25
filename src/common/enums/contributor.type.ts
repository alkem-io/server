import { registerEnumType } from '@nestjs/graphql';

export enum ContributorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
}

registerEnumType(ContributorType, {
  name: 'ContributorType',
  description:
    'The type of a contributor in a contributor-collection callout framing.',
});
