import { ActorType } from '@common/enums/actor.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { InvitationService } from './invitation.service';
import { SPACE_INVITATION_ACCEPTORS_CHANGED } from './invitation.space.acceptors.event';

describe('InvitationResolverMutations', () => {
  let resolver: InvitationResolverMutations;
  let invitationService: InvitationService;
  let authorizationService: AuthorizationService;
  let actorLookupService: ActorLookupService;
  let eventEmitter: EventEmitter2;

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
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
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
        'inv-1',
        { relations: { roleSet: true } }
      );
    });

    const deleteSpaceInvitationFor = async (invitedActorType: ActorType) => {
      (invitationService.getInvitationOrFail as Mock).mockResolvedValue({
        id: 'inv-1',
        invitedActorID: 'actor-1',
        authorization: { id: 'auth-1' },
        roleSet: { id: 'role-set-1', type: RoleSetType.SPACE },
      });
      (invitationService.deleteInvitation as Mock).mockResolvedValue({
        id: 'inv-1',
      });
      (actorLookupService.getActorTypeById as Mock).mockResolvedValue(
        invitedActorType
      );
      await resolver.deleteInvitation({ actorID: 'user-1' } as any, {
        ID: 'inv-1',
      });
    };

    it('resets the Space when an organization invitation is deleted', async () => {
      await deleteSpaceInvitationFor(ActorType.ORGANIZATION);

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        SPACE_INVITATION_ACCEPTORS_CHANGED,
        { roleSetID: 'role-set-1' }
      );
    });

    it('does not reset the Space when a user invitation is deleted', async () => {
      await deleteSpaceInvitationFor(ActorType.USER);

      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
