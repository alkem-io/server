import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  SPACE = 'space',
  SUBSPACE = 'subspace',
  CHALLENGE = 'challenge', // todo remove
  OPPORTUNITY = 'opportunity', // todo remove
  USER = 'user',
  ORGANIZATION = 'organization',
  USERGROUP = 'usergroup',
  POST = 'post',
  CALLOUT = 'callout',
  WHITEBOARD = 'whiteboard',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
});
