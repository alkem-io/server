import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import type { TreeId } from './cascade.model';
import type { GateExpr } from './gate.model';

/**
 * 027-platform-role-redesign (T040b, research C14/D24, contracts/
 * privilege-map.md §"A-row → surfaces") — the machine-readable census: every
 * GraphQL mutation / field / MCP tool this feature's 21 live global-role
 * families (A1-A21, minus the removed A18) actually gate, one entry per
 * surface. This is the SINGLE source for `test-suites`' matrix generation,
 * this repo's own unit-coverage inventory (T070a) and drift detector
 * (`surface.drift.spec.ts`, T052a) — read `contracts/privilege-map.md`
 * first; this file is its executable form, not a paraphrase of it.
 *
 * `A20` (all upper-case) is intentionally NOT part of `ARowId` as written —
 * it IS: `ARowId` is `'A1' … 'A21' | 'A20b'`, 22 members. `A20b` re-uses
 * `A20`'s four resolvers for the `feature-*` half of the same holder-list
 * read (privilege-map.md §"A20/A20b are one surface, two privileges").
 */
export type ARowId =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'A9'
  | 'A10'
  | 'A11'
  | 'A12'
  | 'A13'
  | 'A14'
  | 'A15'
  | 'A16'
  | 'A17'
  | 'A18'
  | 'A19'
  | 'A20'
  | 'A20b'
  | 'A21';

export interface SurfaceRef {
  /** Repo-relative path of the file where the gate is ENFORCED — not
   * necessarily the same file that declares the GraphQL mutation, when the
   * two differ (A1/A2: the resolver delegates to the shared assignment rule
   * engine; see `INDIRECT_ENFORCEMENT_FILES` below). */
  readonly file: string;
  /** The resolver method / field name. A single string, except A14 — the
   * one row whose surface is RENAMED between slices (`updateSpacePlatformSettings`
   * at A, `adminUpdateSpaceVisibility` at B, T078). */
  readonly member: string | { readonly A: string; readonly B: string };
  readonly kind:
    | 'graphql-mutation'
    | 'graphql-query'
    | 'graphql-field'
    | 'mcp-tool';
  /** Which authorization tree carries the gate. */
  readonly tree: TreeId;
  /** The closed gate vocabulary (`gate.model.ts`) — what a caller must hold
   * to pass. */
  readonly gate: GateExpr;
  /** POLICY INTENT (research D26/D27a) — what a human decided in spec
   * §Action → owning role. CREDENTIALS, not role names — may be `[]` (A17:
   * owned by no global role; A1's four retiring credential mutations: owned
   * by nobody because they are being deleted). Never derived; never equal
   * to `reachers()` by construction — `reachability.spec.ts` (T070m, NOT
   * built this wave) is what asserts the two agree. */
  readonly intendedOwners: readonly AuthorizationCredential[];
  /** A role that reaches the surface for a documented, ACCEPTED reason
   * beyond its own intent (A16 only, this census). */
  readonly acceptedExtraReachers?: readonly {
    readonly credential: AuthorizationCredential;
    readonly reason: string;
  }[];
  /** Credentials that reach this surface TODAY, Slice A only, additively —
   * dropped at Slice B (T076/T077/T080/T082). Never role names — this is
   * exactly where the two vocabularies (RoleName vs AuthorizationCredential)
   * diverge for the legacy silent-void rows this feature exists to fix
   * (research D27). */
  readonly legacyReachers: readonly AuthorizationCredential[];
  /** Absent for a normal, currently-live-in-both-slices surface. */
  readonly lifecycle?:
    | 'retired' // absent in BOTH slices (A18)
    | { readonly deferred: 'B' } // absent at A, live at B (A17's two surfaces)
    | { readonly retiredIn: 'B' } // live at A, deleted at B (A1's four credential mutations)
    // Live in BOTH slices for reachability + pin-drift purposes, but produces
    // NO matrix cell in either — because ANOTHER census entry already covers
    // the same invocable member, and two entries for one mutation generate two
    // contradictory expectations for it (spec-server-25). Use this ONLY for a
    // second declaration of an already-declared member; a genuinely
    // uninvocable surface is a different problem.
    | { readonly declarationOnly: true };
}

/**
 * Files where a `SCANNED_PRIVILEGES` hit is legitimate and does NOT mean a
 * missing census entry, because the census accounts for that privilege at
 * a DIFFERENT declared `file` (a genuine indirection) or the hit belongs to
 * a code path this census does not cover. Consulted by
 * `surface.drift.spec.ts`'s rule 1 (eighth clarification pass, deferred-
 * mechanism item) so an indirection doesn't read as an ungated resolver.
 *
 * A1/A2's `assignPlatformRoleToUser` / `removePlatformRoleFromUser` /
 * `assignPlatformRoleToOrganization` / `removePlatformRoleFromOrganization`
 * satisfy the assigner-capability rule (D5's "explicit gate at every
 * A-row's own resolver") at `platform.role.resolver.mutations.ts` — but
 * only in the sense of NAMING the GraphQL surface; for the target role
 * model (`RULE_ENGINE_GOVERNED_ROLES`) the resolver DELEGATES the actual
 * check to `PlatformRoleAssignmentRulesService.evaluateOrFail()`, which is
 * where `PLATFORM_ROLES_ASSIGN` / `FEATURE_ROLE_ASSIGN` are literally
 * checked (`checkAssignerCapability()`, via `isAccessGranted()`). The
 * census therefore declares A1/A2's `file` as the RULE-ENGINE service
 * (`SurfaceRef.file` is documented to mean "where the gate is enforced",
 * not "where the mutation is declared") — which leaves the resolver file
 * itself holding a REAL, separate `PLATFORM_ROLES_ASSIGN` hit with no census
 * entry pointing at it: its own inline `else`-branch check, which governs
 * only the LEGACY (non-target, `global-*`) role-assignment path that
 * predates this feature and sits outside its 21-row census entirely.
 * Exempted here rather than mis-declared as a census surface it is not.
 */
export const INDIRECT_ENFORCEMENT_FILES: readonly string[] = [
  'src/platform/platform-role/platform.role.resolver.mutations.ts',
  // The GENERIC role-set assign/remove mutations (`assignRoleToUser` /
  // `removeRoleFromUser` and their organization-target twins),
  // `role.set.resolver.mutations.ts` — SPACE/ORGANIZATION role-sets only
  // (`validateRoleSetTypeOrFail` rejects PLATFORM), never A1/A2's surface.
  // `PLATFORM_ROLES_ASSIGN` appears there only as the `privilegeRequired`
  // variable's initial value, immediately overwritten by the
  // `roleSet.type` switch for every reachable case (SPACE → `GRANT` or
  // `ROLESET_ENTRY_ROLE_ASSIGN`; ORGANIZATION → `GRANT`) — a dead literal,
  // not a live PLATFORM-role gate, and outside this census's 21 rows.
  'src/domain/access/role-set/role.set.resolver.mutations.ts',
  // A20/A20b (sec-server-10 fix): `admin.authorization.resolver.queries.ts`
  // NAMES `actorsWithCredential`/`usersWithAuthorizationCredential`, but the
  // actual PLATFORM_ROLE_HOLDERS_READ/FEATURE_ROLE_HOLDERS_READ check is
  // enforced in the SHARED `platform.role.holder.list.access.ts` predicate
  // (declared as those two members' `file` above) — the same resolver→
  // shared-service indirection as A1/A2. This file's own literal
  // `AuthorizationPrivilege.READ_USERS` (the unchanged, non-role-family
  // path) is outside `ManagedPrivilege`/`SCANNED_PRIVILEGES` and therefore
  // never trips rule 1/2 on its own — this entry exists so rule 4 (the
  // credential-typed-argument completeness scan) recognizes the file.
  'src/platform-admin/domain/authorization/admin.authorization.resolver.queries.ts',
];

// 027-platform-role-redesign (T083a, Slice B): the GA/GS/GSM/GLM/GPM aliases
// are gone with the credentials they named (T077). Every surface below now
// declares `legacyReachers: []` — that is the whole point of the subtractive
// slice, and `reachability.ts` derives the same empty set from the cascade
// model, so `reachability.spec.ts` compares two independently-derived empties
// rather than asserting one.

export const A_ROW_SURFACES: Record<ARowId, readonly SurfaceRef[]> = {
  // ===== A1 — assign/revoke a PLATFORM role =====================
  // Owner: Roles Admin, on the two `*PlatformRole*` surfaces only. The four
  // FR-022 credential mutations share `PLATFORM_ROLES_ASSIGN` and are declared
  // here too (T034a, research C10/D24) so the widened grant set's reach is
  // checked against them — but their intent is `[]`: they are being
  // DELETED (T080), not re-gated, and multiply into no matrix cell in
  // either slice (privilege-map.md §"A1 carries SIX surfaces").
  A1: [
    {
      // Enforcement location, not declaration location (see
      // `INDIRECT_ENFORCEMENT_FILES` above) — the resolver delegates to
      // `PlatformRoleAssignmentRulesService.checkAssignerCapability()`.
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'assignPlatformRoleToUser',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [],
    },
    {
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'removePlatformRoleFromUser',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [],
    },
    // --- FR-022's four (T034a's pin) — DELETED at Slice B (T080/T083a).
    // The four `retiredIn: 'B'` entries that stood here went with the
    // mutations they described. That is what the marker is for: a census
    // entry outliving its surface is exactly the drift this file exists to
    // catch, and `surface.drift.spec.ts` rule 3 fails on the orphaned
    // credential-pin declaration within one test run of forgetting.
    // --- Legacy-role branch pin — REMOVED at Slice B (T077/T083a).
    // Two entries stood here declaring `assignPlatformRoleToUser` /
    // `removePlatformRoleFromUser`'s ELSE branch as pinned to a
    // resolver-local, hardcoded-to-[GLOBAL_ADMIN] policy, so that T034's
    // widening of PLATFORM_ROLES_ASSIGN could not reach legacy role
    // assignment. The pin is gone because what it protected is gone: every
    // `global-*` role, `platform-beta-tester`, `platform-vc-campaign` and
    // `platform-assistant-access` left `RoleName`, leaving
    // `platform-operations-admin` as the only role in that branch — an
    // ordinary Roles-Admin-assignable role needing no pin. The two mutations
    // remain censused above through their rule-engine-governed entries.
    // --- sec-server-9 fix: the generic, un-censused actor-credential
    // mutations became grantable/revokable for all 13 platform-*/feature-*
    // role credentials the moment they joined the shared
    // `AuthorizationCredential`/`CredentialType` enums — a complete bypass
    // of the six-rule assignment engine and its audit trail. Both mutations
    // now reject that vocabulary outright before their UNCHANGED
    // `PLATFORM_ADMIN` check (still {global-admin, global-support,
    // global-license-manager} — NOT narrowed to a [GLOBAL_ADMIN]-only pin
    // like the FR-022 four, since this generic mutation is still legitimately
    // used for every OTHER, non-role-family credential type). No
    // `lifecycle.retiredIn: 'B'` marker (unlike the FR-022 four): those are
    // deleted outright at Slice B (T080); this mutation is not — it is
    // simply not a target-role-model owned surface. `intendedOwners: []`
    // reflects that honestly: nobody OWNS this generic bypass, it is
    // reachable only via the legacy, tree-scoped `PLATFORM_ADMIN` grant
    // (`TREE_SCOPED_PRIVILEGE_GRANTS['platform'][PLATFORM_ADMIN]` below).
    {
      file: 'src/domain/actor/actor/actor.resolver.mutations.ts',
      member: 'grantCredentialToActor',
      kind: 'graphql-mutation',
      tree: 'platform',
      // T074 (Slice B): re-gated off the retired `PLATFORM_ADMIN` catch-all
      // onto `PLATFORM_ROLES_ASSIGN`. `intendedOwners` stays EMPTY on purpose:
      // these two generic credential writes bypass the six-rule assignment
      // engine and the audit trail, so no role is declared to own them. What
      // keeps them safe is the `RESTRICTED_ROLE_CREDENTIAL_TYPES` rejection at
      // the resolver — every `platform-*`/`feature-*` credential is refused
      // before the authorization check — not the privilege on the gate.
      gate: { requires: AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [],
    },
    {
      file: 'src/domain/actor/actor/actor.resolver.mutations.ts',
      member: 'revokeCredentialFromActor',
      kind: 'graphql-mutation',
      tree: 'platform',
      // T074 (Slice B): re-gated off the retired `PLATFORM_ADMIN` catch-all
      // onto `PLATFORM_ROLES_ASSIGN`. `intendedOwners` stays EMPTY on purpose:
      // these two generic credential writes bypass the six-rule assignment
      // engine and the audit trail, so no role is declared to own them. What
      // keeps them safe is the `RESTRICTED_ROLE_CREDENTIAL_TYPES` rejection at
      // the resolver — every `platform-*`/`feature-*` credential is refused
      // before the authorization check — not the privilege on the gate.
      gate: { requires: AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [],
    },
  ],

  // ===== A2 — assign/revoke a FEATURE role =======================
  // Owner: Users Admin OR Roles Admin (FR-003). The user-target surfaces
  // are the SAME two resolver methods as A1 (payload role is `feature-*`
  // instead of `platform-*`) — declared as separate entries per
  // privilege-map.md ("A1's two ⊂ A2's four"), plus the Slice-A-only
  // organization-target pair (T032a).
  A2: [
    {
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'assignPlatformRoleToUser',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.FEATURE_ROLE_ASSIGN },
      intendedOwners: [
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      ],
      legacyReachers: [],
    },
    {
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'removePlatformRoleFromUser',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.FEATURE_ROLE_ASSIGN },
      intendedOwners: [
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      ],
      legacyReachers: [],
    },
    {
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'assignPlatformRoleToOrganization',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.FEATURE_ROLE_ASSIGN },
      intendedOwners: [
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      ],
      legacyReachers: [],
    },
    {
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'removePlatformRoleFromOrganization',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.FEATURE_ROLE_ASSIGN },
      intendedOwners: [
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
      ],
      legacyReachers: [],
    },
  ],

  // ===== A3 — authorization / license-entitlement reset (032, pre-existing)
  // Owner: Operations Admin. Slice A does not touch this family's grant set
  // (it already carries `platform-operations-admin`, delivered by
  // workspace#032) — Slice B (T074/T076) drops the three legacy credentials
  // alone. Grepped exhaustively for this census (contract's "7" was stale;
  // 10 real gate sites — the T003 baseline predates several of these
  // mutations).
  // Per-site privilege (NOT a blanket `anyOf` across the whole family) —
  // each mutation checks exactly ONE of the two; declaring the family-level
  // `anyOf` on every site would claim a LICENSE_RESET check that 8 of the
  // 10 sites do not literally have, and fail `surface.drift.spec.ts`'s
  // rule 2 on exactly the correct declarations (the same shape of mistake
  // rule 2 exists to catch elsewhere).
  A3: (
    [
      [
        'src/platform/platform/platform.resolver.mutations.ts',
        'authorizationPolicyResetOnPlatform',
        'platform',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/services/ai-server/ai-server/ai.server.resolver.mutations.ts',
        'aiServerAuthorizationPolicyReset',
        'ai-server',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/domain/community/user/user.resolver.mutations.ts',
        'authorizationPolicyResetOnUser',
        'user',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/domain/community/organization/organization.resolver.mutations.ts',
        'authorizationPolicyResetOnOrganization',
        'organization',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/domain/space/account/account.resolver.mutations.ts',
        'authorizationPolicyResetOnAccount',
        'account',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/domain/space/account/account.resolver.mutations.ts',
        'licenseResetOnAccount',
        'account',
        AuthorizationPrivilege.LICENSE_RESET,
      ],
      [
        'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
        'authorizationPolicyResetAll',
        'platform',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
        'authorizationPlatformRolesAccessReset',
        'platform',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
        'authorizationPolicyResetToGlobalAdminsAccess',
        'platform',
        AuthorizationPrivilege.AUTHORIZATION_RESET,
      ],
      [
        'src/platform-admin/licensing/admin.licensing.resolver.mutations.ts',
        'resetLicenseOnAccounts',
        'licensing-framework',
        AuthorizationPrivilege.LICENSE_RESET,
      ],
    ] as const
  ).map(
    ([file, member, tree, privilege]): SurfaceRef => ({
      file,
      member,
      kind: 'graphql-mutation',
      tree: tree as TreeId,
      gate: { requires: privilege },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
    })
  ),

  // ===== A4 — change login email =====
  // T070m finding: the ONE `PLATFORM_USERS_ADMIN` credential rule
  // (`user.service.authorization.ts`) grants it to A4's AND A5's legacy
  // reachers as a single undifferentiated list — the privilege carries no
  // memory of which A-row's legacy set a credential was added for, so
  // `GLOBAL_PLATFORM_MANAGER` (added there for A5) reaches A4 too. Fixed
  // here rather than narrowing the shared credential rule, which would
  // remove a legacy holder's TODAY access (forbidden in the additive slice).
  A4: [
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts',
      member: 'adminUserEmailChange',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
    },
    // --- Legacy-admin pin (spec-server-1 follow-through fix) — the SAME
    // `deleteUser` mutation's legacy-admin branch, held to a resolver-local,
    // hardcoded-to-[GLOBAL_ADMIN] IAuthorizationPolicy rather than checking
    // bare DELETE against `user.authorization`, so the root rule's now-wider
    // (FR-004) DELETE cascade to `platform-content-full-access` cannot
    // satisfy it. Declared so `surface.drift.spec.ts`'s credential-pin check
    // knows this file also carries a pin.
    //
    // spec-server-25 fix (2026-07-31): `lifecycle: {declarationOnly: true}`.
    // This is the SECOND census entry for the SAME `deleteUser` mutation —
    // A5 declares the invocable one. Without the marker BOTH multiplied, so
    // the matrix generated `PLATFORM_USERS_ADMIN x A4 (deleteUser) -> deny`
    // alongside `PLATFORM_USERS_ADMIN x A5 (deleteUser) -> allow`: one
    // mutation, two contradictory expectations, the DENY one guaranteed to
    // fail at Slice B because the ALLOW is the correct answer. Worse, that
    // DENY cell invoked a real `deleteUser` against the shared fixture user,
    // and corr-ts-16's DENY-before-ALLOW ordering could not protect it —
    // that orders cells WITHIN one surface, and these are two surfaces.
    // Reachability and pin-drift still see this entry in both slices; only
    // matrix multiplication is suppressed.
    // T077/T083a (Slice B): this second, `declarationOnly` census entry for
    // `deleteUser` is REMOVED. It existed to declare the mutation's
    // legacy-admin branch — a resolver-local `[GLOBAL_ADMIN]` pin held ahead
    // of a bare DELETE check, so FR-004's widened root DELETE cascade could
    // not let `platform-content-full-access` delete arbitrary users. That
    // branch is deleted (registration.resolver.mutations.ts): Platform Users
    // Admin is now the sole administrative path, and A5's single remaining
    // entry below declares it. Leaving this entry would be exactly the
    // orphaned credential-pin declaration `surface.drift.spec.ts` rule 3
    // exists to fail on.
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts',
      member: 'adminUserEmailChangeDriftResolve',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
    },
  ],

  // ===== A5 — delete user; reset identity/account =====
  // `deleteUser` is the D5 dual path — but NOT a plain `{anyOf: [DELETE,
  // PLATFORM_USERS_ADMIN]}` gate any more (spec-server-1 follow-through
  // fix). Self-delete is checked by actor-identity comparison (equivalent
  // to the resource-scoped USER_SELF_MANAGEMENT credential every user
  // holds) and the legacy-admin path is pinned to a resolver-local,
  // hardcoded `[GLOBAL_ADMIN]` policy — exactly the FR-022/T034a pin shape
  // — rather than checking bare DELETE against `user.authorization`.
  // Declaring the gate as bare `{anyOf: [DELETE, ...]}` would have the
  // derivation intersect the root cascade's now-widened (FR-004) DELETE
  // grant and report `platform-content-full-access` reaching this row — a
  // real defect A5/SC-004 does NOT accept (the accepted exception is
  // closed at A6/A7 only). The gate is therefore declared as
  // `{requires: PLATFORM_USERS_ADMIN}` alone: GLOBAL_ADMIN's legacy reach
  // (the pinned branch) and GLOBAL_SUPPORT/GLOBAL_LICENSE_MANAGER/
  // GLOBAL_PLATFORM_MANAGER's reach are already fully accounted for via
  // PLATFORM_USERS_ADMIN's own declared legacy grant set
  // (`privilege.grants.ts`), so the derived set is unchanged and honest.
  A5: [
    {
      file: 'src/services/api/registration/registration.resolver.mutations.ts',
      member: 'deleteUser',
      kind: 'graphql-mutation',
      tree: 'user',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
    },
    {
      file: 'src/platform-admin/core/identity/admin.identity.resolver.mutations.ts',
      member: 'adminIdentityDeleteKratosIdentity',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
    },
    {
      file: 'src/platform-admin/domain/user/admin.users.resolver.mutations.ts',
      member: 'adminUserAccountDelete',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
    },
    // T074 (Slice B): the user-record family's read/discovery surfaces. Spec row 6 owns "reading user personal data to support these". Same declarationOnly reasoning as the A8 block.
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'users',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'identity',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/core/identity/admin.identity.resolver.fields.ts',
      member: 'identities',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/core/identity/admin.identity.resolver.queries.ts',
      member: 'adminIdentitiesUnverified',
      kind: 'graphql-query',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/services/api/roles/roles.resolver.fields.ts',
      member: 'invitations',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/services/api/roles/roles.resolver.fields.ts',
      member: 'applications',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    // PII read: masks the field rather than throwing when denied.
    {
      file: 'src/domain/community/user/user.resolver.fields.ts',
      member: 'authentication',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
  ],

  // ===== A6 — create / delete an organization =====
  // The one row whose intent differs BETWEEN its own two surfaces
  // (privilege-map.md §"A6 | the one row whose intent differs...").
  A6: [
    {
      file: 'src/services/api/registration/registration.resolver.mutations.ts',
      member: 'createOrganization',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.CREATE_ORGANIZATION },
      intendedOwners: [
        AuthorizationCredential.PLATFORM_SUPPORT,
        AuthorizationCredential.FEATURE_ORGANIZATION_CREATOR,
      ],
      legacyReachers: [],
    },
    {
      file: 'src/services/api/registration/registration.resolver.mutations.ts',
      member: 'deleteOrganization',
      kind: 'graphql-mutation',
      tree: 'organization',
      gate: {
        anyOf: [
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.DELETE_ORGANIZATION,
        ],
      },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      // spec-server-1 fix (ninth analyze pass, FR-004/SC-004): with the
      // root rule's reversal to full CRUD, Content Full Access reaches
      // plain DELETE on the organization tree via `ROOT_CASCADE` — the
      // ONE named, accepted exception (SC-004), not a defect.
      acceptedExtraReachers: [
        {
          credential: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
          reason:
            'SC-004 accepted exception — FR-004 cascades full CRUD from the inheritance root, which satisfies the owner branch of this dual-path gate exactly as an organization owner would.',
        },
      ],
      legacyReachers: [],
    },
  ],

  // ===== A7 — edit an org-owned pack/hub + CRUD its templates =====
  // Contract's "~5" corrected to 8 by grepping the tree (T040b instruction):
  // update{InnovationPack,InnovationHub} + create/update/delete of
  // templates across three template resolver files.
  A7: [
    ...(
      [
        [
          'src/library/innovation-pack/innovation.pack.resolver.mutations.ts',
          'updateInnovationPack',
        ],
        [
          'src/domain/innovation-hub/innovation.hub.resolver.mutations.ts',
          'updateInnovationHub',
        ],
        [
          'src/domain/template/templates-set/templates.set.resolver.mutations.ts',
          'createTemplate',
        ],
        [
          'src/domain/template/templates-set/templates.set.resolver.mutations.ts',
          'createTemplateFromSpace',
        ],
        [
          'src/domain/template/templates-set/templates.set.resolver.mutations.ts',
          'createTemplateFromContentSpace',
        ],
        [
          'src/domain/template/template/template.resolver.mutations.ts',
          'updateTemplate',
        ],
        [
          'src/domain/template/template/template.resolver.mutations.ts',
          'updateTemplateFromSpace',
        ],
        [
          'src/domain/template/template/template.resolver.mutations.ts',
          'deleteTemplate',
        ],
      ] as const
    ).map(
      ([file, member]): SurfaceRef => ({
        file,
        member,
        kind: 'graphql-mutation',
        tree: 'account',
        gate: {
          anyOf: [
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES,
          ],
        },
        intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
        // spec-server-1 fix (ninth analyze pass, FR-004/SC-004): with the
        // root rule's reversal to full CRUD, Content Full Access now reaches
        // ordinary UPDATE on the account tree via `ROOT_CASCADE` too — the
        // SAME named, accepted SC-004 exception as A6.
        acceptedExtraReachers: [
          {
            credential: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
            reason:
              'SC-004 accepted exception — FR-004 cascades full CRUD from the inheritance root, which satisfies the owner branch of this dual-path gate exactly as an account owner would.',
          },
        ],
        // T070m finding: NOT empty — `global-admin` still holds ordinary
        // UPDATE on the account tree via the Slice-A-only legacy CRUD+GRANT
        // cascade (`LEGACY_CASCADES.globalAdminRootCrud`), so it reaches this
        // dual-path gate's OWNER branch today, exactly as any other
        // account-tree UPDATE holder would. `global-support`'s platform-
        // SUBTREE cascade does not cover `account`, so it is correctly absent.
        legacyReachers: [],
      })
    ),
    // T074 (Slice B): Support needs the organization LIST to reach the org-owned resources spec row 7 gives it. Gated on A7's own privilege, for which T076 added a platform-level rule (holder set unchanged: `platform-support` alone).
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'organizations',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
  ],

  // ===== A8 — delete callout/contribution/space; delete an org-owned
  // innovation pack or hub; set publisher =====
  A8: [
    ...(
      [
        [
          'src/domain/collaboration/callout/callout.resolver.mutations.ts',
          'deleteCallout',
          'space',
        ],
        [
          'src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.ts',
          'deleteContribution',
          'space',
        ],
        [
          'src/domain/space/space/space.resolver.mutations.ts',
          'deleteSpace',
          'space',
        ],
        [
          'src/library/innovation-pack/innovation.pack.resolver.mutations.ts',
          'deleteInnovationPack',
          'account',
        ],
        [
          'src/domain/innovation-hub/innovation.hub.resolver.mutations.ts',
          'deleteInnovationHub',
          'account',
        ],
      ] as const
    ).map(
      ([file, member, tree]): SurfaceRef => ({
        file,
        member,
        kind: 'graphql-mutation',
        tree: tree as TreeId,
        gate: {
          anyOf: [
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
          ],
        },
        intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
        // sec-server-3/corr-server-2 fix: `global-support` is deliberately
        // NOT a legacy reacher here any more — it was reachable only
        // through the ROOT rule's PLATFORM_CONTENT_FULL_ACCESS credential
        // list, which no longer includes it (the root rule cascading
        // GLOBAL_SUPPORT platform-wide, bypassing the per-space
        // `allowPlatformSupportAsAdmin` consent gate, was the widening this
        // fix removes). `global-admin` still reaches via
        // `LEGACY_CASCADES.globalAdminRootCrud`'s DELETE cascade.
        legacyReachers: [],
      })
    ),
    {
      file: 'src/domain/collaboration/callout/callout.resolver.mutations.ts',
      member: 'updateCalloutPublishInfo',
      kind: 'graphql-mutation',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
    },
    // ===== T074 (Slice B) — re-gated `platformAdmin` READ/DISCOVERY surfaces.
    // Every one of these gated on the `PLATFORM_ADMIN` catch-all until this
    // slice, and every one was INVISIBLE to `surface.drift.spec.ts` rule 1
    // while it did: `scanned.privileges.ts` excluded `PLATFORM_ADMIN` from the
    // scan globally (~24 unrelated files reference it), so this census had a
    // documented blind spot exactly the size of the catch-all. Re-gating each
    // onto its owning family's privilege moved them INSIDE
    // `SCANNED_PRIVILEGES`, and rule 1 failed on all eleven files at once —
    // the blind spot closing itself.
    //
    // All carry `declarationOnly`: a denied READ here returns an empty list or
    // a masked field rather than throwing (`virtualContributors` literally
    // `return []`), so an FR-024 matrix cell asserting a denial could not
    // distinguish "denied" from "nothing to show". Reachability and drift still
    // cover them.
    // Spec row 2 owns "the platform-content administration surface" — these five all-platform listings ARE that surface.
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'accounts',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'innovationHubs',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'innovationPacks',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'spaces',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'virtualContributors',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    // Returns [] rather than throwing when denied — the reason every entry in this block is declarationOnly.
    {
      file: 'src/domain/community/virtual-contributor/virtual.contributor.resolver.queries.ts',
      member: 'virtualContributors',
      kind: 'graphql-query',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
  ],

  // ===== A9 — move space / hub / pack / VC / callout =====
  // `MOVE_POST` resolved (T040b instruction): granted in
  // `post.service.authorization.ts` but NO resolver mutation checks it
  // (`post.dto.move.ts` exists, unwired) — a granted-but-unreachable
  // privilege, not a gate site. A9 stays at 9, not 10.
  A9: [
    // The three cross-L0 moves (spec 030) share ONE resolver-local
    // synthetic policy checked via the (legacy, retiring) PLATFORM_ADMIN
    // privilege — NOT the shared platform-wide PLATFORM_ADMIN grant set.
    // KNOWN MODELLING GAP for whoever builds `reachability.spec.ts`
    // (T070m, not this wave): `PRIVILEGE_GRANTS` has no entry for
    // `PLATFORM_ADMIN` (it is not managed by this feature's re-anchoring
    // tasks and its meaning varies per resolver-local policy instance), so
    // `reachers()` cannot yet derive these three correctly from the gate
    // alone — `intendedOwners`/`legacyReachers` below are the source of
    // truth for them until that is resolved.
    // spec-server-10 fix: the resolver's OWN constructor comment says all
    // SEVEN mutations on this file share the ONE synthetic policy — the
    // census previously declared only the three cross-L0 moves. The three
    // promote/demote conversions are in-scope A9 surfaces per spec §Action
    // → owning role ("promote / demote / move a space"); declared here so
    // `platform-resource-admin`'s reach over them is checked, not merely
    // implied by the resolver's shared-policy comment.
    ...(
      [
        'moveSpaceL1ToSpaceL0',
        'moveSpaceL1ToSpaceL2',
        'moveSpaceL2ToSpaceL1',
        'convertSpaceL1ToSpaceL0',
        'convertSpaceL2ToSpaceL1',
        'convertSpaceL1ToSpaceL2',
      ] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/services/api/conversion/conversion.resolver.mutations.ts',
        member,
        kind: 'graphql-mutation',
        tree: 'conversion-admin-synthetic',
        gate: { requires: AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER },
        intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
        legacyReachers: [],
      })
    ),
    // spec-server-10 fix: `convertVirtualContributorToUseKnowledgeBase`
    // rides the SAME synthetic policy as the six space moves/conversions
    // above (same resolver, same constructor field) — it is NOT split onto
    // its own policy, so `platform-resource-admin` reaches it too. Declared
    // as its own A9 entry (rather than left as an undeclared side-effect of
    // sharing the resolver) so the reach is checked, not merely implied.
    {
      file: 'src/services/api/conversion/conversion.resolver.mutations.ts',
      member: 'convertVirtualContributorToUseKnowledgeBase',
      kind: 'graphql-mutation',
      tree: 'conversion-admin-synthetic',
      gate: { requires: AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER },
      intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyReachers: [],
    },
    {
      file: 'src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.ts',
      member: 'moveContributionToCallout',
      kind: 'graphql-mutation',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.MOVE_CONTRIBUTION },
      intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyReachers: [],
    },
    {
      file: 'src/domain/collaboration/callout-transfer/callout.transfer.resolver.mutations.ts',
      member: 'transferCallout',
      kind: 'graphql-mutation',
      // corr-server-9 fix: this surface is checked on the CalloutsSet's OWN
      // authorization (callouts.set.service.authorization.ts) — a
      // DIFFERENT credential rule, with a DIFFERENT legacy reacher, than
      // the `account` tree the other four A9 transfer mutations share.
      tree: 'callouts-set',
      // Both TRANSFER_RESOURCE_OFFER and TRANSFER_RESOURCE_ACCEPT are
      // literally checked (AND, not OR — GateExpr has no `allOf`).
      // `anyOf` is used here as the closest available shape purely so BOTH
      // names are visible to the derivation/drift-scan; it does not change
      // the derived reacher set because the two privileges resolve to an
      // IDENTICAL credential set on the `callouts-set` tree.
      gate: {
        anyOf: [
          AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER,
          AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
        ],
      },
      intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      // GLOBAL_SUPPORT_MANAGER, not GLOBAL_SUPPORT (corr-server-9 fix) —
      // the callouts-set rule's actual legacy reacher; GLOBAL_SUPPORT never
      // reaches this surface (its account-tree grants are cascade:false).
      legacyReachers: [],
    },
    ...(
      [
        'transferInnovationHubToAccount',
        'transferSpaceToAccount',
        'transferInnovationPackToAccount',
        'transferVirtualContributorToAccount',
      ] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/domain/space/account/account.resolver.mutations.ts',
        member,
        kind: 'graphql-mutation' as const,
        tree: 'account' as TreeId,
        // Both TRANSFER_RESOURCE_OFFER (source account) AND
        // TRANSFER_RESOURCE_ACCEPT (target account) are required (AND, not
        // OR) — GateExpr's closed union has no `allOf`. `anyOf` is the
        // closest available shape; it does not change the derived reacher
        // set because both privileges resolve to the IDENTICAL credential
        // set on this feature's grant sets (T037).
        gate: {
          anyOf: [
            AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER,
            AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
          ],
        },
        intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
        legacyReachers: [],
      })
    ),
  ],

  // ===== A10 — platform settings / config =====
  // Contract's "~2" corrected to 6 (T045's own comment already says "5" for
  // platform.resolver.mutations.ts alone; +1 for the well-known-VC mutation).
  A10: [
    ...(
      [
        [
          'src/platform/platform/platform.resolver.mutations.ts',
          'updatePlatformSettings',
        ],
        [
          'src/platform/platform/platform.resolver.mutations.ts',
          'addIframeAllowedURL',
        ],
        [
          'src/platform/platform/platform.resolver.mutations.ts',
          'removeIframeAllowedURL',
        ],
        [
          'src/platform/platform/platform.resolver.mutations.ts',
          'addNotificationEmailToBlacklist',
        ],
        [
          'src/platform/platform/platform.resolver.mutations.ts',
          'removeNotificationEmailFromBlacklist',
        ],
        [
          'src/platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.resolver.mutations.ts',
          'setPlatformWellKnownVirtualContributor',
        ],
      ] as const
    ).map(
      ([file, member]): SurfaceRef => ({
        file,
        member,
        kind: 'graphql-mutation',
        tree: 'platform',
        gate: { requires: AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN },
        intendedOwners: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
        // sec-server-23: the resolver PINS its own check to this surface's
        // pre-feature reacher set {GA, GS, GLM} — GLOBAL_PLATFORM_MANAGER is
        // deliberately excluded there. It stays declared HERE because FR-034's
        // derivation reads the SHARED platform policy, which does still grant
        // GPM the privilege; the resolver-local pin is invisible to it, exactly
        // as sec-server-4/-7's pins are on A4/A5. Removing it would make the
        // reachability assertion fail against a widening that genuinely exists
        // at the policy layer, and hide it rather than record it.
        // (This gap between derived and enforced reach is R-B / sec-server-26.)
        legacyReachers: [],
      })
    ),
    // T074 (Slice B): notification configuration — spec row 4 owns "settings, integrations, notification config".
    {
      file: 'src/services/api/notification-recipients/notification.recipients.resolver.queries.ts',
      member: 'notificationRecipients',
      kind: 'graphql-query',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
  ],

  // ===== A11 — operational machinery (032, pre-existing) =====
  // Contract's "~10" corrected to 13 by grepping the tree.
  A11: [
    ...(
      [
        [
          'src/services/ai-server/ai-server/ai.server.resolver.mutations.ts',
          'cleanupCollections',
          'ai-server',
        ],
        [
          'src/domain/community/virtual-assistant/virtual.assistant.resolver.mutations.ts',
          'updateAssistantActorCapabilities',
          'virtual-assistant',
        ],
        [
          'src/platform-admin/in-app-notification/in.app.notification.admin.resolver.mutations.ts',
          'adminInAppNotificationsPrune',
          'platform',
        ],
        [
          'src/platform-admin/services/avatars/admin.avatarresolver.mutations.ts',
          'adminUpdateContributorAvatars',
          'platform',
        ],
        [
          'src/platform-admin/services/geolocation/admin.geolocation.resolver.mutations.ts',
          'adminUpdateGeoLocationData',
          'platform',
        ],
        [
          'src/platform-admin/services/search/admin.search.ingest.resolver.mutations.ts',
          'adminSearchIngestFromScratch',
          'platform',
        ],
        [
          'src/platform-admin/domain/whiteboard/admin.whiteboard.resolver.mutations.ts',
          'adminUploadFilesFromContentToStorageBucket',
          'platform',
        ],
        [
          'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
          'refreshAllBodiesOfKnowledge',
          'platform',
        ],
        [
          'src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts',
          'adminCommunicationEnsureAccessToCommunications',
          'communication-admin-synthetic',
        ],
        [
          'src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts',
          'adminCommunicationRemoveOrphanedRoom',
          'communication-admin-synthetic',
        ],
        [
          'src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts',
          'adminCommunicationUpdateRoomState',
          'communication-admin-synthetic',
        ],
        [
          'src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts',
          'adminCommunicationMigrateOrphanedConversations',
          'communication-admin-synthetic',
        ],
        [
          'src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts',
          'adminCommunicationSyncSpaceHierarchy',
          'communication-admin-synthetic',
        ],
      ] as const
    ).map(
      ([file, member, tree]): SurfaceRef => ({
        file,
        member,
        kind: 'graphql-mutation',
        tree: tree as TreeId,
        gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
        intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        legacyReachers: [],
      })
    ),
    // T074 (Slice B): the operational family's read/discovery surfaces. Spec row 5 owns Matrix/comms housekeeping and AI persona / assistant-capability config; reading an authorization policy is the diagnostic twin of the authorization RESET it also owns.
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'virtualAssistant',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.fields.ts',
      member: 'communication',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.communication.fields.ts',
      member: 'adminCommunicationMembership',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/platform-admin/admin/platform.admin.resolver.communication.fields.ts',
      member: 'adminCommunicationOrphanedUsage',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/services/api/lookup/lookup.resolver.fields.ts',
      member: 'authorizationPolicy',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    {
      file: 'src/services/api/lookup/lookup.resolver.fields.ts',
      member: 'authorizationPrivilegesForUser',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
    // The only setting behind it is `promptGraphEditingEnabled` — assistant-capability config (A11), not platform settings (A10).
    {
      file: 'src/domain/community/virtual-contributor/virtual.contributor.resolver.mutations.ts',
      member: 'updateVirtualContributorPlatformSettings',
      kind: 'graphql-mutation',
      tree: 'virtual-contributor',
      gate: { requires: AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
  ],

  // ===== A12 — assign/revoke license plans =====
  // Contract's "2" corrected to 5: assign/revoke split into Account+Space
  // variants (checked via GRANT on the licensing-framework tree), plus the
  // baseline-plan mutation (checked via ACCOUNT_LICENSE_MANAGE directly).
  A12: [
    // `createWingbackAccount` was declared here through Slice A so the
    // drift scan's per-file count on this resolver matched reality. It is
    // GONE at Slice B (FR-021/T079) — deleted with the rest of Wingback,
    // never re-gated.
    ...(
      [
        'assignLicensePlanToAccount',
        'assignLicensePlanToSpace',
        'revokeLicensePlanFromAccount',
        'revokeLicensePlanFromSpace',
      ] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/platform-admin/licensing/admin.licensing.resolver.mutations.ts',
        member,
        kind: 'graphql-mutation',
        tree: 'licensing-framework',
        gate: { requires: AuthorizationPrivilege.GRANT },
        intendedOwners: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
        legacyReachers: [],
      })
    ),
    {
      file: 'src/domain/space/account/account.resolver.mutations.ts',
      member: 'updateBaselineLicensePlanOnAccount',
      kind: 'graphql-mutation',
      tree: 'account',
      gate: { requires: AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
      legacyReachers: [],
    },
  ],

  // ===== A13 — define license plans + entitlement mappings =====
  // Contract's "~4" corrected to 5. The gate literally checked at each
  // resolver is bare DELETE/UPDATE/CREATE, not PLATFORM_SETTINGS_ADMIN —
  // one of the two documented exceptions (alongside A9's three conversion
  // mutations) where the enforced call site's own privilege is a bare CRUD
  // verb rather than this feature's dedicated one. corr-server-7/
  // corr-server-10 fix: that bare CRUD check is now against a
  // resolver-local SYNTHETIC in-memory policy
  // (`GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN`) granting exactly
  // {platform-settings-admin, global-admin, global-support,
  // global-license-manager, global-platform-manager} — NOT
  // `licensingFramework.authorization`, which inherits the root policy and
  // would otherwise let `platform-content-full-access` reach these surfaces
  // via T036a's CRUD cascade, a family SC-004's exception does not cover.
  // GLOBAL_ADMIN is now an EXPLICIT legacy reacher (it previously reached
  // A13 only via that same undeclared root cascade). GLOBAL_SUPPORT is too
  // (corr-server-12 fix): pre-feature, these resolvers checked
  // `licensingFramework.authorization` directly, which inherits
  // `platform.authorization` and its `globalSupportPlatformAdmin`
  // `cascade: true` rule — a reach the census likewise omitted until now.
  A13: (
    [
      [
        'src/platform/licensing/credential-based/license-plan/license.plan.resolver.mutations.ts',
        'deleteLicensePlan',
        AuthorizationPrivilege.DELETE,
      ],
      [
        'src/platform/licensing/credential-based/license-plan/license.plan.resolver.mutations.ts',
        'updateLicensePlan',
        AuthorizationPrivilege.UPDATE,
      ],
      [
        'src/platform/licensing/credential-based/license-policy/license.policy.resolver.mutations.ts',
        'adminLicensePolicyDeleteCredentialRule',
        AuthorizationPrivilege.DELETE,
      ],
      [
        'src/platform/licensing/credential-based/license-policy/license.policy.resolver.mutations.ts',
        'adminLicensePolicyUpdateCredentialRule',
        AuthorizationPrivilege.UPDATE,
      ],
      [
        'src/platform/licensing/credential-based/license-policy/license.policy.resolver.mutations.ts',
        'adminLicensePolicyCreateCredentialRule',
        AuthorizationPrivilege.CREATE,
      ],
    ] as const
  ).map(
    ([file, member, literalGate]): SurfaceRef => ({
      file,
      member,
      kind: 'graphql-mutation',
      tree: 'licensing-framework',
      gate: { requires: literalGate },
      intendedOwners: [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
      legacyReachers: [],
    })
  ),

  // ===== A14 — change space visibility =====
  // The one row whose `member` moves between slices (T078 renames it).
  A14: [
    {
      file: 'src/domain/space/space/space.resolver.mutations.ts',
      member: {
        A: 'updateSpacePlatformSettings',
        B: 'adminUpdateSpaceVisibility',
      },
      kind: 'graphql-mutation',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
      // T070m finding: `global-license-manager` already holds
      // ACCOUNT_LICENSE_MANAGE today (account.service.authorization.ts,
      // pre-dating T037's additive extension) — omitted here originally.
      legacyReachers: [],
    },
  ],

  // ===== A15 — in-space support; manage the forum =====
  A15: [
    {
      file: 'src/domain/space/space/space.service.platform.roles.access.ts',
      member: 'getAccessPrivilegesForPlatformSupport',
      kind: 'graphql-field', // exposed indirectly via every space-scoped mutation/field the resulting platformRolesAccess row gates
      tree: 'space',
      gate: {
        condition: 'allowPlatformSupportAsAdmin',
        reason:
          'A15 in-space support is gated by a per-space setting (space.settings.privacy.allowPlatformSupportAsAdmin), not a platform privilege — the same flag legacy global-support keys on.',
      },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      legacyReachers: [],
    },
    // Contract's A15 count ("2") pre-dates the discovery that the forum
    // family is TWO mutations, not one ("forum update" was shorthand) —
    // both `updateDiscussion` and `deleteDiscussion` check
    // PLATFORM_FORUM_MANAGE independently; declared as two entries so
    // FR-024 asserts each separately (A15 is genuinely 3 surfaces).
    {
      file: 'src/platform/forum-discussion/discussion.resolver.mutations.ts',
      member: 'updateDiscussion',
      kind: 'graphql-mutation',
      tree: 'forum',
      gate: { requires: AuthorizationPrivilege.PLATFORM_FORUM_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      legacyReachers: [],
    },
    {
      file: 'src/platform/forum-discussion/discussion.resolver.mutations.ts',
      member: 'deleteDiscussion',
      kind: 'graphql-mutation',
      tree: 'forum',
      gate: { requires: AuthorizationPrivilege.PLATFORM_FORUM_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      legacyReachers: [],
    },
    // T074 (Slice B): the SECONDARY gate only. An ordinary member creates a discussion through CREATE_DISCUSSION; the RELEASES category additionally requires the forum privilege, which is Support's (A15).
    {
      file: 'src/platform/forum/forum.resolver.mutations.ts',
      member: 'createDiscussion',
      kind: 'graphql-mutation',
      tree: 'forum',
      gate: { requires: AuthorizationPrivilege.PLATFORM_FORUM_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      legacyReachers: [],
      lifecycle: { declarationOnly: true },
    },
  ],

  // ===== A16 — read across spaces =====
  // The ONE declared FR-010 exception: Content Full Access reaches this
  // through the root cascade's plain READ, and that is accepted (A16 is a
  // read family, holds no cell in the admin-family denial grid).
  A16: [
    {
      file: 'src/domain/space/space/space.service.platform.roles.access.ts',
      member: 'createPlatformRolesAccess',
      kind: 'graphql-field',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.READ },
      intendedOwners: [AuthorizationCredential.PLATFORM_SPACES_READER],
      acceptedExtraReachers: [
        {
          credential: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
          reason:
            'FR-010 read-family exception — the root cascade grants READ on the space tree; A16 holds no admin-family cell so this is accepted, not a defect.',
        },
      ],
      // T070m finding: Slice A's legacy root cascade
      // (`platform.authorization.policy.service.ts`'s god-mode rule) grants
      // plain READ on the space tree to global-admin, alongside the void
      // `global-spaces-reader` row — both read across spaces right now, and
      // the additive rule requires each stay reachable through Slice A.
      // `global-support` is deliberately ABSENT here (sec-server-3/
      // corr-server-2 fix): its cross-space READ came ONLY from the root
      // rule's now-removed GLOBAL_SUPPORT membership — it has no unconditional
      // READ on the space tree from any other rule (only per-space,
      // flag-gated privileges via `allowPlatformSupportAsAdmin`). Retired
      // outright at Slice B (T072/T081), same as every other legacy reacher.
      legacyReachers: [],
    },
  ],

  // ===== A17 — change an entity's nameID — 2 surfaces, both Slice B =====
  // Intent is EMPTY and legitimately so: owned by the entity admin, no
  // global role reaches it (spec row 2, FR-020). Both surfaces LANDED with
  // T078. The privilege is granted on each entity's OWN policy — the user's
  // self-management credential, the organization's admins, the VC's account
  // admin, and (on a rule deliberately separate from the space-admin rule,
  // which also admits platform roles holding UPDATE) the space's own admins.
  // None of those is a platform credential, which is why the derived reacher
  // set stays empty.
  A17: [
    {
      // T078 (Slice B) created it — the `deferred` marker and its
      // deliberately-unresolvable placeholder path are gone with the
      // deferral.
      file: 'src/domain/actor/actor/actor.resolver.mutations.ts',
      member: 'updateActorNameID',
      kind: 'graphql-mutation',
      tree: 'user',
      gate: { requires: AuthorizationPrivilege.UPDATE_NAMEID },
      intendedOwners: [],
      legacyReachers: [],
    },
    {
      // The protected section of the general `updateSpace` mutation: supplying
      // `nameID` requires UPDATE_NAMEID IN ADDITION to the ordinary UPDATE the
      // rest of the input needs.
      file: 'src/domain/space/space/space.resolver.mutations.ts',
      member: 'updateSpace (protected nameID section)',
      kind: 'graphql-field',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.UPDATE_NAMEID },
      intendedOwners: [],
      legacyReachers: [],
    },
  ],

  // ===== A18 — direct-edit user.email via platform settings =====
  // Removed as a bug (FR-020), never re-gated in EITHER slice — zero
  // entries in both. This row's array is intentionally empty; its
  // `{retired}` marker lives structurally (an absent lifecycle would be
  // wrong here too, but with no surfaces there is nothing to attach it to —
  // `reachability.spec.ts`, T070m, is told to skip A18 entirely by its
  // empty array, matching the `retired` semantics of every other row's
  // marker).
  A18: [],

  // ===== A19 — read the audit trail — 3 gate sites, 2 GraphQL surfaces =====
  A19: [
    {
      file: 'src/services/mcp-server/tools/audit-log-analyze.tool.ts',
      member: 'audit-log-analyze',
      kind: 'mcp-tool',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_AUDIT_READ },
      intendedOwners: [AuthorizationCredential.PLATFORM_AUDIT_READER],
      legacyReachers: [],
    },
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts',
      member: 'latestUserEmailChangeAuditEntry',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_AUDIT_READ },
      intendedOwners: [AuthorizationCredential.PLATFORM_AUDIT_READER],
      legacyReachers: [],
    },
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts',
      member: 'userEmailChangeAuditEntries',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_AUDIT_READ },
      intendedOwners: [AuthorizationCredential.PLATFORM_AUDIT_READER],
      legacyReachers: [],
    },
  ],

  // ===== A20 — read Platform … holder lists — 4 field resolvers, PLUS
  // (sec-server-10 fix) the two admin.authorization.resolver.queries.ts
  // credential-based reads of the SAME data =====
  //
  // sec-server-10 fix: `file` moved from `role.set.resolver.fields.ts` to
  // `platform.role.holder.list.access.ts` — the SHARED predicate the
  // isAccessGranted/throw logic was extracted into, so a second surface
  // reading the same holder-list data by credential rather than by
  // `RoleName` (`actorsWithCredential`/`usersWithAuthorizationCredential`)
  // cannot drift from it. `role.set.resolver.fields.ts` (which still NAMES
  // the four field resolvers, but delegates the actual check) is declared
  // in `INDIRECT_ENFORCEMENT_FILES` below, the same shape as A1/A2's
  // resolver → rule-engine-service indirection.
  A20: [
    ...(
      [
        'usersInRole',
        'usersInRoles',
        'organizationsInRole',
        'organizationsInRoles',
      ] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/platform/platform-role/platform.role.holder.list.access.ts',
        member,
        kind: 'graphql-field',
        tree: 'role-set',
        gate: { requires: AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ },
        intendedOwners: [
          AuthorizationCredential.PLATFORM_ROLES_ADMIN,
          AuthorizationCredential.PLATFORM_AUDIT_READER,
        ],
        legacyReachers: [],
      })
    ),
    ...(
      ['actorsWithCredential', 'usersWithAuthorizationCredential'] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/platform/platform-role/platform.role.holder.list.access.ts',
        member,
        kind: 'graphql-query',
        tree: 'role-set',
        gate: { requires: AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ },
        intendedOwners: [
          AuthorizationCredential.PLATFORM_ROLES_ADMIN,
          AuthorizationCredential.PLATFORM_AUDIT_READER,
        ],
        // sec-server-10 fix: SAME legacy reach as the four field resolvers
        // above — `PLATFORM_ROLE_HOLDERS_READ`'s grant set
        // (`privilege.grants.ts`) is a single, tree-independent
        // `ManagedPrivilege` entry, so `reachers()` derives the identical
        // {global-admin, global-support, global-license-manager} set here
        // regardless of which resolver file the gate is checked from. This
        // pre-existing legacy reach is UNCHANGED by the sec-server-10 fix —
        // what changed is that a `platform-*` credential argument no longer
        // ALSO satisfies the blanket `READ_USERS` any registered user holds.
        legacyReachers: [],
      })
    ),
  ],

  // ===== A20b — read Feature … holder lists — the SAME 4 field resolvers
  // plus the same two admin queries, the `feature-*` payload half (research
  // D9, sixth clarification pass) =====
  A20b: [
    ...(
      [
        'usersInRole',
        'usersInRoles',
        'organizationsInRole',
        'organizationsInRoles',
      ] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/platform/platform-role/platform.role.holder.list.access.ts',
        member,
        kind: 'graphql-field',
        tree: 'role-set',
        gate: {
          anyOf: [
            AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ,
            AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ,
          ],
        },
        intendedOwners: [
          AuthorizationCredential.PLATFORM_USERS_ADMIN,
          AuthorizationCredential.PLATFORM_ROLES_ADMIN,
          AuthorizationCredential.PLATFORM_AUDIT_READER,
        ],
        legacyReachers: [],
      })
    ),
    ...(
      ['actorsWithCredential', 'usersWithAuthorizationCredential'] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/platform/platform-role/platform.role.holder.list.access.ts',
        member,
        kind: 'graphql-query',
        tree: 'role-set',
        gate: {
          anyOf: [
            AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ,
            AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ,
          ],
        },
        intendedOwners: [
          AuthorizationCredential.PLATFORM_USERS_ADMIN,
          AuthorizationCredential.PLATFORM_ROLES_ADMIN,
          AuthorizationCredential.PLATFORM_AUDIT_READER,
        ],
        // sec-server-10 fix: same reasoning as A20's query entries above —
        // `reachers()` derives this from the shared `ManagedPrivilege`
        // grant sets regardless of tree/file, so the legacy reach here must
        // match the field resolvers' identical privilege pair exactly.
        legacyReachers: [],
      })
    ),
  ],

  // ===== A21 — set/clear user.serviceProfile =====
  A21: [
    {
      file: 'src/domain/community/user/user.service.ts',
      member: 'updateUser',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.SET_SERVICE_PROFILE },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [],
    },
    // sec-server-11 fix: `user.resolver.mutations.ts`'s `updateUser` now
    // gates SET_SERVICE_PROFILE itself, ahead of delegating to
    // `UserService.updateUser` above — a genuine SECOND, resolver-level
    // check of the SAME privilege (defense in depth), added so an
    // unprivileged/anonymous caller is rejected without reaching the
    // redundant DB lookup + fail-closed audit writer in the service.
    {
      file: 'src/domain/community/user/user.resolver.mutations.ts',
      member: 'updateUser',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.SET_SERVICE_PROFILE },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [],
    },
  ],
};
