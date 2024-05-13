import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_ADMIN_COMMUNITY = 'global-admin-community', // able to manage the top level community, including assigning credentials
  GLOBAL_ADMIN_SPACES = 'global-admin-spaces', // able to manage the top level spaces, including assigning credentials except global admin ones
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users

  USER_SELF_MANAGEMENT = 'user-self', // able to update a user

  ACCOUNT_HOST = 'account-host',

  SPACE_ADMIN = 'space-admin',
  SPACE_MEMBER = 'space-member',
  SPACE_LEAD = 'space-lead',

  ORGANIZATION_OWNER = 'organization-owner', // Able to commit an organization
  ORGANIZATION_ADMIN = 'organization-admin', // Able to administer an organization
  ORGANIZATION_ASSOCIATE = 'organization-associate', // Able to be a part of an organization

  USER_GROUP_MEMBER = 'user-group-member', // Able to be a part of an user group

  // Library related credentials
  INNOVATION_PACK_PROVIDER = 'innovation-pack-provider',

  BETA_TESTER = 'beta-tester',
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
