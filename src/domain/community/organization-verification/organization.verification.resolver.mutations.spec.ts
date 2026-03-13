import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { OrganizationVerificationResolverMutations } from './organization.verification.resolver.mutations';
import { OrganizationVerificationService } from './organization.verification.service';
import { OrganizationVerificationLifecycleService } from './organization.verification.service.lifecycle';

describe('OrganizationVerificationResolverMutations', () => {
  let resolver: OrganizationVerificationResolverMutations;
  let organizationVerificationService: {
    getOrganizationVerificationOrFail: Mock;
    save: Mock;
  };
  let organizationVerificationLifecycleService: {
    getOrganizationVerificationMachine: Mock;
    getOrganizationVerificationState: Mock;
  };
  let authorizationService: {
    grantAccessOrFail: Mock;
  };
  let lifecycleService: {
    event: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationVerificationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(OrganizationVerificationResolverMutations);
    organizationVerificationService = module.get(
      OrganizationVerificationService
    ) as any;
    organizationVerificationLifecycleService = module.get(
      OrganizationVerificationLifecycleService
    ) as any;
    authorizationService = module.get(AuthorizationService) as any;
    lifecycleService = module.get(LifecycleService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('eventOnOrganizationVerification', () => {
    it('should authorize, trigger lifecycle event, and return updated verification', async () => {
      const mockVerification = {
        id: 'ver-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
      };
      const mockMachine = { id: 'machine-1' };
      const updatedVerification = {
        ...mockVerification,
        status: 'verified',
      };

      organizationVerificationService.getOrganizationVerificationOrFail
        .mockResolvedValueOnce(mockVerification) // first call to get verification
        .mockResolvedValueOnce(mockVerification); // second call after lifecycle event

      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      organizationVerificationLifecycleService.getOrganizationVerificationMachine.mockReturnValue(
        mockMachine
      );
      lifecycleService.event.mockResolvedValue(undefined);
      organizationVerificationLifecycleService.getOrganizationVerificationState.mockReturnValue(
        'verified'
      );
      organizationVerificationService.save.mockResolvedValue(
        updatedVerification
      );

      const eventData = {
        organizationVerificationID: 'ver-1',
        eventName: 'VERIFICATION_REQUEST',
      };
      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.eventOnOrganizationVerification(
        eventData as any,
        actorContext
      );

      // Verify authorization check
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockVerification.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.stringContaining('event on organization verification')
      );

      // Verify lifecycle event was triggered
      expect(lifecycleService.event).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: mockVerification.lifecycle,
          machine: mockMachine,
          eventName: 'VERIFICATION_REQUEST',
          actorContext,
          authorization: mockVerification.authorization,
        })
      );

      // Verify state was synced
      expect(
        organizationVerificationLifecycleService.getOrganizationVerificationState
      ).toHaveBeenCalledWith(mockVerification.lifecycle);

      // Verify save was called
      expect(organizationVerificationService.save).toHaveBeenCalled();

      expect(result).toBe(updatedVerification);
    });

    it('should call getOrganizationVerificationOrFail twice - before and after event', async () => {
      const mockVerification = {
        id: 'ver-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
      };

      organizationVerificationService.getOrganizationVerificationOrFail.mockResolvedValue(
        mockVerification
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      organizationVerificationLifecycleService.getOrganizationVerificationMachine.mockReturnValue(
        {}
      );
      lifecycleService.event.mockResolvedValue(undefined);
      organizationVerificationLifecycleService.getOrganizationVerificationState.mockReturnValue(
        'not_verified'
      );
      organizationVerificationService.save.mockImplementation((v: any) =>
        Promise.resolve(v)
      );

      await resolver.eventOnOrganizationVerification(
        {
          organizationVerificationID: 'ver-1',
          eventName: 'SOME_EVENT',
        } as any,
        { actorID: 'user-1' } as any
      );

      expect(
        organizationVerificationService.getOrganizationVerificationOrFail
      ).toHaveBeenCalledTimes(2);
    });
  });
});
