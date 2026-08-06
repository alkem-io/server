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
 * grant set to include `platform-roles-admin`, it gates all six A1 surfaces
 * (the two `*PlatformRole*` mutations plus the four FR-022 credential
 * mutations pinned away from it by T034a), and a union restricted to "this
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
 * is deliberately absent for the SLICE reason T070f documents: Slice A adds
 * only its enum value; its rule and surface arrive at T078 (Slice B).
 */
export type ManagedPrivilege =
  | AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN
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
  // TRANSFER_RESOURCE_OFFER/_ACCEPT are DELIBERATELY ABSENT here
  // (corr-server-9 fix): two independent credential rules — `account`
  // (account.service.authorization.ts) and `callouts-set`
  // (callouts.set.service.authorization.ts) — grant these two privileges
  // with DIFFERENT legacy reacher sets (`global-support` vs
  // `global-support-manager`). A flat, tree-independent entry here would
  // apply ONE of those sets to every surface using either privilege
  // regardless of tree — exactly the mistake that let `transferCallout`'s
  // wrong legacy reacher go undetected. Declared per-tree instead, in
  // `TREE_SCOPED_PRIVILEGE_GRANTS` below (`account` and `callouts-set`).
  | AuthorizationPrivilege.MOVE_CONTRIBUTION
  | AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER
  | AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE
  | AuthorizationPrivilege.CREATE_ORGANIZATION
  | AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT
  // --- T070m additions (reachability.spec.ts) — three purpose-built
  // privileges 032 authored (not this feature), but which gate A3/A11's
  // census rows and therefore need a mirror here too, exactly the same
  // "re-scoped/pre-existing but still censused" argument that keeps
  // PLATFORM_ROLES_ASSIGN in this union. Slice A does not touch their grant
  // set at all (research: A3/A11 comments); Slice B's owning-alone half is
  // therefore identical to today's `platform-operations-admin` cell, and
  // `owningCredentials` below is what Slice B still reads.
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
  /** Slice B — and Slice A's non-legacy component: the privilege's owning
   * role(s) alone, per `contracts/privilege-map.md`. */
  readonly owningCredentials: readonly AuthorizationCredential[];
  /** Slice A ONLY, additively: legacy credentials that reach the action
   * TODAY, dropped at Slice B (T076/T077). Empty where the privilege is
   * wholly new (no legacy predecessor) — e.g. `FEATURE_ROLE_ASSIGN`. */
  readonly legacyCredentials: readonly AuthorizationCredential[];
}

export const PRIVILEGE_GRANTS: Record<ManagedPrivilege, PrivilegeGrant> = {
  // --- A1 (T034) — PLATFORM_ROLES_ASSIGN is pre-existing, re-scoped, not new.
  [AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
    legacyCredentials: [],
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
    legacyCredentials: [],
  },
  // --- A20b (T034). NOT granted to Roles Admin / Audit Reader here — they
  // reach the Feature holder lists through PLATFORM_ROLE_HOLDERS_READ by
  // subsumption (research D9), asserted via the gate's `anyOf`, not here.
  [AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    legacyCredentials: [],
  },
  // --- A7/A8's platform-side branch, and the root rule's own replacement
  // grant (T036, reversed at the ninth analyze pass — FR-004/SC-004,
  // spec-server-1 fix). `global-support` deliberately does NOT reach this
  // privilege (sec-server-3/corr-server-2 fix): its reach is (a) its OWN
  // platform-subtree cascade (`cascade.model.ts`'s
  // `globalSupportPlatformSubtree`, which does not reach the other six
  // root-inheritors), and (b) per-space, flag-gated privileges — never a
  // blanket grant of THIS privilege. The root rule's own credential list
  // additionally carries `global-admin` directly
  // (`cascade.model.ts`'s `ROOT_CASCADE.credentialsBySlice.A`) — declared
  // there, not duplicated here, since this privilege's reachability is
  // ENTIRELY cascade-carried (no separate non-root grant exists for it).
  [AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS]: {
    anchor: 'root',
    owningCredentials: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
    legacyCredentials: [],
  },
  // --- A4/A5 (T035, T061/T062). Grant set is the UNION of A4's legacy
  // reachers (today's PLATFORM_ADMIN: GA/GS/GLM) and A5's (today's
  // PLATFORM_SETTINGS_ADMIN: adds GLOBAL_PLATFORM_MANAGER).
  [AuthorizationPrivilege.PLATFORM_USERS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    legacyCredentials: [],
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
    legacyCredentials: [],
  },
  // --- A6 delete half (T039).
  [AuthorizationPrivilege.DELETE_ORGANIZATION]: {
    anchor: 'organization',
    owningCredentials: [AuthorizationCredential.PLATFORM_SUPPORT],
    legacyCredentials: [],
  },
  // --- A19 (T035). Read-only, held by no other role.
  [AuthorizationPrivilege.PLATFORM_AUDIT_READ]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_AUDIT_READER],
    legacyCredentials: [],
  },
  // --- A21 (T035).
  [AuthorizationPrivilege.SET_SERVICE_PROFILE]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
    legacyCredentials: [],
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
    legacyCredentials: [],
  },
  // --- A9 (T037).
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
    legacyCredentials: [],
  },
  // --- A8 publisher surface (T038).
  [AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
    legacyCredentials: [],
  },
  // --- A12 usage half (T037/T046).
  [AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
    legacyCredentials: [],
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
    legacyCredentials: [],
  },
  // --- No A-row of its own (not one of A1-A21) — included for
  // completeness since T035 re-anchors it additively alongside
  // `ACCESS_VIRTUAL_ASSISTANT`'s pre-existing grant. Not consumed by any
  // census surface this wave.
  [AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.FEATURE_VIRTUAL_ASSISTANT],
    legacyCredentials: [],
  },

  // --- A3/A11 (032, pre-existing) — see the `ManagedPrivilege` doc comment
  // above for why these three are mirrored here despite predating this
  // feature. All three share ONE grant set (research C3): the census's own
  // legacyReachers array is identical across every A3/A11 surface
  // regardless of which of these three literal privileges it checks.
  [AuthorizationPrivilege.AUTHORIZATION_RESET]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
    legacyCredentials: [],
  },
  [AuthorizationPrivilege.LICENSE_RESET]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
    legacyCredentials: [],
  },
  [AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
    legacyCredentials: [],
  },

  // --- A16 (T038) — the one bare-READ exception; see the `ManagedPrivilege`
  // doc comment above.
  [AuthorizationPrivilege.READ]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PLATFORM_SPACES_READER],
    legacyCredentials: [],
  },
};

/**
 * 027-platform-role-redesign (T070m) — TREE-SCOPED privilege grants, for the
 * three census rows whose literal gate is a baseline CRUD verb (or the
 * legacy `PLATFORM_ADMIN` catch-all) reused far too promiscuously elsewhere
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
  // sec-server-9 fix: `grantCredentialToActor`/`revokeCredentialFromActor`
  // (actor.resolver.mutations.ts, A1) check bare `PLATFORM_ADMIN` on the
  // PLATFORM tree's own authorization — the SAME literal privilege A9's
  // conversion-admin-synthetic resolvers check, but on a DIFFERENT,
  // UNCHANGED credential rule (`platformAdmin` in `platform.service.
  // authorization.ts`): `{global-admin, global-support,
  // global-license-manager}`, cascade:false, no owning role. Scoped to the
  // `platform` tree (not the global `ManagedPrivilege` union) for the same
  // reason A9's PLATFORM_ADMIN grant is tree-scoped — PLATFORM_ADMIN is
  // reused far too promiscuously elsewhere in the codebase (~24 files) to
  // manage as a flat, tree-independent entry.
  platform: {
    // T074/T083a (Slice B): the tree-scoped `PLATFORM_ADMIN` entry that stood
    // here is gone with the privilege. Its two surfaces —
    // `grantCredentialToActor` / `revokeCredentialFromActor` — are re-gated on
    // `PLATFORM_ROLES_ASSIGN`, whose grant is declared once in the flat
    // `PRIVILEGE_GRANTS` above and needs no tree-scoped override: unlike the
    // catch-all it replaces, that privilege means the same thing on every
    // policy that carries it.
  },
  'licensing-framework': {
    // A12 — assign/revoke license plans (admin.licensing.resolver.mutations.ts).
    [AuthorizationPrivilege.GRANT]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
      legacyCredentials: [],
    },
    // A13 — license-plan / license-policy CRUD, re-anchored (in intent,
    // not in literal gate) onto `platform-settings-admin` (T040).
    // GLOBAL_ADMIN added to each (corr-server-7/corr-server-10 fix): the
    // five A13 resolvers now check a resolver-local synthetic policy
    // (`GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN`) that grants bare
    // CREATE/UPDATE/DELETE to exactly {platform-settings-admin,
    // global-admin, global-support, global-license-manager,
    // global-platform-manager} — NOT the entity's own
    // (root-cascade-inheriting) authorization, so `platform-content-
    // full-access` no longer reaches these surfaces. GLOBAL_SUPPORT added
    // (corr-server-12 fix): the synthetic policy mirrors what these
    // resolvers checked pre-feature (`licensingFramework.authorization`),
    // which inherits `platform.authorization`'s `globalSupportPlatformAdmin`
    // cascade — dropping global-support from the synthetic policy would
    // have narrowed a pre-existing reach in an additive-only slice.
    [AuthorizationPrivilege.CREATE]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      legacyCredentials: [],
    },
    [AuthorizationPrivilege.UPDATE]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      legacyCredentials: [],
    },
    [AuthorizationPrivilege.DELETE]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      legacyCredentials: [],
    },
  },
  'conversion-admin-synthetic': {
    // A9's three cross-L0 moves — the resolver-local synthetic policy
    // (`conversion.resolver.mutations.ts`) checked against the LEGACY
    // `PLATFORM_ADMIN` privilege, not the platform-wide grant set of the
    // same name (they are unrelated despite the shared literal).
    [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
      anchor: 'conversion-admin-synthetic',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyCredentials: [],
    },
  },
  // A9 — the four account-tree resource transfers
  // (account.resolver.mutations.ts: transferSpaceToAccount,
  // transferInnovationHubToAccount, transferInnovationPackToAccount,
  // transferVirtualContributorToAccount), gated on the account's own
  // TRANSFER_RESOURCE_OFFER/_ACCEPT rule (account.service.authorization.ts).
  // Split out of the flat `PRIVILEGE_GRANTS` (corr-server-9 fix) because
  // `callouts-set` grants the SAME two privileges to a different legacy
  // reacher below.
  account: {
    [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
      anchor: 'account',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyCredentials: [],
    },
    [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: {
      anchor: 'account',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyCredentials: [],
    },
  },
  // A9 — `transferCallout`'s OWN authorization tree
  // (callouts.set.service.authorization.ts), whose
  // TRANSFER_RESOURCE_OFFER/_ACCEPT rule grants
  // [GLOBAL_ADMIN, GLOBAL_SUPPORT_MANAGER, PLATFORM_RESOURCE_ADMIN] — NOT
  // GLOBAL_SUPPORT (corr-server-9 fix: GLOBAL_SUPPORT_MANAGER is the ONLY
  // legacy credential that reaches this surface; the account-tree grants
  // above that DO include GLOBAL_SUPPORT are cascade:false and never reach
  // the callouts-set).
  'callouts-set': {
    [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
      anchor: 'callouts-set',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyCredentials: [],
    },
    [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: {
      anchor: 'callouts-set',
      owningCredentials: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyCredentials: [],
    },
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
