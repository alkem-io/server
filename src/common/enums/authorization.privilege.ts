export enum AuthorizationPrivilege {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  CREDENTIALS = 'credentials', // allow the issuing / revoking of credentials
}
