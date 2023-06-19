import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  HUB = 'hub',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  USER = 'user',
  ORGANIZATION = 'organization',
  USERGROUP = 'usergroup',
  POST = 'post',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
});
