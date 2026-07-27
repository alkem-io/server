import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import type { TreeId } from './cascade.model';

/**
 * 027-platform-role-redesign (T040c) — the privileges whose GRANT SET this
 * feature's re-anchoring tasks (T034-T040a) write, mirrored as data. This is
 * a DECLARATION of the mechanism, deliberately separate from the code that
 * installs it — the per-policy grant-set specs (T070f, not built this wave)
 * are what prove the declaration matches the credential rules actually
 * written; this file is not itself that proof.
 *
 * `ManagedPrivilege` is a DELIBERATELY HAND-MAINTAINED closed union — unlike
 * `SCANNED_PRIVILEGES` in `surface.drift.spec.ts` (T052a), which MUST be
 * derived from the census, this one is the mirror of a fixed set of
 * authoring tasks (T034-T040a) and has no runtime source to derive it from.
 *
 * It MUST include `GRANT_GLOBAL_ADMINS` even though it is not one of D4's
 * eleven NEW privileges (`authorization.privilege.ts`) — T034 widens its
 * grant set to include `platform-roles-admin`, it gates all six A1 surfaces
 * (the two `*PlatformRole*` mutations plus the four FR-022 credential
 * mutations pinned away from it by T034a), and a union restricted to "this
 * feature's new privileges" is exactly the mistake that left it out of
 * every closed inventory for twelve analyze passes (fifteenth pass, closing
 * C1). Do NOT narrow this back to `D4Privilege | 'GRANT_GLOBAL_ADMINS'` —
 * that is the same hand-appended-union defect at smaller scale.
 *
 * `MOVE_POST` is deliberately ABSENT: `post.service.authorization.ts` grants
 * it to `platform-resource-admin`, but no resolver mutation currently checks
 * it (`post.dto.move.ts` exists with no mutation wired to it) — it is a
 * granted-but-unreachable privilege, not a gate site, so it has no census
 * surface (T040b's A9 resolution) and nothing here to mirror. `UPDATE_NAMEID`
 * is deliberately absent for the SLICE reason T070f documents: Slice A adds
 * only its enum value; its rule and surface arrive at T078 (Slice B).
 */
export type ManagedPrivilege =
  | AuthorizationPrivilege.GRANT_GLOBAL_ADMINS
  | AuthorizationPrivilege.FEATURE_ROLE_ASSIGN
  | AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
  | AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
  | AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
  | AuthorizationPrivilege.PLATFORM_USERS_ADMIN
  | AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
  | AuthorizationPrivilege.PLATFORM_FORUM_MANAGE
  | AuthorizationPrivilege.DELETE_ORGANIZATION
  | AuthorizationPrivilege.PLATFORM_AUDIT_READ
  | AuthorizationPrivilege.SET_SERVICE_PROFILE
  | AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN
  | AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER
  | AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT
  | AuthorizationPrivilege.MOVE_CONTRIBUTION
  | AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER
  | AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE
  | AuthorizationPrivilege.CREATE_ORGANIZATION
  | AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT;

export interface PrivilegeGrant {
  /** Documentation metadata — the authorization tree the credential rule
   * granting this privilege is declared on. NOT consumed by `reachers()`
   * for matching (an explicit grant reaches its surface regardless of the
   * surface's own tree; only CASCADES are tree-scoped) — it exists so a
   * reviewer can find the credential rule without grepping. */
  readonly anchor: TreeId;
  /** Slice B — and Slice A's non-legacy component: the privilege's owning
   * role(s) alone, per `contracts/privilege-map.md`. */
  readonly owningCredentials: readonly AuthorizationCredential[];
  /** Slice A ONLY, additively: legacy credentials that reach the action
   * TODAY, dropped at Slice B (T076/T077). Empty where the privilege is
   * wholly new (no legacy predecessor) — e.g. `FEATURE_ROLE_ASSIGN`. */
  readonly legacyCredentials: readonly AuthorizationCredential[];
}

export const PRIVILEGE_GRANTS: Record<ManagedPrivilege, PrivilegeGrant> = {
  // --- A1 (T034) — GRANT_GLOBAL_ADMINS is pre-existing, re-scoped, not new.
  [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
    legacyCredentials: [AuthorizationCredential.GLOBAL_ADMIN],
  },
  // --- A2 (T034) — wholly new privilege, no legacy predecessor.
  [AuthorizationPrivilege.FEATURE_ROLE_ASSIGN]: {
    anchor: 'role-set',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_USERS_ADMIN,
      AuthorizationCredential.PLATFORM_ROLES_ADMIN,
    ],
    legacyCredentials: [],
  },
  // --- A20 (T034). Legacy reach is via the broad grants FR-007 removes —
  // today's plain READ on the platform role-set, held by every legacy
  // `global-*` credential through the root god-mode rule.
  [AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ]: {
    anchor: 'role-set',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      AuthorizationCredential.PLATFORM_AUDIT_READER,
    ],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ],
  },
  // --- A20b (T034). NOT granted to Roles Admin / Audit Reader here — they
  // reach the Feature holder lists through PLATFORM_ROLE_HOLDERS_READ by
  // subsumption (research D9), asserted via the gate's `anyOf`, not here.
  [AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ],
  },
  // --- A7/A8's platform-side branch, and the root rule's own replacement
  // grant (T036). `global-support` reaches this too in Slice A, but NOT via
  // this credential rule — via its OWN platform-subtree cascade
  // (`cascade.model.ts`'s `globalSupportPlatformSubtree`), which does not
  // reach the other six root-inheritors. The root rule's own credential
  // list additionally carries `global-admin`/`global-support` directly
  // (`cascade.model.ts`'s `ROOT_CASCADE.credentialsBySlice.A`) — declared
  // there, not duplicated here, since this privilege's reachability is
  // ENTIRELY cascade-carried (no separate non-root grant exists for it).
  [AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS]: {
    anchor: 'root',
    owningCredentials: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
  },
  // --- A4/A5 (T035, T061/T062). Grant set is the UNION of A4's legacy
  // reachers (today's PLATFORM_ADMIN: GA/GS/GLM) and A5's (today's
  // PLATFORM_SETTINGS_ADMIN: adds GLOBAL_PLATFORM_MANAGER).
  [AuthorizationPrivilege.PLATFORM_USERS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
      AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
    ],
  },
  // --- A7 (T037). Wholly new capability (research C2) — the only
  // PLATFORM-side path to it today is the root god-mode grant, which T036
  // does not extend to CREATE/UPDATE/DELETE, so there is no legacy reacher.
  [AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
    legacyCredentials: [],
  },
  // --- A15 forum (T035). Mirrors the reach of the `global-support`
  // platform-subtree cascade it replaces (research D4/D6).
  [AuthorizationPrivilege.PLATFORM_FORUM_MANAGE]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
  },
  // --- A6 delete half (T039).
  [AuthorizationPrivilege.DELETE_ORGANIZATION]: {
    anchor: 'organization',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
  },
  // --- A19 (T035). Read-only, held by no other role.
  [AuthorizationPrivilege.PLATFORM_AUDIT_READ]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_AUDIT_READER],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ],
  },
  // --- A21 (T035).
  [AuthorizationPrivilege.SET_SERVICE_PROFILE]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ],
  },
  // --- A10 (T035/T045) + A13 definition half (T040) share this privilege
  // at two different anchors (`platform` for A10, `licensing-framework` for
  // A13) with slightly different legacy compositions (the licensing-
  // framework rule additionally carries GLOBAL_PLATFORM_MANAGER and omits a
  // direct GLOBAL_ADMIN entry — GLOBAL_ADMIN reaches it there via the root
  // cascade's CRUD instead). `anchor` names the primary (A10) declaration;
  // the licensing-framework rule is `licensing.framework.service.
  // authorization.ts`'s `licensings` credential rule.
  [AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ],
  },
  // --- A9 (T037).
  [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
  },
  [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
  },
  // --- A9 (T038). `callout.contribution.service.authorization.ts` grants
  // it to `platform-resource-admin` directly PLUS whatever credentials the
  // space's own `platformRolesAccess` array carries with UPDATE — the
  // legacy reach is therefore INDIRECT (propagated per-space), not a flat
  // global credential list. `global-admin` is declared here as the
  // practical legacy reacher (it is a member of every space's
  // `platformRolesAccess` today) — a simplification `reachability.spec.ts`
  // (T070m, not built this wave) should re-verify against the live
  // propagation code before relying on it.
  [AuthorizationPrivilege.MOVE_CONTRIBUTION]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    legacyCredentials: [AuthorizationCredential.GLOBAL_ADMIN],
  },
  // --- A8 publisher surface (T038).
  [AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
  },
  // --- A12 usage half (T037/T046).
  [AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
    ],
  },
  // --- A6 create half (T035). `feature-organization-creator` is an
  // OWNING credential too (spec §Target role model row — both surfaces'
  // create half), kept out of `deleteOrganization`'s reach entirely (its
  // own separate privilege, `DELETE_ORGANIZATION`, above).
  [AuthorizationPrivilege.CREATE_ORGANIZATION]: {
    anchor: 'platform',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_SUPPORT,
      AuthorizationCredential.FEATURE_ORGANIZATION_CREATOR,
    ],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
      AuthorizationCredential.BETA_TESTER,
    ],
  },
  // --- No A-row of its own (not one of A1-A21) — included for
  // completeness since T035 re-anchors it additively alongside
  // `ACCESS_VIRTUAL_ASSISTANT`'s pre-existing grant. Not consumed by any
  // census surface this wave.
  [AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.FEATURE_VIRTUAL_ASSISTANT],
    legacyCredentials: [
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.ASSISTANT_ACCESS,
    ],
  },
};

/** Slice A: owning ∪ legacy. Slice B: owning alone (T076/T077 drop the
 * legacy credentials from every remaining grant set). The executable form
 * of the additive-grant rule stated throughout `contracts/privilege-map.md`. */
export function grantedCredentials(
  privilege: ManagedPrivilege,
  slice: 'A' | 'B'
): readonly AuthorizationCredential[] {
  const grant = PRIVILEGE_GRANTS[privilege];
  return slice === 'B'
    ? grant.owningCredentials
    : [...grant.owningCredentials, ...grant.legacyCredentials];
}

/** True for any `AuthorizationPrivilege` this file mirrors a grant set for —
 * the type guard `reachability.ts` uses to know whether `PRIVILEGE_GRANTS`
 * has an answer for a given `{requires}`/`{anyOf}` component. */
export function isManagedPrivilege(
  privilege: AuthorizationPrivilege
): privilege is ManagedPrivilege {
  return Object.hasOwn(PRIVILEGE_GRANTS, privilege);
}
