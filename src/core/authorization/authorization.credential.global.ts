export enum AuthorizationCredentialGlobal {
  GlobalAdmin = 'global-admin', // able to do everything, god mode
  GlobalAdminChallenges = 'global-admin-challenges', // able to create challenges / ecoverses / opportunities
  GlobalAdminCommunity = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GlobalRegistered = 'global-registered', // credential issued to all registered users
}
