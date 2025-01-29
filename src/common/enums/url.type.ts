import { registerEnumType } from '@nestjs/graphql';

export enum UrlType {
  SPACE = 'space',
  CALLOUT = 'callout',
  CONTRIBUTION_POST = 'post',
  ORGANIZATION = 'organization',
  USER = 'user',
  VIRTUAL_CONTRIBUTOR = 'vc',
  CONTRIBUTION_WHITEBOARD = 'whiteboard',
}

registerEnumType(UrlType, {
  name: 'UrlType',
});
