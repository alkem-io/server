import { RoleName } from '@common/enums/role.name';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  PlatformRoleAssignmentEvaluationInput,
  PlatformRoleAssignmentRulesService,
} from './platform.role.assignment.rules.service';

/**
 * 027-platform-role-redesign (T070c, T064) — the FIVE assignment rules
 * (T030), each in BOTH outcomes, PLUS the evaluation-order case (first
 * failure wins) and T064's FR-003 one-way-separation proof. Error strings
 * are asserted VERBATIM against `contracts/graphql-contract.md` §New error
 * semantics — `client-web` renders them, so the text is contract.
 */
describe('PlatformRoleAssignmentRulesService', () => {
  let service: PlatformRoleAssignmentRulesService;
  let authorizationService: { isAccessGranted: ReturnType<typeof vi.fn> };

  const actorContext = { actorID: 'actor-1' } as ActorContext;
  const roleSetAuthorization = { id: 'auth-1' } as any;

  const baseInput = (
    overrides: Partial<PlatformRoleAssignmentEvaluationInput> = {}
  ): PlatformRoleAssignmentEvaluationInput => ({
    action: 'grant',
    role: RoleName.PLATFORM_SUPPORT,
    actorContext,
    roleSetAuthorization,
    targetActorType: 'user',
    ...overrides,
  });

  beforeEach(() => {
    authorizationService = { isAccessGranted: vi.fn().mockReturnValue(true) };
    service = new PlatformRoleAssignmentRulesService(
      authorizationService as unknown as AuthorizationService
    );
  });

  describe('rule 1 — assigner capability', () => {
    it('passes when the actor holds the required privilege', () => {
      authorizationService.isAccessGranted.mockReturnValue(true);
      expect(service.evaluate(baseInput())).toBeUndefined();
    });

    it('fails with the exact contract message when the actor lacks the privilege', () => {
      authorizationService.isAccessGranted.mockReturnValue(false);
      const violation = service.evaluate(baseInput());
      expect(violation).toEqual({
        ruleId: 'assigner-capability',
        message:
          'Forbidden: grant-global-admins required to assign role platform-support',
      });
    });

    it('checks FEATURE_ROLE_ASSIGN (not GRANT_GLOBAL_ADMINS) for a feature-* role', () => {
      authorizationService.isAccessGranted.mockReturnValue(false);
      const violation = service.evaluate(
        baseInput({ role: RoleName.FEATURE_BETA_TESTER })
      );
      expect(violation?.message).toBe(
        'Forbidden: feature-role-assign required to assign role feature-beta-tester'
      );
    });
  });

  describe('rule 2 — holder kind', () => {
    it('passes when a platform-* role targets a user', () => {
      const violation = service.evaluate(
        baseInput({ targetActorType: 'user' })
      );
      expect(violation).toBeUndefined();
    });

    it('fails with the exact contract message when a platform-* role targets an organization', () => {
      const violation = service.evaluate(
        baseInput({ targetActorType: 'organization' })
      );
      expect(violation).toEqual({
        ruleId: 'holder-kind',
        message:
          'Rejected: role platform-support may not be granted to a organization',
      });
    });

    it('permits a feature-* role targeting an organization (T064/FR-003, D8)', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.FEATURE_ORGANIZATION_CREATOR,
          targetActorType: 'organization',
        })
      );
      expect(violation).toBeUndefined();
    });
  });

  describe('rule 3 — Spaces Reader is service-account-only', () => {
    it('passes when granting to a user with serviceProfile true', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_SPACES_READER,
          targetServiceProfile: true,
        })
      );
      expect(violation).toBeUndefined();
    });

    it('fails with the exact contract message when the target lacks the serviceProfile marker', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_SPACES_READER,
          targetServiceProfile: false,
        })
      );
      expect(violation).toEqual({
        ruleId: 'spaces-reader-service-account',
        message:
          'Rejected: platform-spaces-reader may only be granted to a service account',
      });
    });

    it('is not evaluated on revoke (only grant needs the marker true)', () => {
      const violation = service.evaluate(
        baseInput({
          action: 'revoke',
          role: RoleName.PLATFORM_SPACES_READER,
          targetServiceProfile: false,
        })
      );
      expect(violation).toBeUndefined();
    });
  });

  describe('rule 4 — Audit Reader mutual exclusion (bidirectional)', () => {
    it('passes granting Audit Reader to a holder of no other Platform role', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_AUDIT_READER,
          targetHeldPlatformRoles: [],
        })
      );
      expect(violation).toBeUndefined();
    });

    it('fails with the exact contract message granting Audit Reader to a holder of another Platform role', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_AUDIT_READER,
          targetHeldPlatformRoles: [RoleName.PLATFORM_SUPPORT],
        })
      );
      expect(violation).toEqual({
        ruleId: 'audit-reader-exclusion',
        message:
          'Rejected: platform-audit-reader is mutually exclusive with platform-support',
      });
    });

    it('fails the OTHER direction — granting a Platform role to an existing Audit Reader holder', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_SUPPORT,
          targetHeldPlatformRoles: [RoleName.PLATFORM_AUDIT_READER],
        })
      );
      expect(violation).toEqual({
        ruleId: 'audit-reader-exclusion',
        message:
          'Rejected: platform-audit-reader is mutually exclusive with platform-support',
      });
    });

    it('permits combining Feature roles freely (exclusion is Platform-family only)', () => {
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_AUDIT_READER,
          targetHeldPlatformRoles: [],
        })
      );
      expect(violation).toBeUndefined();
    });
  });

  describe('rule 5 — last Platform Roles Admin (revoke-only)', () => {
    it('passes revoking Roles Admin when the target is not the last holder', () => {
      const violation = service.evaluate(
        baseInput({
          action: 'revoke',
          role: RoleName.PLATFORM_ROLES_ADMIN,
          isLastPlatformRolesAdminHolder: false,
        })
      );
      expect(violation).toBeUndefined();
    });

    it('fails with the exact contract message revoking the LAST Roles Admin', () => {
      const violation = service.evaluate(
        baseInput({
          action: 'revoke',
          role: RoleName.PLATFORM_ROLES_ADMIN,
          isLastPlatformRolesAdminHolder: true,
        })
      );
      expect(violation).toEqual({
        ruleId: 'last-roles-admin',
        message: 'Rejected: cannot remove the last platform-roles-admin',
      });
    });

    it('never trips on a GRANT (rule 5 is revoke-only)', () => {
      const violation = service.evaluate(
        baseInput({
          action: 'grant',
          role: RoleName.PLATFORM_ROLES_ADMIN,
          isLastPlatformRolesAdminHolder: true,
        })
      );
      expect(violation).toBeUndefined();
    });
  });

  describe('evaluation order — first failure wins', () => {
    it('reports rule 2 (holder-kind) when a target violates rules 2 AND 4 simultaneously', () => {
      // platform-* role -> organization (rule 2 violation) AND the target
      // organization already "holds" Audit Reader (rule 4 violation, were
      // it evaluated) — rule 2 runs first and must win.
      const violation = service.evaluate(
        baseInput({
          role: RoleName.PLATFORM_SUPPORT,
          targetActorType: 'organization',
          targetHeldPlatformRoles: [RoleName.PLATFORM_AUDIT_READER],
        })
      );
      expect(violation?.ruleId).toBe('holder-kind');
    });
  });

  describe('evaluateOrFail', () => {
    it('throws a ForbiddenException carrying the violated ruleId in details', () => {
      authorizationService.isAccessGranted.mockReturnValue(false);
      expect(() => service.evaluateOrFail(baseInput())).toThrow(
        /grant-global-admins required to assign role platform-support/
      );
    });

    it('does not throw when every rule passes', () => {
      expect(() => service.evaluateOrFail(baseInput())).not.toThrow();
    });
  });

  // T064 (US2, FR-003) — the one-way separation the rule engine is
  // supposed to guarantee: platform-users-admin may hand out Feature roles
  // but never another Platform role. Proven here at the SAME rule (1) that
  // enforces every other assigner-capability check — there is no separate
  // mechanism to drift out of step with this one.
  describe('T064 — FR-003 one-way separation (platform-users-admin -> feature-* only)', () => {
    it('passes rule 1 for a feature-* target role (checks FEATURE_ROLE_ASSIGN)', () => {
      authorizationService.isAccessGranted.mockImplementation(
        (_ctx: unknown, _auth: unknown, privilege: string) =>
          privilege === 'feature-role-assign'
      );
      const violation = service.evaluate(
        baseInput({ role: RoleName.FEATURE_VIRTUAL_ASSISTANT })
      );
      expect(violation).toBeUndefined();
    });

    it('fails rule 1 for a platform-* target role — holding FEATURE_ROLE_ASSIGN alone is not enough', () => {
      authorizationService.isAccessGranted.mockImplementation(
        (_ctx: unknown, _auth: unknown, privilege: string) =>
          privilege === 'feature-role-assign'
      );
      const violation = service.evaluate(
        baseInput({ role: RoleName.PLATFORM_ROLES_ADMIN })
      );
      expect(violation).toEqual({
        ruleId: 'assigner-capability',
        message:
          'Forbidden: grant-global-admins required to assign role platform-roles-admin',
      });
    });
  });

  describe('evaluateSeedOrFail (T054) — rules 2-5 only, never rule 1', () => {
    it('never calls isAccessGranted (no assigner capability check for a seed)', () => {
      service.evaluateSeedOrFail({
        action: 'grant',
        role: RoleName.PLATFORM_SPACES_READER,
        targetActorType: 'user',
        targetServiceProfile: true,
      });
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('still enforces rule 3 (spaces-reader-service-account) — a misconfigured seed is fatal', () => {
      expect(() =>
        service.evaluateSeedOrFail({
          action: 'grant',
          role: RoleName.PLATFORM_SPACES_READER,
          targetActorType: 'user',
          targetServiceProfile: false,
        })
      ).toThrow(
        /platform-spaces-reader may only be granted to a service account/
      );
    });

    it('still enforces rule 2 (holder-kind) for a seeded platform-* grant', () => {
      expect(() =>
        service.evaluateSeedOrFail({
          action: 'grant',
          role: RoleName.PLATFORM_ROLES_ADMIN,
          targetActorType: 'organization',
        })
      ).toThrow(/may not be granted to a organization/);
    });

    it('passes a well-formed seeded grant', () => {
      expect(() =>
        service.evaluateSeedOrFail({
          action: 'grant',
          role: RoleName.PLATFORM_ROLES_ADMIN,
          targetActorType: 'user',
        })
      ).not.toThrow();
    });
  });
});
