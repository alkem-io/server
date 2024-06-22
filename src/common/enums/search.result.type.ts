import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  SPACE = 'space',
  CHALLENGE = 'challenge', // todo remove
  OPPORTUNITY = 'opportunity', // todo remove
  USER = 'user',
  ORGANIZATION = 'organization',
  USERGROUP = 'usergroup',
  POST = 'post',
  CALLOUT = 'callout',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
});
