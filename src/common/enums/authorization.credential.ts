import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_ADMIN_COMMUNITY = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users
  ECOVERSE_ADMIN = 'hub-admin',
  ECOVERSE_HOST = 'hub-host', // host for an hub; can only be one...
  ECOVERSE_MEMBER = 'hub-member',
  CHALLENGE_ADMIN = 'challenge-admin',
  CHALLENGE_MEMBER = 'challenge-member',
  CHALLENGE_LEAD = 'challenge-lead', // For organizations that are leads of a challenge
  OPPORTUNITY_MEMBER = 'opportunity-member',

  OPPORTUNITY_ADMIN = 'opportunity-admin',
  ORGANIZATION_OWNER = 'organization-owner', // Able to commit an organization
  ORGANIZATION_ADMIN = 'organization-admin', // Able to administer an organization
  ORGANIZATION_MEMBER = 'organization-member', // Able to be a part of an organization
  USER_GROUP_MEMBER = 'user-group-member', // Able to be a part of an user group
  USER_SELF_MANAGEMENT = 'user-self', // able to update a user
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
