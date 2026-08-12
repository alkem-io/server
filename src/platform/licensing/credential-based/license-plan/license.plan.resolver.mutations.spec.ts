import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { LicensePlanResolverMutations } from './license.plan.resolver.mutations';
import { LicensePlanService } from './license.plan.service';

/**
 * 027-platform-role-redesign (T040, A13, T070e) — bare DELETE/UPDATE,
 * single-path (no ordinary-owner branch): every successful call is
 * audited. corr-server-7 fix: checked against the resolver-local
 * `licenseDefinitionPolicy`, NOT `licensePlan.licensingFramework.authorization`
 * (which inherits the root policy and would let `platform-content-full-access`
 * reach these surfaces via the root CRUD cascade).
 */
describe('LicensePlanResolverMutations', () => {
  let resolver: LicensePlanResolverMutations;
  let authorizationService: Record<string, Mock>;
  let licensePlanService: Record<string, Mock>;
  let platformConfigurationAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;
  const licensePlan = {
    id: 'plan-1',
    licensingFramework: { authorization: { id: 'auth-1' } },
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicensePlanResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LicensePlanResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    licensePlanService = module.get(LicensePlanService) as any;
    platformConfigurationAuditService = module.get(
      PlatformConfigurationAuditService
    ) as any;
    licensePlanService.getLicensePlanOrFail.mockResolvedValue(licensePlan);
  });

  describe('deleteLicensePlan', () => {
    it('permitted: gates on DELETE and audits', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      licensePlanService.deleteLicensePlan.mockResolvedValue(licensePlan);

      await resolver.deleteLicensePlan(actorContext, { ID: 'plan-1' } as any);

      // Individual `toBe` (reference equality) assertions rather than one
      // `toHaveBeenCalledWith` — the resolver-local `licenseDefinitionPolicy`
      // is itself an auto-mocked object, and chai's deep-equal diff
      // formatter cannot stringify it if the args ever mismatch.
      const call = authorizationService.grantAccessOrFail.mock.calls[0];
      expect(call[0]).toBe(actorContext);
      expect(call[1]).toBe((resolver as any).licenseDefinitionPolicy);
      expect(call[2]).toBe(AuthorizationPrivilege.DELETE);
      expect(typeof call[3]).toBe('string');
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).toHaveBeenCalled();
    });

    it('denied: propagates the authorization failure without deleting or auditing', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.deleteLicensePlan(actorContext, { ID: 'plan-1' } as any)
      ).rejects.toThrow('Forbidden');
      expect(licensePlanService.deleteLicensePlan).not.toHaveBeenCalled();
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateLicensePlan', () => {
    it('permitted: gates on UPDATE and audits', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      licensePlanService.update.mockResolvedValue(licensePlan);

      await resolver.updateLicensePlan(actorContext, { ID: 'plan-1' } as any);

      const call = authorizationService.grantAccessOrFail.mock.calls[0];
      expect(call[0]).toBe(actorContext);
      expect(call[1]).toBe((resolver as any).licenseDefinitionPolicy);
      expect(call[2]).toBe(AuthorizationPrivilege.UPDATE);
      expect(typeof call[3]).toBe('string');
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).toHaveBeenCalled();
    });

    it('denied: propagates the authorization failure without updating or auditing', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.updateLicensePlan(actorContext, { ID: 'plan-1' } as any)
      ).rejects.toThrow('Forbidden');
      expect(licensePlanService.update).not.toHaveBeenCalled();
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).not.toHaveBeenCalled();
    });
  });
});
