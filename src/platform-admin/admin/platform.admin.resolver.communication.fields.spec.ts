import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProxySurfaceUsageReadService } from '@domain/communication/proxy-surface/proxy.surface.usage.read.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { PlatformAdminCommunicationResolverFields } from './platform.admin.resolver.communication.fields';

describe('PlatformAdminCommunicationResolverFields.proxySurfaceUsage', () => {
  let resolver: PlatformAdminCommunicationResolverFields;
  let authorizationService: Mocked<AuthorizationService>;
  let readService: Mocked<ProxySurfaceUsageReadService>;
  const policy = { id: 'ops-policy' } as any;
  const actorContext = { actorID: 'actor-1' } as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAdminCommunicationResolverFields,
        MockWinstonProvider,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            createGlobalRolesAuthorizationPolicy: vi
              .fn()
              .mockReturnValue(policy),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(PlatformAdminCommunicationResolverFields);
    authorizationService = module.get(AuthorizationService);
    readService = module.get(ProxySurfaceUsageReadService);
  });

  it('denies a caller without the operations privilege before reading the ledger', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(
      resolver.proxySurfaceUsage({ days: 14 }, actorContext)
    ).rejects.toThrow('forbidden');
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      policy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      expect.any(String)
    );
    expect(readService.read).not.toHaveBeenCalled();
  });

  it('returns the ledger window for an operator', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    const window = { from: 'a', to: 'b', days: [] };
    readService.read.mockResolvedValue(window);

    await expect(
      resolver.proxySurfaceUsage({ days: 14 }, actorContext)
    ).resolves.toBe(window);
    expect(readService.read).toHaveBeenCalledWith(14);
  });
});
