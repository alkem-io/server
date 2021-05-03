export enum AuthorizationCredentials {
  GlobalAdmin = 'global-admin', // able to do everything, god mode
  GlobalAdminEcoverse = 'global-admin-ecoverse', // able to create ecoverses
  GlobalAdminCommunity = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GlobalRegistered = 'global-registered', // credential issued to all registered users
  ChallengeAdmin = 'challenge-admin', // able to manage all aspects of a particular Ecoverse
  ChallengeMember = 'challenge-community-member', // Able to be a part of a community
  ChallengeCommunityAdmin = 'challenge-community-admin', // Able to manage membership of a particular community
  ChallengeContextAdmin = 'challenge-context-admin', // Able to update the context information for a Challenge
}
