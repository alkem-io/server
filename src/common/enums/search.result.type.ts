import { registerEnumType } from '@nestjs/graphql';

export enum SearchResultType {
  SPACE = 'space',
  USER = 'user',
  ORGANIZATION = 'organization',
  USERGROUP = 'usergroup',
  POST = 'post',
  CALLOUT = 'callout',
}

registerEnumType(SearchResultType, {
  name: 'SearchResultType',
});
