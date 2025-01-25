import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GLOBAL_ADMIN = 'global-admin', // able to do everything, god mode
  GLOBAL_SUPPORT = 'global-support', // able to manage platform level information, can per space have admin rights
  GLOBAL_LICENSE_MANAGER = 'global-license-manager', // able to manage platform level information, can per space have admin rights
  GLOBAL_ANONYMOUS = 'global-anonymous', // credential issued to all non-authenticated interactions
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users
  GLOBAL_COMMUNITY_READ = 'global-community-read', // able to view all details of the top level community
  GLOBAL_SPACES_READER = 'global-spaces-read', // able to view all details of the top level community

  USER_SELF_MANAGEMENT = 'user-self', // able to update a user

  ACCOUNT_ADMIN = 'account-admin', // implicit, assigned to user / org admins + owners

  SPACE_ADMIN = 'space-admin',
  SPACE_MEMBER = 'space-member',
  SPACE_LEAD = 'space-lead',
  SPACE_SUBSPACE_ADMIN = 'space-subspace-admin', // assigned to admins of a subspace for a space

  ORGANIZATION_OWNER = 'organization-owner', // Able to commit an organization
  ORGANIZATION_ADMIN = 'organization-admin', // Able to administer an organization
  ORGANIZATION_ASSOCIATE = 'organization-associate', // Able to be a part of an organization

  USER_GROUP_MEMBER = 'user-group-member', // Able to be a part of an user group

  // Roles to allow easier management of users
  BETA_TESTER = 'beta-tester',
  VC_CAMPAIGN = 'vc-campaign',
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
