import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GlobalAdmin = 'global-admin', // able to do everything, god mode
  GlobalAdminChallenges = 'global-admin-challenges', // able to create challenges / ecoverses / opportunities
  GlobalAdminCommunity = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GlobalRegistered = 'global-registered', // credential issued to all registered users
  CommunityMember = 'community-member', // Able to be a part of a community
  OrganisationMember = 'organisation-member', // Able to be a part of an organisation
  UserGroupMember = 'user-group-member', // Able to be a part of an user group
  //UserUpdate = 'user-update', // able to update a user
  // ChallengeAdmin = 'challenge-admin', // able to manage all aspects of a particular Ecoverse
  // ChallengeCommunityAdmin = 'challenge-community-admin', // Able to manage membership of a particular community
  // ChallengeContextAdmin = 'challenge-context-admin', // Able to update the context information for a Challenge
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
