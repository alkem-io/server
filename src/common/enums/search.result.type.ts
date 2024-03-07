import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  USER = 'user',
  ORGANIZATION = 'organization',
  USERGROUP = 'usergroup',
  POST = 'post',
  CALLOUT = 'callout',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
});
