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
  CONTRIBUTORS_EXPLORER = 'contributors',
  INNOVATION_HUB = 'innovation-hub',
  INNOVATION_LIBRARY = 'innovation-library',
  INNOVATION_PACKS = 'innovation-pack',
  ADMIN = 'admin',
  DOCUMENTATION = 'documentation',
  UNKNOWN = 'unknown',
  FLOW = 'flow',
}

registerEnumType(UrlType, {
  name: 'UrlType',
});
