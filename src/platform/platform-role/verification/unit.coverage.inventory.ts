import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import type { PlatformRoleAssignmentRuleViolation } from '../platform.role.assignment.rules.service';
import type { ARowId } from './a.row.surfaces';
import type { ManagedPrivilege } from './privilege.grants';

/**
 * 027-platform-role-redesign (T070a, research D21) — FIVE exhaustive
 * `Record`s, each keyed on a union DERIVED from the runtime enumeration it
 * inventories, so the enumeration stays the single source rather than a
 * second hand-list that can silently fall out of step (D21, D26). `tsc`
 * rejects a literal missing a key — adding a rule, category, A-row,
 * privilege or owned stateful flow without an entry here is a COMPILE
 * ERROR, the strongest available form of "cannot silently grow" (research
 * D21). This file holds no runtime behaviour — it sits in `src/` rather
 * than a test folder deliberately, because neither this closure nor
 * `unit.coverage.spec.ts` (T070b) bites unless `tsc` compiles it as part
 * of the normal build (plan.md §Structure Decision).
 */

// ---------------------------------------------------------------------------
// 1. ASSIGNMENT_RULE_COVERAGE — keyed on the rule engine's OWN ruleId union
//    (`PlatformRoleAssignmentRuleViolation['ruleId']`), not a hand-copied
//    list of the five rule names.
// ---------------------------------------------------------------------------

export interface AssignmentRuleCoverageEntry {
  /** Spec asserting the PERMITTED outcome for this rule. */
  readonly permittedSpec: string;
  /** Spec asserting the DENIED outcome, with the exact contract message. */
  readonly deniedSpec: string;
  /** Spec asserting this rule's position in evaluation order (first
   * failure wins) — the SAME spec file for every rule, since the
   * evaluation-order case is a single test exercising all five. */
  readonly orderSpec: string;
}

const ASSIGNMENT_RULES_SPEC =
  'src/platform/platform-role/platform.role.assignment.rules.service.spec.ts';

export const ASSIGNMENT_RULE_COVERAGE: Record<
  PlatformRoleAssignmentRuleViolation['ruleId'],
  AssignmentRuleCoverageEntry
> = {
  // spec-server-2/sec-server-1 fix (FR-015, ninth clarification pass).
  'self-assignment': {
    permittedSpec: ASSIGNMENT_RULES_SPEC,
    deniedSpec: ASSIGNMENT_RULES_SPEC,
    orderSpec: ASSIGNMENT_RULES_SPEC,
  },
  'assigner-capability': {
    permittedSpec: ASSIGNMENT_RULES_SPEC,
    deniedSpec: ASSIGNMENT_RULES_SPEC,
    orderSpec: ASSIGNMENT_RULES_SPEC,
  },
  'holder-kind': {
    permittedSpec: ASSIGNMENT_RULES_SPEC,
    deniedSpec: ASSIGNMENT_RULES_SPEC,
    orderSpec: ASSIGNMENT_RULES_SPEC,
  },
  'spaces-reader-service-account': {
    permittedSpec: ASSIGNMENT_RULES_SPEC,
    deniedSpec: ASSIGNMENT_RULES_SPEC,
    orderSpec: ASSIGNMENT_RULES_SPEC,
  },
  'audit-reader-exclusion': {
    permittedSpec: ASSIGNMENT_RULES_SPEC,
    deniedSpec: ASSIGNMENT_RULES_SPEC,
    orderSpec: ASSIGNMENT_RULES_SPEC,
  },
  'last-roles-admin': {
    permittedSpec: ASSIGNMENT_RULES_SPEC,
    deniedSpec: ASSIGNMENT_RULES_SPEC,
    orderSpec: ASSIGNMENT_RULES_SPEC,
  },
};

// ---------------------------------------------------------------------------
// 2. AUDIT_WRITER_COVERAGE — keyed on `PlatformAuditCategory` (the runtime
//    enum). Pre-existing categories this feature does NOT change take an
//    explicit `{owner: 'external', spec}` marker rather than an exemption —
//    `platform_operations` is NOT external (T025 changed its placeholder
//    behaviour), so it gets a full entry like the four brand-new categories.
// ---------------------------------------------------------------------------

export type AuditFailMode = 'fail-open' | 'fail-closed';

export type AuditWriterCoverageEntry =
  | {
      readonly failMode: AuditFailMode;
      readonly writeSucceedsSpec: string;
      readonly writeFailsSpec: string;
    }
  | { readonly owner: 'external'; readonly spec: string };

export const AUDIT_WRITER_COVERAGE: Record<
  PlatformAuditCategory,
  AuditWriterCoverageEntry
> = {
  [PlatformAuditCategory.EMAIL_CHANGE]: {
    owner: 'external',
    spec: 'src/domain/community/user-email-change/user.email.change.service.audit.spec.ts',
  },
  [PlatformAuditCategory.PASSWORD_CHANGE]: {
    // Declared (T016) but not yet written by any code path — no writer to
    // inventory a fail mode for. Pointed at the one spec that reads the
    // enum member (audit-log-analyze masking) so the reference resolves.
    owner: 'external',
    spec: 'src/services/mcp-server/tools/audit-log-analyze.tool.spec.ts',
  },
  [PlatformAuditCategory.PLATFORM_OPERATIONS]: {
    // NOT external — T025 retired the actor-in-both-columns placeholder,
    // rewriting this category's real-subject-vs-NULL behaviour.
    failMode: 'fail-open',
    writeSucceedsSpec:
      'src/platform-admin/platform-operations-audit/platform.operations.audit.service.spec.ts',
    writeFailsSpec:
      'src/platform-admin/platform-operations-audit/platform.operations.audit.service.spec.ts',
  },
  [PlatformAuditCategory.PLATFORM_ROLE_ASSIGNMENT]: {
    // The ONE category whose fail mode depends on the CALL (operator vs
    // seeded), not the category alone — both are proven in one spec file.
    failMode: 'fail-closed',
    writeSucceedsSpec:
      'src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service.spec.ts',
    writeFailsSpec:
      'src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service.spec.ts',
  },
  [PlatformAuditCategory.PLATFORM_USER_RECORD]: {
    failMode: 'fail-open',
    writeSucceedsSpec:
      'src/platform-admin/platform-user-record-audit/platform.user.record.audit.service.spec.ts',
    writeFailsSpec:
      'src/platform-admin/platform-user-record-audit/platform.user.record.audit.service.spec.ts',
  },
  [PlatformAuditCategory.PLATFORM_CONFIGURATION]: {
    failMode: 'fail-open',
    writeSucceedsSpec:
      'src/platform-admin/platform-configuration-audit/platform.configuration.audit.service.spec.ts',
    writeFailsSpec:
      'src/platform-admin/platform-configuration-audit/platform.configuration.audit.service.spec.ts',
  },
  [PlatformAuditCategory.PLATFORM_RESOURCE]: {
    failMode: 'fail-open',
    writeSucceedsSpec:
      'src/platform-admin/platform-resource-audit/platform.resource.audit.service.spec.ts',
    writeFailsSpec:
      'src/platform-admin/platform-resource-audit/platform.resource.audit.service.spec.ts',
  },
};

// ---------------------------------------------------------------------------
// 3. A_ROW_GATE_COVERAGE — keyed on `ARowId` (T040b's 22 members, incl.
//    A20b). `gateSpecs` is an ARRAY because several rows span multiple
//    resolver files; T070b walks every element, not just the first.
// ---------------------------------------------------------------------------

export type ARowGateCoverageEntry =
  | { readonly gateSpecs: readonly string[] }
  | { readonly retired: true }
  | { readonly deferred: 'B' };

export const A_ROW_GATE_COVERAGE: Record<ARowId, ARowGateCoverageEntry> = {
  A1: {
    gateSpecs: [
      'src/platform/platform-role/platform.role.assignment.rules.service.spec.ts',
      'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.spec.ts',
      // sec-server-9 fix: actor.resolver.mutations.ts's generic credential
      // mutations now reject the restricted role-credential vocabulary.
      'src/domain/actor/actor/actor.resolver.mutations.spec.ts',
    ],
  },
  A2: {
    gateSpecs: [
      'src/platform/platform-role/platform.role.assignment.rules.service.spec.ts',
      'src/platform/platform-role/platform.role.resolver.mutations.spec.ts',
    ],
  },
  A3: {
    gateSpecs: [
      'src/platform/platform/platform.resolver.mutations.spec.ts',
      'src/services/ai-server/ai-server/ai.server.resolver.mutations.spec.ts',
      'src/domain/community/user/user.resolver.mutations.spec.ts',
      'src/domain/community/organization/organization.resolver.mutations.spec.ts',
      'src/domain/space/account/account.resolver.mutations.spec.ts',
      'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.spec.ts',
      'src/platform-admin/licensing/admin.licensing.resolver.mutations.spec.ts',
    ],
  },
  A4: {
    gateSpecs: [
      'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.spec.ts',
    ],
  },
  A5: {
    gateSpecs: [
      'src/services/api/registration/registration.resolver.mutations.spec.ts',
      'src/platform-admin/core/identity/admin.identity.resolver.mutations.spec.ts',
      'test/integration/platform-admin/admin-user-account-delete.spec.ts',
    ],
  },
  A6: {
    gateSpecs: [
      'src/services/api/registration/registration.resolver.mutations.spec.ts',
    ],
  },
  A7: {
    gateSpecs: [
      'src/library/innovation-pack/innovation.pack.resolver.mutations.spec.ts',
      'src/domain/innovation-hub/innovation.hub.resolver.mutations.spec.ts',
      'src/domain/template/templates-set/templates.set.resolver.mutations.spec.ts',
      'src/domain/template/template/template.resolver.mutations.spec.ts',
    ],
  },
  A8: {
    gateSpecs: [
      'src/domain/collaboration/callout/callout.resolver.mutations.spec.ts',
      'src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.spec.ts',
      'src/domain/space/space/space.resolver.mutations.spec.ts',
      'src/library/innovation-pack/innovation.pack.resolver.mutations.spec.ts',
      'src/domain/innovation-hub/innovation.hub.resolver.mutations.spec.ts',
    ],
  },
  A9: {
    gateSpecs: [
      'src/domain/collaboration/callout-contribution/callout.contribution.move.resolver.mutations.spec.ts',
      'src/domain/collaboration/callout-transfer/callout.transfer.resolver.mutations.spec.ts',
      'src/domain/space/account/account.resolver.mutations.spec.ts',
      'src/services/api/conversion/conversion.resolver.mutations.spec.ts',
    ],
  },
  A10: {
    gateSpecs: ['src/platform/platform/platform.resolver.mutations.spec.ts'],
  },
  A11: {
    // Pre-existing (032) family; Slice A does not touch its grant set. The
    // four resolver specs that already exist are listed; not every one of
    // A11's ~13 surfaces has a dedicated spec yet — a gap that predates
    // this feature and is not one it introduces.
    gateSpecs: [
      'src/platform-admin/services/avatars/admin.avatarresolver.mutations.spec.ts',
      'src/platform-admin/services/geolocation/admin.geolocation.resolver.mutations.spec.ts',
      'src/platform-admin/services/search/admin.search.ingest.resolver.mutations.spec.ts',
      'src/platform-admin/domain/communication/admin.communication.resolver.mutations.spec.ts',
    ],
  },
  A12: {
    gateSpecs: [
      'src/platform-admin/licensing/admin.licensing.resolver.mutations.spec.ts',
      'src/domain/space/account/account.resolver.mutations.spec.ts',
    ],
  },
  A13: {
    gateSpecs: [
      'src/platform/licensing/credential-based/license-plan/license.plan.resolver.mutations.spec.ts',
      'src/platform/licensing/credential-based/license-policy/license.policy.resolver.mutations.spec.ts',
    ],
  },
  A14: {
    gateSpecs: ['src/domain/space/space/space.resolver.mutations.spec.ts'],
  },
  A15: {
    gateSpecs: [
      'src/domain/space/space/space.service.platform.roles.access.spec.ts',
      'src/platform/forum-discussion/discussion.resolver.mutations.spec.ts',
    ],
  },
  A16: {
    gateSpecs: [
      'src/domain/space/space/space.service.platform.roles.access.spec.ts',
    ],
  },
  A17: { deferred: 'B' },
  A18: { retired: true },
  A19: {
    gateSpecs: [
      'src/services/mcp-server/tools/audit-log-analyze.tool.spec.ts',
      'src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.fields.spec.ts',
    ],
  },
  A20: {
    // sec-server-10 fix: admin.authorization.resolver.queries.spec.ts added
    // — the second surface reading this data by credential, not RoleName.
    gateSpecs: [
      'src/domain/access/role-set/role.set.resolver.fields.spec.ts',
      'src/platform-admin/domain/authorization/admin.authorization.resolver.queries.spec.ts',
    ],
  },
  A20b: {
    gateSpecs: [
      'src/domain/access/role-set/role.set.resolver.fields.spec.ts',
      'src/platform-admin/domain/authorization/admin.authorization.resolver.queries.spec.ts',
    ],
  },
  A21: {
    gateSpecs: ['src/domain/community/user/user.service.spec.ts'],
  },
};

// ---------------------------------------------------------------------------
// 4. PRIVILEGE_COVERAGE — keyed on `keyof typeof PRIVILEGE_GRANTS`
//    (`ManagedPrivilege`), NOT this feature's new-privilege union (D4) —
//    that closes `GRANT_GLOBAL_ADMINS` in BY CONSTRUCTION (it is
//    re-scoped, not new, and would otherwise have no key to hang on — the
//    fourteenth/fifteenth-pass finding). `UPDATE_NAMEID` is added as an
//    EXPLICIT extra key alongside — it is deliberately excluded from
//    `ManagedPrivilege` (Slice A adds only its enum value; T078 adds its
//    rule and surface) — never by hand-patching `ManagedPrivilege` itself
//    (that would be the same hand-appended-union defect at smaller scale).
// ---------------------------------------------------------------------------

export type PrivilegeCoverageEntry =
  | { readonly ruleSpec: string; readonly grantSetSpec: string }
  | { readonly deferred: 'B' };

const ROOT_POLICY_SPEC =
  'src/platform/authorization/platform.authorization.policy.service.spec.ts';
const PLATFORM_POLICY_SPEC =
  'src/platform/platform/platform.service.authorization.spec.ts';
const ACCOUNT_POLICY_SPEC =
  'src/domain/space/account/account.service.authorization.spec.ts';
const SPACE_POLICY_SPEC =
  'src/domain/space/space/space.resolver.mutations.spec.ts';
const ORGANIZATION_POLICY_SPEC =
  'src/domain/community/organization/organization.resolver.mutations.spec.ts';
const USER_POLICY_SPEC = 'src/domain/community/user/user.service.spec.ts';

export const PRIVILEGE_COVERAGE: Record<
  ManagedPrivilege,
  PrivilegeCoverageEntry
> & {
  readonly [AuthorizationPrivilege.UPDATE_NAMEID]: PrivilegeCoverageEntry;
  // corr-server-9 fix: TRANSFER_RESOURCE_OFFER/_ACCEPT moved out of
  // `ManagedPrivilege` into per-tree `TREE_SCOPED_PRIVILEGE_GRANTS`
  // (`account` and `callouts-set` carry different legacy reachers) —
  // tracked here explicitly, same idiom as UPDATE_NAMEID, so they keep a
  // coverage entry despite no longer being a flat managed privilege.
  readonly [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: PrivilegeCoverageEntry;
  readonly [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: PrivilegeCoverageEntry;
} = {
  [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.FEATURE_ROLE_ASSIGN]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS]: {
    ruleSpec: ROOT_POLICY_SPEC,
    grantSetSpec: ROOT_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_USERS_ADMIN]: {
    ruleSpec: USER_POLICY_SPEC,
    grantSetSpec: USER_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES]: {
    ruleSpec: ACCOUNT_POLICY_SPEC,
    grantSetSpec: ACCOUNT_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_FORUM_MANAGE]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.DELETE_ORGANIZATION]: {
    ruleSpec: ORGANIZATION_POLICY_SPEC,
    grantSetSpec: ORGANIZATION_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_AUDIT_READ]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.SET_SERVICE_PROFILE]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER]: {
    ruleSpec: ACCOUNT_POLICY_SPEC,
    grantSetSpec: ACCOUNT_POLICY_SPEC,
  },
  [AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT]: {
    ruleSpec: ACCOUNT_POLICY_SPEC,
    grantSetSpec: ACCOUNT_POLICY_SPEC,
  },
  [AuthorizationPrivilege.MOVE_CONTRIBUTION]: {
    ruleSpec: SPACE_POLICY_SPEC,
    grantSetSpec: SPACE_POLICY_SPEC,
  },
  [AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER]: {
    ruleSpec: SPACE_POLICY_SPEC,
    grantSetSpec: SPACE_POLICY_SPEC,
  },
  [AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE]: {
    ruleSpec: ACCOUNT_POLICY_SPEC,
    grantSetSpec: ACCOUNT_POLICY_SPEC,
  },
  [AuthorizationPrivilege.CREATE_ORGANIZATION]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  // --- T070m additions — see the `ManagedPrivilege` doc comment
  // (privilege.grants.ts) for why these are mirrored despite predating
  // this feature (A3/A11, 032) or being the one bare-READ exception (A16).
  [AuthorizationPrivilege.AUTHORIZATION_RESET]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.LICENSE_RESET]: {
    ruleSpec: ACCOUNT_POLICY_SPEC,
    grantSetSpec: ACCOUNT_POLICY_SPEC,
  },
  [AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN]: {
    ruleSpec: PLATFORM_POLICY_SPEC,
    grantSetSpec: PLATFORM_POLICY_SPEC,
  },
  [AuthorizationPrivilege.READ]: {
    ruleSpec: SPACE_POLICY_SPEC,
    grantSetSpec: SPACE_POLICY_SPEC,
  },
  [AuthorizationPrivilege.UPDATE_NAMEID]: { deferred: 'B' },
};

// ---------------------------------------------------------------------------
// 5. STATEFUL_FLOW_COVERAGE — the two of FR-024's five stateful flows this
//    layer owns (research D25): seed -> restart -> still held, and the
//    audit-store outage. Each names its covering spec AND the quickstart
//    §5 drill step that proves it live — before this Record, "covered at
//    another layer" and "covered by nothing" looked identical (eighth pass).
// ---------------------------------------------------------------------------

export interface StatefulFlowCoverageEntry {
  readonly spec: string;
  readonly drillStep: string;
}

export const STATEFUL_FLOW_COVERAGE: Record<
  'flow3' | 'flow4',
  StatefulFlowCoverageEntry
> = {
  flow3: {
    spec: 'src/core/bootstrap/bootstrap.service.spec.ts',
    drillStep:
      'quickstart.md §5 — out-of-band lockout repaired by restart / a conflicting configured grant is fatal',
  },
  flow4: {
    spec: 'src/core/bootstrap/bootstrap.service.spec.ts',
    drillStep:
      'quickstart.md §5 — grant still lands with the audit store stopped',
  },
};
