import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Injectable } from '@nestjs/common';

export type PlatformRoleAssignmentAction = 'grant' | 'revoke';
export type PlatformRoleAssignmentTargetKind = 'user' | 'organization';

/**
 * The nine `Platform …` administration roles (spec rows 1-9), plus the
 * pre-existing `platform-operations-admin` (row 5, delivered by spec 032).
 * `Feature …` roles and every LEGACY role (`GLOBAL_ADMIN`, ...) are
 * deliberately excluded — rules 2-5 below are scoped to the NEW target role
 * model; legacy-role assignment is unaffected in Slice A.
 */
export const PLATFORM_FAMILY_ROLES: ReadonlySet<RoleName> = new Set([
  RoleName.PLATFORM_ROLES_ADMIN,
  RoleName.PLATFORM_CONTENT_FULL_ACCESS,
  RoleName.PLATFORM_RESOURCE_ADMIN,
  RoleName.PLATFORM_SETTINGS_ADMIN,
  RoleName.PLATFORM_USERS_ADMIN,
  RoleName.PLATFORM_SUPPORT,
  RoleName.PLATFORM_LICENSE_MANAGER,
  RoleName.PLATFORM_SPACES_READER,
  RoleName.PLATFORM_AUDIT_READER,
  RoleName.PLATFORM_OPERATIONS_ADMIN,
]);

/** The three `Feature …` roles (spec rows 11-13). */
export const FEATURE_FAMILY_ROLES: ReadonlySet<RoleName> = new Set([
  RoleName.FEATURE_BETA_TESTER,
  RoleName.FEATURE_VIRTUAL_ASSISTANT,
  RoleName.FEATURE_ORGANIZATION_CREATOR,
]);

export interface PlatformRoleAssignmentEvaluationInput {
  action: PlatformRoleAssignmentAction;
  role: RoleName;
  actorContext: ActorContext;
  roleSetAuthorization: IAuthorizationPolicy | undefined;
  targetActorType: PlatformRoleAssignmentTargetKind;
  /** Only meaningful when `targetActorType === 'user'` — the target's
   * `serviceProfile` flag (rule 3, A21). */
  targetServiceProfile?: boolean;
  /** The `Platform …` roles the target ALREADY holds, before this grant is
   * applied (rule 4 — Audit Reader exclusion, bidirectional). */
  targetHeldPlatformRoles?: readonly RoleName[];
  /** Only meaningful for `action: 'revoke'`, `role: PLATFORM_ROLES_ADMIN` —
   * whether the target is the platform's LAST holder of that role (rule 5). */
  isLastPlatformRolesAdminHolder?: boolean;
}

export interface PlatformRoleAssignmentRuleViolation {
  ruleId:
    | 'assigner-capability'
    | 'holder-kind'
    | 'spaces-reader-service-account'
    | 'audit-reader-exclusion'
    | 'last-roles-admin';
  message: string;
}

/**
 * The five assignment rules (research D7, T030), evaluated in order —
 * **first failure wins**. Shared by the mutation path
 * (`platform.role.resolver.mutations.ts`, T031/T032a) and bootstrap seeding
 * (`bootstrap.service.ts`, T054) — the single enforcement point that makes
 * "seeding is not a rule bypass" true by construction (FR-013, FR-028).
 *
 * Error strings are CONTRACT (`contracts/graphql-contract.md` §New error
 * semantics) — `client-web` surfaces them verbatim, so change them there
 * first if they ever need to change.
 */
@Injectable()
export class PlatformRoleAssignmentRulesService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  /** @throws {ForbiddenException} naming the first violated rule. */
  public evaluateOrFail(input: PlatformRoleAssignmentEvaluationInput): void {
    const violation = this.evaluate(input);
    if (violation) {
      throw new ForbiddenException(violation.message, LogContext.PLATFORM, {
        ruleId: violation.ruleId,
      });
    }
  }

  /** Pure evaluation — returns the first violated rule, or `undefined` if
   * every rule passes. Exposed separately so unit specs (T070c) can assert
   * the SPECIFIC violated rule without parsing thrown message text twice. */
  public evaluate(
    input: PlatformRoleAssignmentEvaluationInput
  ): PlatformRoleAssignmentRuleViolation | undefined {
    return (
      this.checkAssignerCapability(input) ??
      this.checkHolderKind(input) ??
      this.checkSpacesReaderServiceAccount(input) ??
      this.checkAuditReaderExclusion(input) ??
      this.checkLastRolesAdmin(input)
    );
  }

  /** Rule 1 — assigner capability. In Slice A the platform-family privilege
   * is still spelled `GRANT_GLOBAL_ADMINS` (renamed `PLATFORM_ROLES_ASSIGN`
   * only at Slice B, T075) — checked against the enum member, not the
   * string, so the rename is a one-line diff. */
  private checkAssignerCapability(
    input: PlatformRoleAssignmentEvaluationInput
  ): PlatformRoleAssignmentRuleViolation | undefined {
    const privilegeRequired = FEATURE_FAMILY_ROLES.has(input.role)
      ? AuthorizationPrivilege.FEATURE_ROLE_ASSIGN
      : AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;

    const granted = this.authorizationService.isAccessGranted(
      input.actorContext,
      input.roleSetAuthorization,
      privilegeRequired
    );
    if (!granted) {
      return {
        ruleId: 'assigner-capability',
        message: `Forbidden: ${privilegeRequired} required to assign role ${input.role}`,
      };
    }
    return undefined;
  }

  /** Rule 2 — holder kind: `platform-*` → user (incl. service account) only,
   * never an organization; `feature-*` → user or organization. Scoped to
   * the NEW target role model only — legacy roles are unaffected. */
  private checkHolderKind(
    input: PlatformRoleAssignmentEvaluationInput
  ): PlatformRoleAssignmentRuleViolation | undefined {
    if (
      PLATFORM_FAMILY_ROLES.has(input.role) &&
      input.targetActorType === 'organization'
    ) {
      return {
        ruleId: 'holder-kind',
        message: `Rejected: role ${input.role} may not be granted to a organization`,
      };
    }
    // Every FEATURE_FAMILY_ROLES / PLATFORM_FAMILY_ROLES target actor type
    // (user, organization) is otherwise permitted — no restriction on
    // feature-* roles beyond what the mutation surface itself accepts.
    return undefined;
  }

  /** Rule 3 — Spaces Reader may only be granted to a service account (the
   * hardened `serviceProfile` marker, A21/FR-002 fourth clarification pass).
   * Only evaluated on GRANT — a revoke never needs the marker true. */
  private checkSpacesReaderServiceAccount(
    input: PlatformRoleAssignmentEvaluationInput
  ): PlatformRoleAssignmentRuleViolation | undefined {
    if (
      input.action === 'grant' &&
      input.role === RoleName.PLATFORM_SPACES_READER &&
      (input.targetActorType !== 'user' || input.targetServiceProfile !== true)
    ) {
      return {
        ruleId: 'spaces-reader-service-account',
        message:
          'Rejected: platform-spaces-reader may only be granted to a service account',
      };
    }
    return undefined;
  }

  /** Rule 4 — Platform Audit Reader is mutually exclusive with EVERY other
   * `Platform …` role (rows 1-9, Spaces Reader included), enforced
   * BIDIRECTIONALLY: granting Audit Reader to a holder of another Platform
   * role is rejected, and granting another Platform role to an Audit Reader
   * holder is rejected too. `Feature …` roles are freely combinable. */
  private checkAuditReaderExclusion(
    input: PlatformRoleAssignmentEvaluationInput
  ): PlatformRoleAssignmentRuleViolation | undefined {
    if (input.action !== 'grant') {
      return undefined;
    }
    const heldRoles = input.targetHeldPlatformRoles ?? [];
    const otherPlatformRoles = (r: RoleName) =>
      r !== RoleName.PLATFORM_AUDIT_READER && PLATFORM_FAMILY_ROLES.has(r);

    if (input.role === RoleName.PLATFORM_AUDIT_READER) {
      const conflicting = heldRoles.find(otherPlatformRoles);
      if (conflicting) {
        return {
          ruleId: 'audit-reader-exclusion',
          message: `Rejected: platform-audit-reader is mutually exclusive with ${conflicting}`,
        };
      }
      return undefined;
    }
    if (
      PLATFORM_FAMILY_ROLES.has(input.role) &&
      heldRoles.includes(RoleName.PLATFORM_AUDIT_READER)
    ) {
      return {
        ruleId: 'audit-reader-exclusion',
        message: `Rejected: platform-audit-reader is mutually exclusive with ${input.role}`,
      };
    }
    return undefined;
  }

  /** Rule 5 — the platform must always retain at least one Platform Roles
   * Admin (bootstrap authority, FR-013a). Revoke-only; grants never trip it. */
  private checkLastRolesAdmin(
    input: PlatformRoleAssignmentEvaluationInput
  ): PlatformRoleAssignmentRuleViolation | undefined {
    if (
      input.action === 'revoke' &&
      input.role === RoleName.PLATFORM_ROLES_ADMIN &&
      input.isLastPlatformRolesAdminHolder
    ) {
      return {
        ruleId: 'last-roles-admin',
        message: 'Rejected: cannot remove the last platform-roles-admin',
      };
    }
    return undefined;
  }
}
