import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { InvitationService } from './invitation.service';

describe('InvitationResolverMutations', () => {
  let resolver: InvitationResolverMutations;
  let invitationService: InvitationService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<InvitationResolverMutations>(
      InvitationResolverMutations
    );
    invitationService = module.get<InvitationService>(InvitationService);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteInvitation', () => {
    it('should authorize and delete invitation', async () => {
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      const deleteData = { ID: 'inv-1' };
      const deletedInv = { id: 'inv-1' } as any;

      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        mockInvitation
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (invitationService.deleteInvitation as Mock).mockResolvedValue(
        deletedInv
      );

      const result = await resolver.deleteInvitation(actorContext, deleteData);

      expect(result).toBe(deletedInv);
      expect(invitationService.getInvitationOrFail).toHaveBeenCalledWith(
        'inv-1'
      );
    });
  });
});
