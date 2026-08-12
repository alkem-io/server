import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { ConversationResolverMutations } from './conversation.resolver.mutations';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';

describe('ConversationResolverMutations', () => {
  let resolver: ConversationResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let _authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let conversationService: Mocked<ConversationService>;
  let conversationAuthorizationService: Mocked<ConversationAuthorizationService>;

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
    });
  });

  // US2-AS4 live-verification: removeConversationMember/leaveConversation must
  // never resolve `true` on nothing more than "the RPC was sent". The resolver
  // has no try/catch around conversationService.removeMember, so whatever the
  // service does is what the client sees: `true` means the member was removed
  // on the Alkemio side (including the sec-server-11 local fallback when
  // Matrix refuses the kick), and any rejection propagates as a real GraphQL
  // error instead of being swallowed into an optimistic success.
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
