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
// widening of PLATFORM_ROLES_ASSIGN to PLATFORM_ROLES_ADMIN on the shared
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
// 027-platform-role-redesign (sec-server-7 fix): the sec-server-4 pin above
// covered three of the four A4/A5 surfaces sharing the widened
// PLATFORM_USERS_ADMIN privilege (identity delete, account delete,
// registration delete) but missed the fourth — `adminUserEmailChange` /
// `adminUserEmailChangeDriftResolve` — which kept checking the SHARED
// policy directly. That policy's PLATFORM_USERS_ADMIN grant set includes
// GLOBAL_PLATFORM_MANAGER, which never held the pre-feature PLATFORM_ADMIN
// gate on these two mutations. Pinned to A4's own pre-feature reacher set
// {GA, GS, GLM} plus the new owning role, GLOBAL_PLATFORM_MANAGER dropped.
export const GLOBAL_POLICY_ADMIN_USER_EMAIL_CHANGE =
  'globalPolicy-adminUserEmailChange';
// 027-platform-role-redesign (sec-server-23 fix): the SAME union-widening
// defect as sec-server-4/-7, one family further along. A10's surfaces were
// consolidated onto ONE `PLATFORM_SETTINGS_ADMIN` privilege, but they did
// not all share a pre-feature gate: most were already on
// PLATFORM_SETTINGS_ADMIN (pre-feature reachers {GA, GPM}), while
// `setPlatformWellKnownVirtualContributor` was on the PLATFORM_ADMIN
// catch-all (pre-feature reachers {GA, GS, GLM}). Consolidation therefore
// hands each surface the UNION — and GLOBAL_PLATFORM_MANAGER gains a
// mutation it never held. Pinned to THIS surface's own pre-feature reacher
// set plus the new owning role; GLOBAL_PLATFORM_MANAGER dropped.
export const GLOBAL_POLICY_PLATFORM_WELL_KNOWN_VC_SET =
  'globalPolicy-platformWellKnownVirtualContributorSet';
// 027-platform-role-redesign (corr-server-7/corr-server-10 fix): A13's five
// license-plan/license-policy definition mutations checked bare
// CREATE/UPDATE/DELETE against `licensingFramework.authorization`, which
// INHERITS the root policy as its parent — so the root rule's
// `platform-content-full-access` CRUD cascade (T036a) reached these
// surfaces too, a family SC-004's exception does not cover. Pinned to this
// resolver-local, hardcoded IN_MEMORY policy — {platform-settings-admin,
// global-admin, global-license-manager, global-platform-manager} — instead
// of the entity's own (cascade-polluted) authorization tree. GLOBAL_ADMIN
// is included here (corr-server-10): it reached A13 today only via the
// root cascade, an implicit reach the census's `legacyReachers` omitted
// entirely; declaring it here makes it an explicit, intentional grant
// rather than an accident of inheritance.
export const GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN =
  'globalPolicy-licenseDefinitionAdmin';
