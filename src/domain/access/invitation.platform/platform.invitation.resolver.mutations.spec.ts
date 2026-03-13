import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { PlatformInvitationResolverMutations } from './platform.invitation.resolver.mutations';
import { PlatformInvitationService } from './platform.invitation.service';

describe('PlatformInvitationResolverMutations', () => {
  let resolver: PlatformInvitationResolverMutations;
  let platformInvitationService: PlatformInvitationService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformInvitationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<PlatformInvitationResolverMutations>(
      PlatformInvitationResolverMutations
    );
    platformInvitationService = module.get<PlatformInvitationService>(
      PlatformInvitationService
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deletePlatformInvitation', () => {
    it('should authorize and delete platform invitation', async () => {
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      const deleteData = { ID: 'inv-1' };
      const deletedInv = { id: 'inv-1' } as any;

      (
        platformInvitationService.getPlatformInvitationOrFail as Mock
      ).mockResolvedValue(mockInvitation);
      (authorizationService.grantAccessOrFail as Mock).mockResolvedValue(
        undefined
      );
      (
        platformInvitationService.deletePlatformInvitation as Mock
      ).mockResolvedValue(deletedInv);

      const result = await resolver.deletePlatformInvitation(
        actorContext,
        deleteData
      );

      expect(result).toBe(deletedInv);
    });
  });
});
