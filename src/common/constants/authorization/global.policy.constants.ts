export const GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN =
  'globalPolicy-adminAuthorizationGrantGlobalAdmin';
export const GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT =
  'globalPolicy-adminCommunicationGrant';
export const GLOBAL_POLICY_ADMIN_COMMUNICATION_READ =
  'globalPolicy-adminCommunicationRead';
export const GLOBAL_POLICY_CONVERSION_GLOBAL_ADMINS =
  'globalPolicy-conversionGlobalAdmins';
export const GLOBAL_POLICY_ADMIN_STORAGE_GRANT =
  'globalPolicy-adminStorageGrant';
// 027-platform-role-redesign (sec-server-2/corr-server-1 fix): the legacy
// `global-*` role branch of assign/removePlatformRoleFromUser is pinned to
// this resolver-local, hardcoded [GLOBAL_ADMIN] policy — mirrors the FR-022
// pin in admin.authorization.resolver.mutations.ts (T034a) — so that T034's
// widening of GRANT_GLOBAL_ADMINS to PLATFORM_ROLES_ADMIN on the shared
// roleSet.authorization cannot reach legacy role assignment.
export const GLOBAL_POLICY_PLATFORM_ROLE_LEGACY_GRANT_GLOBAL_ADMIN =
  'globalPolicy-platformRoleLegacyGrantGlobalAdmin';
// 027-platform-role-redesign (spec-server-1 fix follow-through): once the
// root content rule cascades DELETE platform-wide (FR-004, ninth analyze
// pass), `user.authorization`'s plain DELETE privilege is ALSO held by
// `platform-content-full-access` — a reach A5/SC-004 does not accept (the
// accepted exception is closed at A6/A7 only). `deleteUser`'s legacy-admin
// branch is pinned to this resolver-local, hardcoded [GLOBAL_ADMIN] policy
// instead, so the root rule's widening cannot let Content Full Access
// delete arbitrary user accounts.
export const GLOBAL_POLICY_REGISTRATION_LEGACY_ADMIN_DELETE_USER =
  'globalPolicy-registrationLegacyAdminDeleteUser';
// 027-platform-role-redesign (corr-server-6 fix): re-gating
// `updateSpacePlatformSettings` from `PLATFORM_ADMIN` to `ACCOUNT_LICENSE_MANAGE`
// (T048/A14) additively handed `platform-license-manager` the space `nameID`
// rename too — a capability spec.md states no global role reaches (A17,
// FR-020). When `nameID` is present, an ADDITIONAL check against this
// resolver-local, hardcoded-to-[GLOBAL_ADMIN, GLOBAL_SUPPORT] policy
// preserves exactly the pre-existing reach (the two legacy credentials that
// already held this capability) without extending it to the newly-added
// platform-license-manager.
export const GLOBAL_POLICY_SPACE_LEGACY_NAMEID_RENAME =
  'globalPolicy-spaceLegacyNameIdRename';
// 027-platform-role-redesign (sec-server-4 fix): consolidating A4 (email
// change) and A5 (identity/account deletion) onto ONE `PLATFORM_USERS_ADMIN`
// privilege whose grant set is the UNION of both surfaces' prior legacy
// reachers hands each surface reachers it never had (e.g. global-support
// gaining irreversible identity deletion). These three resolver-local,
// hardcoded policies restore each SURFACE's own pre-feature reacher set —
// mirrors the T034a FR-022 pin shape, applied per-surface instead of
// per-privilege.
export const GLOBAL_POLICY_ADMIN_IDENTITY_DELETE_KRATOS =
  'globalPolicy-adminIdentityDeleteKratosIdentity';
export const GLOBAL_POLICY_ADMIN_USER_ACCOUNT_DELETE =
  'globalPolicy-adminUserAccountDelete';
export const GLOBAL_POLICY_REGISTRATION_PLATFORM_USERS_ADMIN_DELETE_USER =
  'globalPolicy-registrationPlatformUsersAdminDeleteUser';
