import { ActorType } from '@common/enums/actor.type';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { ConversationRepairService } from './conversation.repair.service';
import { ConversationResolverMutations } from './conversation.resolver.mutations';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';

describe('ConversationResolverMutations', () => {
  let resolver: ConversationResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let _authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let conversationService: Mocked<ConversationService>;
  let conversationAuthorizationService: Mocked<ConversationAuthorizationService>;
  let conversationRepairService: Mocked<ConversationRepairService>;
  let roomService: Mocked<RoomService>;
  let subscriptionPublishService: Mocked<SubscriptionPublishService>;

  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ConversationResolverMutations);
    authorizationService = module.get(AuthorizationService);
    _authorizationPolicyService = module.get(AuthorizationPolicyService);
    conversationService = module.get(ConversationService);
    conversationAuthorizationService = module.get(
      ConversationAuthorizationService
    );
    conversationRepairService = module.get(ConversationRepairService);
    roomService = module.get(RoomService);
    subscriptionPublishService = module.get(SubscriptionPublishService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('resetConversationVc', () => {
    it('should reset a USER_VC conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        authorization: { id: 'auth-1' },
        room: { id: 'room-1' },
      } as any;

      conversationService.getConversationOrFail
        .mockResolvedValueOnce(mockConversation) // initial fetch
        .mockResolvedValueOnce(mockConversation); // final fetch
      conversationService.getConversationMembers.mockResolvedValue([
        { actorID: 'user-1', actorType: ActorType.USER },
        { actorID: 'vc-1', actorType: ActorType.VIRTUAL_CONTRIBUTOR },
      ] as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      conversationService.resetConversation.mockResolvedValue(mockConversation);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'auth-1' }] as any
      );

      const result = await resolver.resetConversationVc(actorContext, {
        conversationID: 'conv-1',
      } as any);

      expect(result).toBe(mockConversation);
      expect(conversationService.resetConversation).toHaveBeenCalledWith(
        mockConversation,
        'user-1',
        'vc-1'
      );
    });

    it('should throw ValidationException when conversation is not USER_VC', async () => {
      const mockConversation = {
        id: 'conv-1',
        authorization: { id: 'auth-1' },
        room: { id: 'room-1' },
      } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      conversationService.getConversationMembers.mockResolvedValue([
        { actorID: 'user-1', actorType: ActorType.USER },
        { actorID: 'user-2', actorType: ActorType.USER },
      ] as any);

      await expect(
        resolver.resetConversationVc(actorContext, {
          conversationID: 'conv-1',
        } as any)
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation with proper authorization', async () => {
      const mockConversation = {
        id: 'conv-1',
        authorization: { id: 'auth-1' },
      } as any;
      const deletedConversation = { id: 'conv-1', deleted: true } as any;

      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      conversationService.deleteConversation.mockResolvedValue(
        deletedConversation
      );

      conversationService.getConversationMemberActorIds.mockResolvedValue([
        'a',
        'b',
      ]);

      const result = await resolver.deleteConversation(actorContext, {
        ID: 'conv-1',
      } as any);

      expect(result).toBe(deletedConversation);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockConversation.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(
        subscriptionPublishService.publishConversationEvent
      ).toHaveBeenCalledTimes(1);
      expect(
        subscriptionPublishService.publishConversationGovernanceEvent
      ).toHaveBeenCalledWith(['a', 'b'], {
        eventType: 'CONVERSATION_DELETED',
        conversationID: 'conv-1',
      });
    });
  });

  // US2-AS4 live-verification: removeConversationMember/leaveConversation must
  // never resolve `true` on nothing more than "the RPC was sent". The resolver
  // has no try/catch around conversationService.removeMember, so whatever the
  // service does is what the client sees: `true` means the member was removed
  // on the Alkemio side (including the sec-server-11 local fallback when
  // Matrix refuses the kick), and any rejection propagates as a real GraphQL
  // error instead of being swallowed into an optimistic success.
  describe('repairConversationRoom', () => {
    const conversation = {
      id: 'conv-1',
      authorization: { id: 'auth-1' },
      room: { id: 'room-1' },
    } as any;

    beforeEach(() => {
      conversationService.getConversationOrFail.mockResolvedValue(conversation);
    });

    it('denies a non-member before the repair service is invoked', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new ForbiddenAuthorizationPolicyException(
          'denied',
          AuthorizationPrivilege.READ,
          'auth-1',
          'user-1'
        );
      });

      await expect(
        resolver.repairConversationRoom(actorContext, {
          conversationID: 'conv-1',
        })
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
      expect(conversationRepairService.repair).not.toHaveBeenCalled();
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        conversation.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
    });

    it('returns the repair result for a member', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      const repairResult = { outcome: 'ROOM_VERIFIED', membersAdded: 0 } as any;
      conversationRepairService.repair.mockResolvedValue(repairResult);

      const result = await resolver.repairConversationRoom(actorContext, {
        conversationID: 'conv-1',
      });

      expect(result).toBe(repairResult);
      expect(conversationRepairService.repair).toHaveBeenCalledWith(
        conversation
      );
    });
  });

  describe('outcome semantics of the governance mutations', () => {
    const groupConversation = {
      id: 'conv-1',
      authorization: { id: 'auth-1' },
      room: { id: 'room-1', type: RoomType.CONVERSATION_GROUP },
    } as any;

    beforeEach(() => {
      conversationService.getConversationOrFail.mockResolvedValue(
        groupConversation
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    });

    it('assignConversationMember returns true only after the awaited adapter call resolved', async () => {
      let settled = false;
      conversationService.addMember.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        settled = true;
        return groupConversation;
      });

      const result = await resolver.assignConversationMember(actorContext, {
        conversationID: 'conv-1',
        memberID: 'member-1',
      } as any);

      expect(settled).toBe(true);
      expect(result).toBe(true);
    });

    it('assignConversationMember propagates an adapter rejection as the mapped status', async () => {
      conversationService.addMember.mockRejectedValue(
        CommunicationAdapterException.fromTransportError(
          'batchAddMember',
          new Error('Failed to receive response within timeout of 30000ms')
        )
      );

      await expect(
        resolver.assignConversationMember(actorContext, {
          conversationID: 'conv-1',
          memberID: 'member-1',
        } as any)
      ).rejects.toMatchObject({
        code: AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE,
      });
    });

    it('updateConversation returns true only after the awaited adapter update resolved', async () => {
      let settled = false;
      roomService.updateRoomDisplayName.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        settled = true;
      });

      const result = await resolver.updateConversation(actorContext, {
        conversationID: 'conv-1',
        displayName: 'renamed',
      } as any);

      expect(settled).toBe(true);
      expect(result).toBe(true);
    });

    it('updateConversation propagates an adapter failure instead of returning true', async () => {
      roomService.updateRoomDisplayName.mockRejectedValue(
        CommunicationAdapterException.fromTransportError(
          'updateRoom',
          new Error('channel closed')
        )
      );

      await expect(
        resolver.updateConversation(actorContext, {
          conversationID: 'conv-1',
          displayName: 'renamed',
        } as any)
      ).rejects.toThrow(CommunicationAdapterException);
    });
  });

  describe('removeConversationMember / leaveConversation (US2-AS4)', () => {
    const mockConversation = {
      id: 'conv-1',
      authorization: { id: 'auth-1' },
    } as any;

    beforeEach(() => {
      conversationService.getConversationOrFail.mockResolvedValue(
        mockConversation
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
    });

    it('removeConversationMember returns true when the Matrix kick is confirmed', async () => {
      conversationService.removeMember.mockResolvedValue(mockConversation);

      const result = await resolver.removeConversationMember(actorContext, {
        conversationID: 'conv-1',
        memberID: 'member-1',
      } as any);

      expect(result).toBe(true);
      expect(conversationService.removeMember).toHaveBeenCalledWith(
        'conv-1',
        'member-1'
      );
    });

    it('sec-server-11: returns true when Matrix rejected the kick but the service removed the member locally', async () => {
      // The service downgrades a refused Matrix kick to an authoritative
      // local removal, so it RESOLVES — `true` documents "removed on the
      // Alkemio side", not "Matrix confirmed the kick".
      conversationService.removeMember.mockResolvedValue(mockConversation);

      await expect(
        resolver.removeConversationMember(actorContext, {
          conversationID: 'conv-1',
          memberID: 'member-1',
        } as any)
      ).resolves.toBe(true);
    });

    it('removeConversationMember propagates a service failure instead of returning true', async () => {
      // Everything the service does NOT downgrade (transport failures,
      // programming errors, an adapter exception raised outside the kick
      // fallback) must surface as a GraphQL error.
      conversationService.removeMember.mockRejectedValue(
        CommunicationAdapterException.fromAdapterError('batchRemoveMember', {
          code: 'NOT_ALLOWED',
          message: 'insufficient power level',
        })
      );

      await expect(
        resolver.removeConversationMember(actorContext, {
          conversationID: 'conv-1',
          memberID: 'member-1',
        } as any)
      ).rejects.toThrow(CommunicationAdapterException);
    });

    it('leaveConversation propagates a service failure instead of returning true', async () => {
      conversationService.removeMember.mockRejectedValue(
        new Error('rabbit transport failure')
      );

      await expect(
        resolver.leaveConversation(actorContext, {
          conversationID: 'conv-1',
        } as any)
      ).rejects.toThrow('rabbit transport failure');
      expect(conversationService.removeMember).toHaveBeenCalledWith(
        'conv-1',
        actorContext.actorID
      );
    });
  });
});
