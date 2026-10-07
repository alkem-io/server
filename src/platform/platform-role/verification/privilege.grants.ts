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
 * It MUST include `PLATFORM_ROLES_ASSIGN` even though it is not one of D4's
 * eleven NEW privileges (`authorization.privilege.ts`) — T034 widens its
 * grant set to include `platform-roles-admin`, it gates all four A1 surfaces
 * (the two `*PlatformRole*` mutations plus the two generic actor-credential
 * mutations), and a union restricted to "this
 * feature's new privileges" is exactly the mistake that left it out of
 * every closed inventory for twelve analyze passes (fifteenth pass, closing
 * C1). Do NOT narrow this back to `D4Privilege | 'PLATFORM_ROLES_ASSIGN'` —
 * that is the same hand-appended-union defect at smaller scale.
 *
 * `MOVE_POST` is deliberately ABSENT: `post.service.authorization.ts` grants
 * it to `platform-resource-admin`, but no resolver mutation currently checks
 * it (`post.dto.move.ts` exists with no mutation wired to it) — it is a
 * granted-but-unreachable privilege, not a gate site, so it has no census
 * surface (T040b's A9 resolution) and nothing here to mirror. `UPDATE_NAMEID`
 * is deliberately absent: it is granted only on each entity's OWN policy, to
 * non-platform credentials (see A17 in `a.row.surfaces.ts`), so there is no
 * platform-credential grant set to mirror.
 */
export type ManagedPrivilege =
  | AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN
  | AuthorizationPrivilege.FEATURE_ROLE_ASSIGN
  | AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
  | AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
  | AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
  | AuthorizationPrivilege.PLATFORM_USERS_ADMIN
  | AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
  // R-F.2 (2026-09-16, research D29) — Support's console list read. Mirrored
  // here so `PRIVILEGE_COVERAGE` forces a grant-set spec, although it names
  // NO census gate: the three `platformAdmin` list reads it admits are not
  // A-rows (see `INDIRECT_ENFORCEMENT_FILES`' F6 note), so `SCANNED_PRIVILEGES`
  // does not grow and `reachability.spec.ts` derives nothing from it.
  | AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ
  // R-F.3 (2026-09-18) — the License Manager's twin of the above: console
  // list read for spaces / organizations / users. Same disposition — no
  // census gate, grant set spec-covered through `PRIVILEGE_COVERAGE`.
  | AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ
  | AuthorizationPrivilege.PLATFORM_FORUM_MANAGE
  | AuthorizationPrivilege.DELETE_ORGANIZATION
  | AuthorizationPrivilege.PLATFORM_AUDIT_READ
  | AuthorizationPrivilege.SET_SERVICE_PROFILE
  | AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN
  // TRANSFER_RESOURCE_OFFER/_ACCEPT are DELIBERATELY ABSENT here
  // (corr-server-9 fix): two independent credential rules — `account`
  // (account.service.authorization.ts) and `callouts-set`
  // (callouts.set.service.authorization.ts) — grant these two privileges
  // through DIFFERENT credential rules. A flat, tree-independent entry here
  // would apply ONE rule's credential set to every surface using either
  // privilege regardless of tree. Declared per-tree instead, in
  // `TREE_SCOPED_PRIVILEGE_GRANTS` below (`account` and `callouts-set`).
  | AuthorizationPrivilege.MOVE_CONTRIBUTION
  | AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER
  | AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE
  | AuthorizationPrivilege.CREATE_ORGANIZATION
  // QA server-C1-12 (ruling (a)) — A12's `createInnovationHub`.
  | AuthorizationPrivilege.CREATE_INNOVATION_HUB
  | AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT
  // --- T070m additions (reachability.spec.ts) — three purpose-built
  // privileges 032 authored (not this feature), but which gate A3/A11's
  // census rows and therefore need a mirror here too, exactly the same
  // "re-scoped/pre-existing but still censused" argument that keeps
  // PLATFORM_ROLES_ASSIGN in this union. Their grant set is the
  // `platform-operations-admin` cell, declared in `owningCredentials` below.
  | AuthorizationPrivilege.AUTHORIZATION_RESET
  | AuthorizationPrivilege.LICENSE_RESET
  | AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN
  // --- A16's cross-space read (T038). `READ` is normally EXCLUDED as a
  // baseline CRUD verb (like CREATE/UPDATE/DELETE/GRANT below), but A16 is
  // the ONE census row whose gate is a bare `{requires: READ}` naming a
  // rule THIS feature authored (platform-spaces-reader's replacement for
  // the void `global-spaces-reader`) — unlike CREATE/UPDATE/DELETE, no
  // OTHER census `requires`/`anyOf` gate names bare READ, so adding it here
  // cannot leak into an unrelated row the way CREATE/UPDATE/DELETE would.
  | AuthorizationPrivilege.READ;

export interface PrivilegeGrant {
  /** Documentation metadata — the authorization tree the credential rule
   * granting this privilege is declared on. NOT consumed by `reachers()`
   * for matching (an explicit grant reaches its surface regardless of the
   * surface's own tree; only CASCADES are tree-scoped) — it exists so a
   * reviewer can find the credential rule without grepping. */
  readonly anchor: TreeId;
  /** The privilege's owning role(s), per `contracts/privilege-map.md`. */
  readonly owningCredentials: readonly AuthorizationCredential[];
}

export const PRIVILEGE_GRANTS: Record<ManagedPrivilege, PrivilegeGrant> = {
  // --- A1 (T034) — PLATFORM_ROLES_ASSIGN is pre-existing, re-scoped, not new.
  [AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
  },
  // --- A2 (T034) — wholly new privilege.
  [AuthorizationPrivilege.FEATURE_ROLE_ASSIGN]: {
    anchor: 'role-set',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_USERS_ADMIN,
      AuthorizationCredential.PLATFORM_ROLES_ADMIN,
    ],
  },
  // --- A20 (T034).
  [AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ]: {
    anchor: 'role-set',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      AuthorizationCredential.PLATFORM_AUDIT_READER,
    ],
  },
  // --- A20b (T034). NOT granted to Roles Admin / Audit Reader here — they
  // reach the Feature holder lists through PLATFORM_ROLE_HOLDERS_READ by
  // subsumption (research D9), asserted via the gate's `anyOf`, not here.
  [AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
  },
  // --- A7/A8's platform-side branch, and the root rule's own replacement
  // grant (T036, reversed at the ninth analyze pass — FR-004/SC-004,
  // spec-server-1 fix). The root rule's credential list
  // (`cascade.model.ts`'s `ROOT_CASCADE.credentials`) is declared there, not
  // duplicated here, since this privilege's reachability is ENTIRELY
  // cascade-carried (no separate non-root grant exists for it).
  [AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS]: {
    anchor: 'root',
    owningCredentials: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
  },
  // --- A4/A5 (T035, T061/T062).
  [AuthorizationPrivilege.PLATFORM_USERS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
  },
  // --- A7 (T037). Wholly new capability (research C2).
  [AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
  },
  // --- R-F.2 (2026-09-16, D29). Platform-anchored READ for the three
  // console lists (organizations / packs / hubs). License Manager does not
  // own these lists (R-F.3).
  [AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
  },
  // --- R-F.3 (2026-09-18, licensing-section-design.md). Platform-anchored
  // READ for the three console lists the License Manager licenses (spaces /
  // organizations / users).
  [AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
  },
  // --- A15 forum (T035).
  [AuthorizationPrivilege.PLATFORM_FORUM_MANAGE]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
  },
  // --- A6 delete half (T039).
  [AuthorizationPrivilege.DELETE_ORGANIZATION]: {
    anchor: 'organization',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
  },
  // --- A19 (T035). Read-only, held by no other role.
  [AuthorizationPrivilege.PLATFORM_AUDIT_READ]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_AUDIT_READER],
  },
  // --- A21 (T035).
  [AuthorizationPrivilege.SET_SERVICE_PROFILE]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
  },
  // --- A10 (T035/T045) + A13 definition half (T040) share this privilege
  // at two different anchors (`platform` for A10, `licensing-framework` for
  // A13). `anchor` names the primary (A10) declaration;
  // the licensing-framework rule is `licensing.framework.service.
  // authorization.ts`'s `licensings` credential rule.
  [AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
  },
  // --- A9 (T038). `callout.contribution.service.authorization.ts` grants
  // it to `platform-resource-admin` directly PLUS whatever credentials the
  // space's own `platformRolesAccess` array carries with UPDATE.
  [AuthorizationPrivilege.MOVE_CONTRIBUTION]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
  },
  // --- A8 publisher surface (T038); Resource Admin added by operator
  // amendment 2026-10-07.
  [AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER]: {
    anchor: 'space',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
      AuthorizationCredential.PLATFORM_RESOURCE_ADMIN,
    ],
  },
  // --- A12 usage half (T037/T046).
  [AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
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
  },
  // --- A12 create-hub half (QA server-C1-12, ruling (a)). Platform License
  // Manager's own non-cascading account rule. The account admin never held it
  // (unlike CREATE_SPACE/_PACK/_VIRTUAL).
  [AuthorizationPrivilege.CREATE_INNOVATION_HUB]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
  },
  // --- No A-row of its own (not one of A1-A21) — included for
  // completeness since T035 re-anchors it additively alongside
  // `ACCESS_VIRTUAL_ASSISTANT`'s pre-existing grant. Not consumed by any
  // census surface this wave.
  [AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.FEATURE_VIRTUAL_ASSISTANT],
  },

  // --- A3/A11 (032, pre-existing) — see the `ManagedPrivilege` doc comment
  // above for why these three are mirrored here despite predating this
  // feature. All three share ONE grant set (research C3), regardless of which
  // of these three literal privileges an A3/A11 surface checks.
  [AuthorizationPrivilege.AUTHORIZATION_RESET]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
  },
  [AuthorizationPrivilege.LICENSE_RESET]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
  },
  [AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
  },

  // --- A16 (T038) — the one bare-READ exception; see the `ManagedPrivilege`
  // doc comment above.
  // QA server-C1-1 (ruling (b′) "mover-only reads"): platform-resource-admin
  // ALSO holds READ in every space's platformRolesAccess — A9 target
  // resolution, on a NON-cascading rule (the space itself + its About card,
  // never its content). A grant-set fact, so it is declared here and the
  // derivation reports it; A16 accepts it as a declared extra reacher
  // (`a.row.surfaces.ts`), not as an owner of the cross-space read family.
  [AuthorizationPrivilege.READ]: {
    anchor: 'space',
    owningCredentials: [
      AuthorizationCredential.PLATFORM_SPACES_READER,
      AuthorizationCredential.PLATFORM_RESOURCE_ADMIN,
    ],
  },
};

/**
 * 027-platform-role-redesign (T070m) — TREE-SCOPED privilege grants, for the
 * census rows whose literal gate is a baseline CRUD verb (or a
 * resolver-local synthetic policy's privilege) reused far too promiscuously elsewhere
 * in the codebase to add to `ManagedPrivilege` globally (research: A9's
 * cross-L0 moves and A13's own doc comment call these out as "the
 * documented exceptions where the enforced call site's own privilege is a
 * bare CRUD verb rather than this feature's dedicated one"). Adding
 * `CREATE`/`UPDATE`/`DELETE`/`GRANT` globally would make EVERY OTHER
 * `requires`/`anyOf` gate naming them (A6, A7, A8) derive these rows' owners
 * as reachers too — the tree scope is what keeps the derivation precise.
 *
 * `reachers()` consults this ONLY for the surface's own declared `tree`,
 * on top of (never instead of) the global `ManagedPrivilege` check.
 */
export const TREE_SCOPED_PRIVILEGE_GRANTS: {
  readonly [K in TreeId]?: {
    readonly [P in AuthorizationPrivilege]?: PrivilegeGrant;
  };
} = {
  'licensing-framework': {
    // A12 — assign/revoke license plans (admin.licensing.resolver.mutations.ts).
    [AuthorizationPrivilege.GRANT]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
    },
    // A13 — license-plan / license-policy CRUD, re-anchored (in intent,
    // not in literal gate) onto `platform-settings-admin` (T040). The six
    // A13 resolvers check a resolver-local synthetic policy
    // (`GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN`) that grants bare
    // CREATE/UPDATE/DELETE to exactly {platform-settings-admin} — NOT the
    // entity's own (root-cascade-inheriting) authorization, so
    // `platform-content-full-access` does not reach these surfaces.
    [AuthorizationPrivilege.CREATE]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
    },
    [AuthorizationPrivilege.UPDATE]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
    },
    [AuthorizationPrivilege.DELETE]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
    },
  },
  // QA server-C2-d (ruling (a)) — A6's `eventOnOrganizationVerification`.
  // The verification policy is `reset()` and built from its own rules alone
  // (`organization.verification.service.authorization.ts`): Platform Support
  // gets READ + UPDATE + GRANT (UPDATE passes the resolver, GRANT the
  // MANUALLY_VERIFY / RESET / REOPEN / ARCHIVE lifecycle guards).
  // Tree-scoped because UPDATE/GRANT are baseline verbs reused everywhere.
  'organization-verification': {
    [AuthorizationPrivilege.UPDATE]: {
      anchor: 'organization-verification',
      owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
    },
    [AuthorizationPrivilege.GRANT]: {
      anchor: 'organization-verification',
      owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
    },
  },
  'conversion-admin-synthetic': {
    // A9's space moves/conversions — the resolver-local synthetic policy
    // (`conversion.resolver.mutations.ts`), checked via
    // TRANSFER_RESOURCE_OFFER.
    [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
      anchor: 'conversion-admin-synthetic',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    },
  },
  // A9 — the four account-tree resource transfers
  // (account.resolver.mutations.ts: transferSpaceToAccount,
  // transferInnovationHubToAccount, transferInnovationPackToAccount,
  // transferVirtualContributorToAccount), gated on the account's own
  // TRANSFER_RESOURCE_OFFER/_ACCEPT rule (account.service.authorization.ts).
  // Split out of the flat `PRIVILEGE_GRANTS` (corr-server-9 fix) because
  // `callouts-set` grants the SAME two privileges through a different
  // credential rule below.
  account: {
    [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
      anchor: 'account',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    },
    [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: {
      anchor: 'account',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    },
  },
  // A9 — `transferCallout`'s OWN authorization tree
  // (callouts.set.service.authorization.ts), whose
  // TRANSFER_RESOURCE_OFFER/_ACCEPT rule is separate from the account-tree
  // rule above (which is cascade:false and never reaches the callouts-set).
  'callouts-set': {
    [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
      anchor: 'callouts-set',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    },
    [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: {
      anchor: 'callouts-set',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    },
  },
};

/** The credentials a managed privilege is granted to: its owning role(s).
 * The executable form of the grant sets stated in
 * `contracts/privilege-map.md`. */
export function grantedCredentials(
  privilege: ManagedPrivilege
): readonly AuthorizationCredential[] {
  return PRIVILEGE_GRANTS[privilege].owningCredentials;
}

/** True for any `AuthorizationPrivilege` this file mirrors a grant set for —
 * the type guard `reachability.ts` uses to know whether `PRIVILEGE_GRANTS`
 * has an answer for a given `{requires}`/`{anyOf}` component. */
export function isManagedPrivilege(
  privilege: AuthorizationPrivilege
): privilege is ManagedPrivilege {
  return Object.hasOwn(PRIVILEGE_GRANTS, privilege);
}
