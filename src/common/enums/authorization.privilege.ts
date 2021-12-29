import { registerEnumType } from '@nestjs/graphql';

export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  GRANT = 'grant', // allow the issuing / revoking of credentials of the same type within a given scope
  CREATE_CANVAS = 'create-canvas',
  CREATE_HUB = 'ceate-hub',
  CREATE_ORGANIZATION = 'create-organization',
  READ_USERS = 'read-search',
}

registerEnumType(AuthorizationPrivilege, {
  name: 'AuthorizationPrivilege',
});
