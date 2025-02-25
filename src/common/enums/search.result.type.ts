import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  SPACE = 'space',
  SUBSPACE = 'subspace',
  USER = 'user',
  ORGANIZATION = 'organization',
  POST = 'post',
  CALLOUT = 'callout',
  WHITEBOARD = 'whiteboard',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
});
