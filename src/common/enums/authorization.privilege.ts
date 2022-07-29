import { registerEnumType } from '@nestjs/graphql';

export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  GRANT = 'grant', // allow the issuing / revoking of credentials of the same type within a given scope
  CREATE_CANVAS = 'create-canvas',
  CREATE_ASPECT = 'create-aspect',
  CREATE_COMMENT = 'create-comment',
  CREATE_HUB = 'create-hub',
  CREATE_ORGANIZATION = 'create-organization',
  READ_USERS = 'read-users',
  UPDATE_CANVAS = 'update-canvas',
  UPDATE_LIFECYCLE = 'update-lifecycle',
  COMMUNITY_JOIN = 'community-join',
  COMMUNITY_APPLY = 'community-apply',
  COMMUNITY_CONTEXT_REVIEW = 'community-context-review',
}

registerEnumType(AuthorizationPrivilege, {
  name: 'AuthorizationPrivilege',
});
