import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { LicensePolicyResolverMutations } from './license.policy.resolver.mutations';
import { LicensePolicyService } from './license.policy.service';

/**
 * 027-platform-role-redesign (T040, A13, T070e) — bare CREATE/UPDATE/DELETE,
 * single-path: every successful call is audited. corr-server-7 fix: checked
 * against the resolver-local `licenseDefinitionPolicy`, NOT
 * `licensePolicy.authorization` (which inherits the root policy and would
 * let `platform-content-full-access` reach these surfaces via the root CRUD
 * cascade).
 */
describe('LicensePolicyResolverMutations', () => {
  let resolver: LicensePolicyResolverMutations;
  let authorizationService: Record<string, Mock>;
  let licensePolicyService: Record<string, Mock>;
  let platformConfigurationAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;
  const licensePolicy = { id: 'policy-1', authorization: { id: 'auth-1' } };

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicensePolicyResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LicensePolicyResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    licensePolicyService = module.get(LicensePolicyService) as any;
    platformConfigurationAuditService = module.get(
      PlatformConfigurationAuditService
    ) as any;
    licensePolicyService.getDefaultLicensePolicyOrFail.mockResolvedValue(
      licensePolicy
    );
  });

  describe('adminLicensePolicyDeleteCredentialRule', () => {
    it('permitted: gates on DELETE and audits', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      licensePolicyService.deleteLicensePolicyCredentialRule.mockResolvedValue(
        {}
      );

      await resolver.adminLicensePolicyDeleteCredentialRule(actorContext, {
        ID: 'rule-1',
      } as any);

      // Individual `toBe` (reference equality) assertions rather than one
      // `toHaveBeenCalledWith` — the resolver-local `licenseDefinitionPolicy`
      // is itself an auto-mocked object, and chai's deep-equal diff
      // formatter cannot stringify it if the args ever mismatch.
      const deleteCall = authorizationService.grantAccessOrFail.mock.calls[0];
      expect(deleteCall[0]).toBe(actorContext);
      expect(deleteCall[1]).toBe((resolver as any).licenseDefinitionPolicy);
      expect(deleteCall[2]).toBe(AuthorizationPrivilege.DELETE);
      expect(typeof deleteCall[3]).toBe('string');
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).toHaveBeenCalled();
    });

    it('denied: propagates the failure without deleting or auditing', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.adminLicensePolicyDeleteCredentialRule(actorContext, {
          ID: 'rule-1',
        } as any)
      ).rejects.toThrow('Forbidden');
      expect(
        licensePolicyService.deleteLicensePolicyCredentialRule
      ).not.toHaveBeenCalled();
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).not.toHaveBeenCalled();
    });
  });

  describe('adminLicensePolicyUpdateCredentialRule', () => {
    it('permitted: gates on UPDATE and audits', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      licensePolicyService.updateCredentialRule.mockResolvedValue({});

      await resolver.adminLicensePolicyUpdateCredentialRule(actorContext, {
        ID: 'rule-1',
      } as any);

      const updateCall = authorizationService.grantAccessOrFail.mock.calls[0];
      expect(updateCall[0]).toBe(actorContext);
      expect(updateCall[1]).toBe((resolver as any).licenseDefinitionPolicy);
      expect(updateCall[2]).toBe(AuthorizationPrivilege.UPDATE);
      expect(typeof updateCall[3]).toBe('string');
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).toHaveBeenCalled();
    });

    it('denied: propagates the failure without updating or auditing', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.adminLicensePolicyUpdateCredentialRule(actorContext, {
          ID: 'rule-1',
        } as any)
      ).rejects.toThrow('Forbidden');
      expect(licensePolicyService.updateCredentialRule).not.toHaveBeenCalled();
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).not.toHaveBeenCalled();
    });
  });

  describe('adminLicensePolicyCreateCredentialRule', () => {
    it('permitted: gates on CREATE and audits', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(true);
      licensePolicyService.createCredentialRule.mockResolvedValue({});

      await resolver.adminLicensePolicyCreateCredentialRule(actorContext, {
        type: 'x',
      } as any);

      const createCall = authorizationService.grantAccessOrFail.mock.calls[0];
      expect(createCall[0]).toBe(actorContext);
      expect(createCall[1]).toBe((resolver as any).licenseDefinitionPolicy);
      expect(createCall[2]).toBe(AuthorizationPrivilege.CREATE);
      expect(typeof createCall[3]).toBe('string');
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).toHaveBeenCalled();
    });

    it('denied: propagates the failure without creating or auditing', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      await expect(
        resolver.adminLicensePolicyCreateCredentialRule(actorContext, {
          type: 'x',
        } as any)
      ).rejects.toThrow('Forbidden');
      expect(licensePolicyService.createCredentialRule).not.toHaveBeenCalled();
      expect(
        platformConfigurationAuditService.recordChangeForActor
      ).not.toHaveBeenCalled();
    });
  });
});
