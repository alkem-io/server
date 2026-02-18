import { registerEnumType } from '@nestjs/graphql';

export enum UrlType {
  HOME = 'home',
  SPACE = 'space',
  CALLOUT = 'callout',
  CALLOUTS_SET = 'callouts-set',
  CONTRIBUTION_POST = 'post',
  ORGANIZATION = 'organization',
  USER = 'user',
  VIRTUAL = 'vc',
  CONTRIBUTION_WHITEBOARD = 'whiteboard',
  CONTRIBUTION_MEMO = 'memo',
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
  NOT_AUTHORIZED = 'not-authorized',
  FLOW = 'flow',
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTRATION = 'registration',
  SIGN_UP = 'sign_up',
  VERIFY = 'verify',
  RECOVERY = 'recovery',
  REQUIRED = 'required',
  ERROR = 'error',
  RESTRICTED = 'restricted',
}

registerEnumType(UrlType, {
  name: 'UrlType',
});
