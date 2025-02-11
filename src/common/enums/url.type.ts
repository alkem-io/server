import { registerEnumType } from '@nestjs/graphql';

export enum UrlType {
  HOME = 'home',
  SPACE = 'space',
  CALLOUT = 'callout',
  CALLOUTS_SET = 'callouts-set',
  CONTRIBUTION_POST = 'post',
  ORGANIZATION = 'organization',
  USER = 'user',
  VIRTUAL_CONTRIBUTOR = 'vc',
  CONTRIBUTION_WHITEBOARD = 'whiteboard',
  FORUM = 'forum',
  DISCUSSION = 'discussion',
  SPACE_EXPLORER = 'spaces',
  INNOVATION_HUB = 'innovation-hub',
  INNOVATION_LIBRARY = 'innovation-library',
  INNOVATION_PACKS = 'innovation-pack',
  ADMIN = 'admin',
  UNKNOWN = 'unknown',
}

registerEnumType(UrlType, {
  name: 'UrlType',
});
