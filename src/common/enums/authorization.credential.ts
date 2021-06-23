import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GlobalAdmin = 'global-admin', // able to do everything, god mode
  GlobalAdminChallenges = 'global-admin-challenges', // able to create challenges / ecoverses / opportunities
  GlobalAdminCommunity = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GlobalRegistered = 'global-registered', // credential issued to all registered users
  EcoverseAdmin = 'ecoverse-admin',
  EcoverseHost = 'ecoverse-host', // host for an ecoverse; can only be one...
  EcoverseMember = 'ecoverse-member',
  ChallengeAdmin = 'challenge-admin',
  ChallengeMember = 'challenge-member',
  ChallengeLead = 'challenge-lead', // For organisations that are leads of a challenge
  OpportunityMember = 'opportunity-member',
  OrganisationAdmin = 'organisation-admin', // Able to administer an organisation
  OrganisationMember = 'organisation-member', // Able to be a part of an organisation
  UserGroupMember = 'user-group-member', // Able to be a part of an user group
  UserSelfManagement = 'user-self', // able to update a user
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
