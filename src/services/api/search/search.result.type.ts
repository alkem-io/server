import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  USER = 'user',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  SUBSPACE = 'subspace',
  POST = 'post',
  CALLOUT = 'callout',
  WHITEBOARD = 'whiteboard',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
  description: 'The different types of available search results.',
});
