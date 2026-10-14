export const GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT =
  'globalPolicy-adminCommunicationGrant';
export const GLOBAL_POLICY_ADMIN_COMMUNICATION_READ =
  'globalPolicy-adminCommunicationRead';
export const GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS =
  'globalPolicy-conversionGlobalAdmins';
export const GLOBAL_POLICY_ADMIN_STORAGE_GRANT =
  'globalPolicy-adminStorageGrant';
// Resolver-local, hardcoded policies for the user-record family (Kratos
// identity deletion, admin account deletion, and the admin branch of
// `deleteUser`), each scoped to the owning PLATFORM_USERS_ADMIN credential
// alone rather than the shared policy's grant set.
export const GLOBAL_POLICY_ADMIN_IDENTITY_DELETE_KRATOS =
  'globalPolicy-adminIdentityDeleteKratosIdentity';
export const GLOBAL_POLICY_ADMIN_USER_ACCOUNT_DELETE =
  'globalPolicy-adminUserAccountDelete';
export const GLOBAL_POLICY_REGISTRATION_PLATFORM_USERS_ADMIN_DELETE_USER =
  'globalPolicy-registrationPlatformUsersAdminDeleteUser';
// Resolver-local policy for `adminUserEmailChange` /
// `adminUserEmailChangeDriftResolve`, scoped to PLATFORM_USERS_ADMIN alone.
export const GLOBAL_POLICY_ADMIN_USER_EMAIL_CHANGE =
  'globalPolicy-adminUserEmailChange';
// Resolver-local policy for `setPlatformWellKnownVirtualContributor`, scoped
// to PLATFORM_SETTINGS_ADMIN alone.
export const GLOBAL_POLICY_PLATFORM_WELL_KNOWN_VC_SET =
  'globalPolicy-platformWellKnownVirtualContributorSet';
// 027-platform-role-redesign (corr-server-7/corr-server-10 fix): A13's five
// license-plan/license-policy definition mutations checked bare
// CREATE/UPDATE/DELETE against `licensingFramework.authorization`, which
// INHERITS the root policy as its parent — so the root rule's
// `platform-content-full-access` CRUD cascade (T036a) reached these
// surfaces too, a family SC-004's exception does not cover. Pinned to this
// resolver-local, hardcoded IN_MEMORY policy — {platform-settings-admin}
// (`buildLicenseDefinitionPolicy`) — instead of the entity's own
// (cascade-polluted) authorization tree.
export const GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN =
  'globalPolicy-licenseDefinitionAdmin';
