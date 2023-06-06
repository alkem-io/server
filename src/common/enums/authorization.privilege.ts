import { registerEnumType } from '@nestjs/graphql';

export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  GRANT = 'grant', // allow the issuing / revoking of credentials of the same type within a given scope
  GRANT_GLOBAL_ADMINS = 'grant-global-admins',
  AUTHORIZATION_RESET = 'authorization-reset',
  ADMIN = 'admin',
  PLATFORM_ADMIN = 'platform-admin', // To determine if the user should have access to the platform administration
  CREATE_CANVAS = 'create-canvas',
  CREATE_CHALLENGE = 'create-challenge',
  CREATE_ASPECT = 'create-aspect',
  CREATE_MESSAGE = 'create-message',
  CREATE_MESSAGE_REPLY = 'create-message-reply',
  CREATE_MESSAGE_REACTION = 'create-message-reaction',
  CREATE_DISCUSSION = 'create-discussion',
  CONTRIBUTE = 'contribute',
  CREATE_HUB = 'create-hub',
  CREATE_ORGANIZATION = 'create-organization',
  FILE_UPLOAD = 'file-upload',
  FILE_DELETE = 'file-delete',
  READ_USERS = 'read-users',
  UPDATE_CANVAS = 'update-canvas',
  UPDATE_INNOVATION_FLOW = 'update-lifecycle',
  COMMUNITY_JOIN = 'community-join',
  COMMUNITY_APPLY = 'community-apply',
  COMMUNITY_INVITE = 'community-invite',
  COMMUNITY_ADD_MEMBER = 'community-add-member', // only for global admins
  COMMUNITY_CONTEXT_REVIEW = 'community-context-review',
  CREATE_CALLOUT = 'create-callout',
  UPDATE_CALLOUT_PUBLISHER = 'update-callout-publisher',
  CREATE_RELATION = 'create-relation',
  CREATE_OPPORTUNITY = 'create-opportunity',
  MOVE_CARD = 'move-card',
}

registerEnumType(AuthorizationPrivilege, {
  name: 'AuthorizationPrivilege',
});
