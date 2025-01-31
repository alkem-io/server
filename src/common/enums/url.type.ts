import { registerEnumType } from '@nestjs/graphql';

export enum UrlType {
  SPACE = 'space',
  CALLOUT = 'callout',
  CONTRIBUTION_POST = 'post',
  ORGANIZATION = 'organization',
  USER = 'user',
  VIRTUAL_CONTRIBUTOR = 'vc',
  CONTRIBUTION_WHITEBOARD = 'whiteboard',
  FORUM = 'forum',
  INNOVATION_HUB = 'innovation-hub',
  INNOVATION_LIBRARY = 'innovation-library',
  INNOVATION_PACKS = 'innovation-pack',
  ADMIN = 'admin',
}

registerEnumType(UrlType, {
  name: 'UrlType',
});
