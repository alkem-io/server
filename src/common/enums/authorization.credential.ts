import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
export enum AuthorizationCredential {
  GLOBAL_ANONYMOUS = 'global-anonymous', // credential issued to all non-authenticated interactions
  GLOBAL_GUEST = 'global-guest', // credential issued to guest users (named but limited access)
  GLOBAL_REGISTERED = 'global-registered', // credential issued to all registered users
  PLATFORM_OPERATIONS_ADMIN = 'platform-operations-admin', // operational & maintenance actions on the platform

  // --- 027-platform-role-redesign: target role model ---
  // Same 12 identifiers as RoleName, verbatim (research D2) — the canonical
  // map (platform.roles.access.service.ts) asserts they are string-identical.
  //
  // T077 (Slice B) removed the ten legacy global credentials outright, with no
  // `@deprecated` window (FR-029): a working legacy value is a live legacy
  // grant path, which is precisely what FR-007(d) exists to close. The stored
  // rows are deleted by the 1785000000005-DropLegacyPlatformRoles migration.
  PLATFORM_ROLES_ADMIN = 'platform-roles-admin',
  PLATFORM_CONTENT_FULL_ACCESS = 'platform-content-full-access',
  PLATFORM_RESOURCE_ADMIN = 'platform-resource-admin',
  PLATFORM_SETTINGS_ADMIN = 'platform-settings-admin',
  PLATFORM_USERS_ADMIN = 'platform-users-admin',
  PLATFORM_SUPPORT = 'platform-support',
  PLATFORM_LICENSE_MANAGER = 'platform-license-manager',
  PLATFORM_SPACES_READER = 'platform-spaces-reader',
  PLATFORM_AUDIT_READER = 'platform-audit-reader',
  FEATURE_BETA_TESTER = 'feature-beta-tester',
  FEATURE_VIRTUAL_ASSISTANT = 'feature-virtual-assistant',
  FEATURE_ORGANIZATION_CREATOR = 'feature-organization-creator',

  USER_SELF_MANAGEMENT = 'user-self', // able to update a user

  ACCOUNT_ADMIN = 'account-admin', // implicit, assigned to user / org admins + owners

  SPACE_ADMIN = 'space-admin',
  SPACE_MEMBER = 'space-member',
  SPACE_LEAD = 'space-lead',
  SPACE_SUBSPACE_ADMIN = 'space-subspace-admin', // assigned to admins of a subspace for a space
  SPACE_MEMBER_INVITEE = 'space-invitee', // assigned to users that are invited to join a space / subspace

  ORGANIZATION_OWNER = 'organization-owner', // Able to commit an organization
  ORGANIZATION_ADMIN = 'organization-admin', // Able to administer an organization
  ORGANIZATION_ASSOCIATE = 'organization-associate', // Able to be a part of an organization

  USER_GROUP_MEMBER = 'user-group-member', // Able to be a part of an user group
}

registerEnumType(AuthorizationCredential, {
  name: 'AuthorizationCredential',
});
