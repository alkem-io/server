import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_ADMIN_COMMUNITY = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GLOBAL_ADMIN_HUBS = 'global-admin-hubs', // able to manage the top level hubs, including assigning credentials except global admin ones
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users

  USER_SELF_MANAGEMENT = 'user-self', // able to update a user

  HUB_ADMIN = 'hub-admin',
  HUB_HOST = 'hub-host', // host for an hub; can only be one...
  HUB_MEMBER = 'hub-member',

  CHALLENGE_ADMIN = 'challenge-admin',
  CHALLENGE_MEMBER = 'challenge-member',
  CHALLENGE_LEAD = 'challenge-lead',

  OPPORTUNITY_MEMBER = 'opportunity-member',
  OPPORTUNITY_ADMIN = 'opportunity-admin',
  OPPORTUNITY_LEAD = 'opportunity-lead',

  ORGANIZATION_OWNER = 'organization-owner', // Able to commit an organization
  ORGANIZATION_ADMIN = 'organization-admin', // Able to administer an organization
  ORGANIZATION_ASSOCIATE = 'organization-associate', // Able to be a part of an organization

  USER_GROUP_MEMBER = 'user-group-member', // Able to be a part of an user group
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
