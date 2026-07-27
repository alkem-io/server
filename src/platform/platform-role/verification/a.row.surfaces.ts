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
  readonly kind: 'graphql-mutation' | 'graphql-field' | 'mcp-tool';
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
    | { readonly retiredIn: 'B' }; // live at A, deleted at B (A1's four credential mutations)
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
 * where `GRANT_GLOBAL_ADMINS` / `FEATURE_ROLE_ASSIGN` are literally
 * checked (`checkAssignerCapability()`, via `isAccessGranted()`). The
 * census therefore declares A1/A2's `file` as the RULE-ENGINE service
 * (`SurfaceRef.file` is documented to mean "where the gate is enforced",
 * not "where the mutation is declared") — which leaves the resolver file
 * itself holding a REAL, separate `GRANT_GLOBAL_ADMINS` hit with no census
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
  // `GRANT_GLOBAL_ADMINS` appears there only as the `privilegeRequired`
  // variable's initial value, immediately overwritten by the
  // `roleSet.type` switch for every reachable case (SPACE → `GRANT` or
  // `ROLESET_ENTRY_ROLE_ASSIGN`; ORGANIZATION → `GRANT`) — a dead literal,
  // not a live PLATFORM-role gate, and outside this census's 21 rows.
  'src/domain/access/role-set/role.set.resolver.mutations.ts',
];

const GA = AuthorizationCredential.GLOBAL_ADMIN;
const GS = AuthorizationCredential.GLOBAL_SUPPORT;
const GLM = AuthorizationCredential.GLOBAL_LICENSE_MANAGER;
const GPM = AuthorizationCredential.GLOBAL_PLATFORM_MANAGER;

export const A_ROW_SURFACES: Record<ARowId, readonly SurfaceRef[]> = {
  // ===== A1 — assign/revoke a PLATFORM role =====================
  // Owner: Roles Admin, on the two `*PlatformRole*` surfaces only. The four
  // FR-022 credential mutations share `GRANT_GLOBAL_ADMINS` and are declared
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
      gate: { requires: AuthorizationPrivilege.GRANT_GLOBAL_ADMINS },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [GA],
    },
    {
      file: 'src/platform/platform-role/platform.role.assignment.rules.service.ts',
      member: 'removePlatformRoleFromUser',
      kind: 'graphql-mutation',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.GRANT_GLOBAL_ADMINS },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [GA],
    },
    // --- FR-022's four (T034a's pin) — declared, non-multiplying.
    {
      file: 'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
      member: 'grantCredentialToUser',
      kind: 'graphql-mutation',
      tree: 'credential-admin-synthetic',
      gate: {
        credential: GA,
        reason:
          "FR-022 pin: held ahead of the shared GRANT_GLOBAL_ADMINS check (via a resolver-local, hardcoded-to-[GLOBAL_ADMIN] IAuthorizationPolicy) so Slice A's widening of the SHARED privilege's grant set cannot reach this mutation.",
      },
      intendedOwners: [],
      legacyReachers: [GA],
      lifecycle: { retiredIn: 'B' },
    },
    {
      file: 'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
      member: 'revokeCredentialFromUser',
      kind: 'graphql-mutation',
      tree: 'credential-admin-synthetic',
      gate: {
        credential: GA,
        reason:
          "FR-022 pin: held ahead of the shared GRANT_GLOBAL_ADMINS check (via a resolver-local, hardcoded-to-[GLOBAL_ADMIN] IAuthorizationPolicy) so Slice A's widening of the SHARED privilege's grant set cannot reach this mutation.",
      },
      intendedOwners: [],
      legacyReachers: [GA],
      lifecycle: { retiredIn: 'B' },
    },
    {
      file: 'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
      member: 'grantCredentialToOrganization',
      kind: 'graphql-mutation',
      tree: 'credential-admin-synthetic',
      gate: {
        credential: GA,
        reason:
          "FR-022 pin: held ahead of the shared GRANT_GLOBAL_ADMINS check (via a resolver-local, hardcoded-to-[GLOBAL_ADMIN] IAuthorizationPolicy) so Slice A's widening of the SHARED privilege's grant set cannot reach this mutation.",
      },
      intendedOwners: [],
      legacyReachers: [GA],
      lifecycle: { retiredIn: 'B' },
    },
    {
      file: 'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
      member: 'revokeCredentialFromOrganization',
      kind: 'graphql-mutation',
      tree: 'credential-admin-synthetic',
      gate: {
        credential: GA,
        reason:
          "FR-022 pin: held ahead of the shared GRANT_GLOBAL_ADMINS check (via a resolver-local, hardcoded-to-[GLOBAL_ADMIN] IAuthorizationPolicy) so Slice A's widening of the SHARED privilege's grant set cannot reach this mutation.",
      },
      intendedOwners: [],
      legacyReachers: [GA],
      lifecycle: { retiredIn: 'B' },
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
      legacyReachers: [GA, GS, GLM],
    })
  ),

  // ===== A4 — change login email =====
  A4: [
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts',
      member: 'adminUserEmailChange',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [GA, GS, GLM],
    },
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts',
      member: 'adminUserEmailChangeDriftResolve',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [GA, GS, GLM],
    },
  ],

  // ===== A5 — delete user; reset identity/account =====
  // `deleteUser` is the D5 dual path (owner-self-delete stays on plain
  // DELETE via USER_SELF_MANAGEMENT); the other two are replacement gates.
  A5: [
    {
      file: 'src/services/api/registration/registration.resolver.mutations.ts',
      member: 'deleteUser',
      kind: 'graphql-mutation',
      tree: 'user',
      gate: {
        anyOf: [
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
        ],
      },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [GA, GS, GLM, GPM],
    },
    {
      file: 'src/platform-admin/core/identity/admin.identity.resolver.mutations.ts',
      member: 'adminIdentityDeleteKratosIdentity',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [GA, GS, GLM, GPM],
    },
    {
      file: 'src/platform-admin/domain/user/admin.users.resolver.mutations.ts',
      member: 'adminUserAccountDelete',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_USERS_ADMIN },
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      legacyReachers: [GA, GS, GLM, GPM],
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
      legacyReachers: [GA, GS, AuthorizationCredential.BETA_TESTER],
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
      legacyReachers: [GA, GS],
    },
  ],

  // ===== A7 — edit an org-owned pack/hub + CRUD its templates =====
  // Contract's "~5" corrected to 8 by grepping the tree (T040b instruction):
  // update{InnovationPack,InnovationHub} + create/update/delete of
  // templates across three template resolver files.
  A7: (
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
      legacyReachers: [],
    })
  ),

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
        legacyReachers: [GA, GS],
      })
    ),
    {
      file: 'src/domain/collaboration/callout/callout.resolver.mutations.ts',
      member: 'updateCalloutPublishInfo',
      kind: 'graphql-mutation',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER },
      intendedOwners: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      legacyReachers: [GA, GS],
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
    ...(
      [
        'moveSpaceL1ToSpaceL0',
        'moveSpaceL1ToSpaceL2',
        'moveSpaceL2ToSpaceL1',
      ] as const
    ).map(
      (member): SurfaceRef => ({
        file: 'src/services/api/conversion/conversion.resolver.mutations.ts',
        member,
        kind: 'graphql-mutation',
        tree: 'conversion-admin-synthetic',
        gate: { requires: AuthorizationPrivilege.PLATFORM_ADMIN },
        intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
        legacyReachers: [GA],
      })
    ),
    {
      file: 'src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.ts',
      member: 'moveContributionToCallout',
      kind: 'graphql-mutation',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.MOVE_CONTRIBUTION },
      intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyReachers: [GA],
    },
    {
      file: 'src/domain/collaboration/callout-transfer/callout.transfer.resolver.mutations.ts',
      member: 'transferCallout',
      kind: 'graphql-mutation',
      tree: 'account',
      // Both TRANSFER_RESOURCE_OFFER and TRANSFER_RESOURCE_ACCEPT are
      // literally checked (AND, not OR — GateExpr has no `allOf`).
      // `anyOf` is used here as the closest available shape purely so BOTH
      // names are visible to the derivation/drift-scan; it does not change
      // the derived reacher set because the two privileges resolve to an
      // IDENTICAL credential set on this feature's grant sets (T037).
      gate: {
        anyOf: [
          AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER,
          AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
        ],
      },
      intendedOwners: [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      legacyReachers: [GA, GS],
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
        legacyReachers: [GA, GS],
      })
    ),
  ],

  // ===== A10 — platform settings / config =====
  // Contract's "~2" corrected to 6 (T045's own comment already says "5" for
  // platform.resolver.mutations.ts alone; +1 for the well-known-VC mutation).
  A10: (
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
      legacyReachers: [GA, GPM, GS, GLM],
    })
  ),

  // ===== A11 — operational machinery (032, pre-existing) =====
  // Contract's "~10" corrected to 13 by grepping the tree.
  A11: (
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
      legacyReachers: [GA, GS, GLM],
    })
  ),

  // ===== A12 — assign/revoke license plans =====
  // Contract's "2" corrected to 5: assign/revoke split into Account+Space
  // variants (checked via GRANT on the licensing-framework tree), plus the
  // baseline-plan mutation (checked via ACCOUNT_LICENSE_MANAGE directly).
  A12: [
    // `createWingbackAccount` is Wingback-specific (wholly deleted at
    // Slice B, FR-021/T079) but rides THIS family's own privilege today —
    // declared so the drift scan's per-file count on this resolver file
    // matches reality; deleted alongside the rest of Wingback, not
    // re-gated.
    {
      file: 'src/platform-admin/licensing/admin.licensing.resolver.mutations.ts',
      member: 'createWingbackAccount',
      kind: 'graphql-mutation',
      tree: 'account',
      gate: { requires: AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
      legacyReachers: [GA, GLM],
    },
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
        legacyReachers: [GA, GLM, GPM],
      })
    ),
    {
      file: 'src/domain/space/account/account.resolver.mutations.ts',
      member: 'updateBaselineLicensePlanOnAccount',
      kind: 'graphql-mutation',
      tree: 'account',
      gate: { requires: AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
      legacyReachers: [GA, GLM],
    },
  ],

  // ===== A13 — define license plans + entitlement mappings =====
  // Contract's "~4" corrected to 5. Re-anchored via the licensing-framework
  // `licensings` credential rule granting ordinary CRUD (not a distinctly
  // named privilege) to `platform-settings-admin` — so the gate literally
  // checked at each resolver is bare DELETE/UPDATE/CREATE, not
  // PLATFORM_SETTINGS_ADMIN. Declared here as PLATFORM_SETTINGS_ADMIN
  // (the OWNING privilege per privilege-map.md's A13 row) since that is
  // what a reviewer means by "this row's privilege" — `reachers()` (T040d)
  // still needs the LITERAL gate to intersect grants correctly, which for
  // this row is one of the two documented exceptions (alongside A9's
  // three conversion mutations) where the enforced call site's own
  // privilege is a bare CRUD verb rather than this feature's dedicated one.
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
      legacyReachers: [GLM, GPM],
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
      legacyReachers: [GA],
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
      legacyReachers: [GS],
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
      legacyReachers: [GA, GS],
    },
    {
      file: 'src/platform/forum-discussion/discussion.resolver.mutations.ts',
      member: 'deleteDiscussion',
      kind: 'graphql-mutation',
      tree: 'forum',
      gate: { requires: AuthorizationPrivilege.PLATFORM_FORUM_MANAGE },
      intendedOwners: [AuthorizationCredential.PLATFORM_SUPPORT],
      legacyReachers: [GA, GS],
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
      legacyReachers: [AuthorizationCredential.GLOBAL_SPACES_READER],
    },
  ],

  // ===== A17 — change an entity's nameID — 2 surfaces, both Slice B =====
  // Intent is EMPTY and legitimately so: owned by the entity admin, no
  // global role reaches it (spec row 2, FR-020). Both surfaces arrive with
  // T078 — declared here now, deferred, so `reachability.spec.ts` (T070m)
  // covers them from the moment they exist rather than needing rediscovery.
  A17: [
    {
      // Does not exist yet — T078 (Slice B) creates it. Not a real path:
      // deliberately unresolvable so it can never accidentally match a
      // real scan hit. `surface.drift.spec.ts` never dereferences a
      // `deferred` entry's `file` (both drift rules discover hits by
      // scanning `src/**/*.ts` forward, then look the file up in the
      // census — they never check a census file for existence).
      file: '(T078, Slice B — updateActorNameID mutation not yet created)',
      member: 'updateActorNameID',
      kind: 'graphql-mutation',
      tree: 'user',
      gate: { requires: AuthorizationPrivilege.UPDATE_NAMEID },
      intendedOwners: [],
      legacyReachers: [],
      lifecycle: { deferred: 'B' },
    },
    {
      file: '(T078, Slice B — content-entity nameID protected section not yet created)',
      member: 'nameID (protected section of the general content-entity update)',
      kind: 'graphql-field',
      tree: 'space',
      gate: { requires: AuthorizationPrivilege.UPDATE_NAMEID },
      intendedOwners: [],
      legacyReachers: [],
      lifecycle: { deferred: 'B' },
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
      legacyReachers: [GA, GS, GLM],
    },
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts',
      member: 'latestUserEmailChangeAuditEntry',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_AUDIT_READ },
      intendedOwners: [AuthorizationCredential.PLATFORM_AUDIT_READER],
      legacyReachers: [GA, GS, GLM],
    },
    {
      file: 'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.ts',
      member: 'userEmailChangeAuditEntries',
      kind: 'graphql-field',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.PLATFORM_AUDIT_READ },
      intendedOwners: [AuthorizationCredential.PLATFORM_AUDIT_READER],
      legacyReachers: [GA, GS, GLM],
    },
  ],

  // ===== A20 — read Platform … holder lists — 4 field resolvers =====
  A20: (
    [
      'usersInRole',
      'usersInRoles',
      'organizationsInRole',
      'organizationsInRoles',
    ] as const
  ).map(
    (member): SurfaceRef => ({
      file: 'src/domain/access/role-set/role.set.resolver.fields.ts',
      member,
      kind: 'graphql-field',
      tree: 'role-set',
      gate: { requires: AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ },
      intendedOwners: [
        AuthorizationCredential.PLATFORM_ROLES_ADMIN,
        AuthorizationCredential.PLATFORM_AUDIT_READER,
      ],
      legacyReachers: [GA, GS, GLM],
    })
  ),

  // ===== A20b — read Feature … holder lists — the SAME 4 resolvers, the
  // `feature-*` payload half (research D9, sixth clarification pass) =====
  A20b: (
    [
      'usersInRole',
      'usersInRoles',
      'organizationsInRole',
      'organizationsInRoles',
    ] as const
  ).map(
    (member): SurfaceRef => ({
      file: 'src/domain/access/role-set/role.set.resolver.fields.ts',
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
      legacyReachers: [GA, GS, GLM],
    })
  ),

  // ===== A21 — set/clear user.serviceProfile =====
  A21: [
    {
      file: 'src/domain/community/user/user.service.ts',
      member: 'updateUser',
      kind: 'graphql-mutation',
      tree: 'platform',
      gate: { requires: AuthorizationPrivilege.SET_SERVICE_PROFILE },
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [GA, GS, GLM],
    },
  ],
};
