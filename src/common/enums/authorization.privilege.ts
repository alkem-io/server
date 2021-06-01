export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  GRANT = 'grant', // allow the issuing / revoking of credentials of the same type within a given scope
}
