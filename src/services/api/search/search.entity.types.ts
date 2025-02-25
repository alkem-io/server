import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultTypes {
  USER = 'user',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  SUBSPACE = 'subspace',
  POST = 'post',
  CALLOUT = 'callout',
  WHITEBOARD = 'whiteboard',
}

registerEnumType(SearchResultTypes, {
  name: 'SearchResultTypes',
  description: 'The different types of available search results.',
});
