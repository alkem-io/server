import { registerEnumType } from '@nestjs/graphql';

export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  GRANT = 'grant', // allow the issuing / revoking of credentials of the same type within a given scope
  GRANT_GLOBAL_ADMINS = 'grant-global-admins',
  AUTHORIZATION_RESET = 'authorization-reset',
  //ADMIN = 'admin',
  PLATFORM_ADMIN = 'platform-admin', // To determine if the user should have access to the platform administration
  CREATE_WHITEBOARD = 'create-whiteboard',
  CREATE_SUBSPACE = 'create-subspace',
  CREATE_POST = 'create-post',
  CREATE_MESSAGE = 'create-message',
  CREATE_MESSAGE_REPLY = 'create-message-reply',
  CREATE_MESSAGE_REACTION = 'create-message-reaction',
  CREATE_DISCUSSION = 'create-discussion',
  CONTRIBUTE = 'contribute',
  CREATE_SPACE = 'create-space',
  CREATE_ORGANIZATION = 'create-organization',
  FILE_UPLOAD = 'file-upload',
  FILE_DELETE = 'file-delete',
  UPDATE_WHITEBOARD = 'update-whiteboard',
  UPDATE_INNOVATION_FLOW = 'update-innovation-flow',
  COMMUNITY_JOIN = 'community-join',
  COMMUNITY_APPLY = 'community-apply',
  COMMUNITY_INVITE = 'community-invite',
  COMMUNITY_INVITE_ACCEPT = 'community-invite-accept',
  COMMUNITY_ADD_MEMBER = 'community-add-member', // only for global admins
  CREATE_CALLOUT = 'create-callout',
  UPDATE_CALLOUT_PUBLISHER = 'update-callout-publisher',
  READ_USERS = 'read-users',
  READ_USER_PII = 'read-user-pii',
  READ_USER_SETTINGS = 'read-user-settings',
  MOVE_POST = 'move-post',
  MOVE_CONTRIBUTION = 'move-contribution',
  ACCESS_INTERACTIVE_GUIDANCE = 'access-interactive-guidance',
  ACCESS_VIRTUAL_CONTRIBUTOR = 'access-virtual-contributor',
  ACCESS_DASHBOARD_REFRESH = 'access-dashboard-refresh',
  CREATE_WHITEBOARD_RT = 'create-whiteboard-rt',
  UPDATE_CONTENT = 'update-content',
  SAVE_AS_TEMPLATE = 'save-as-template',
}

registerEnumType(AuthorizationPrivilege, {
  name: 'AuthorizationPrivilege',
});
