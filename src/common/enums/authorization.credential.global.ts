export enum AuthorizationCredentialGlobal {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_ADMIN_CHALLENGES = 'global-admin-challenges', // able to create challenges / ecoverses / opportunities
  GLOBAL_ADMIN_COMMUNITY = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users
}
