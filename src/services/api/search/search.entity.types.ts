import { registerEnumType } from '@nestjs/graphql';

export enum SearchEntityTypes {
  USER = 'user',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  SUBSPACE = 'subspace',
  POST = 'post',
  CALLOUT = 'callout',
  WHITEBOARD = 'whiteboard',
}

registerEnumType(SearchEntityTypes, {
  name: 'SearchResultType',
  description: 'The different types of available search results.',
});
