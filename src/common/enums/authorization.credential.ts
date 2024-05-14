import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_SUPPORT = 'global-support', // able to manage platform level information, can per space have admin rights
  GLOBAL_LICENSE_MANAGER = 'global-license-manager', // able to manage platform level information, can per space have admin rights
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users
  GLOBAL_COMMUNITY_READ = 'global-community-read', // able to view all details of the top level community
  GLOBAL_SPACES_READER = 'global-spaces-read', // able to view all details of the top level community

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
