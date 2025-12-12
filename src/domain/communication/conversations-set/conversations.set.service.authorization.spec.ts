import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsSetAuthorizationService } from './conversations.set.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationsSetService } from './conversations.set.service';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { ConversationService } from '../conversation/conversation.service';
import { IConversationsSet } from './conversations.set.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

describe('ConversationsSetAuthorizationService', () => {
  let service: ConversationsSetAuthorizationService;
  let authorizationPolicyService: jest.Mocked<AuthorizationPolicyService>;
  let conversationsSetService: jest.Mocked<ConversationsSetService>;
  let conversationAuthorizationService: jest.Mocked<ConversationAuthorizationService>;

  const mockConversationsSet: IConversationsSet = {
    id: 'conversations-set-1',
    authorization: {
      id: 'auth-1',
      type: 'COMMUNICATION_CONVERSATION' as any,
      credentialRules: [],
      privilegeRules: [],
      verifiedCredentialRules: [],
      createdDate: new Date(),
      updatedDate: new Date(),
    } as unknown as IAuthorizationPolicy,
    conversations: [
      { id: 'conversation-1' } as any,
      { id: 'conversation-2' } as any,
    ],
  } as IConversationsSet;

  const mockParentAuthorization: IAuthorizationPolicy = {
    id: 'parent-auth-1',
    type: 'PLATFORM' as any,
    credentialRules: [
      {
        name: 'Platform Admin Access',
        cascade: true,
        grantedPrivileges: ['READ', 'UPDATE'],
        criterias: [],
      },
    ],
    privilegeRules: [],
    verifiedCredentialRules: [],
    createdDate: new Date(),
    updatedDate: new Date(),
  } as unknown as IAuthorizationPolicy;

  beforeEach(async () => {
    const mockAuthorizationPolicyService = {
      inheritParentAuthorization: jest.fn(),
      saveAll: jest.fn(),
    };

    const mockConversationsSetService = {
      getConversationsSetOrFail: jest.fn(),
    };

    const mockConversationAuthorizationService = {
      applyAuthorizationPolicy: jest.fn(),
    };

    const mockConversationService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsSetAuthorizationService,
        {
          provide: AuthorizationPolicyService,
          useValue: mockAuthorizationPolicyService,
        },
        {
          provide: ConversationsSetService,
          useValue: mockConversationsSetService,
        },
        {
          provide: ConversationAuthorizationService,
          useValue: mockConversationAuthorizationService,
        },
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
      ],
    }).compile();

    service = module.get<ConversationsSetAuthorizationService>(
      ConversationsSetAuthorizationService
    );
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    conversationsSetService = module.get(ConversationsSetService);
    conversationAuthorizationService = module.get(
      ConversationAuthorizationService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit authorization from parent', async () => {
      conversationsSetService.getConversationsSetOrFail.mockResolvedValue(
        mockConversationsSet
      );
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
        ...mockConversationsSet.authorization,
        credentialRules: [...mockParentAuthorization.credentialRules],
      } as IAuthorizationPolicy);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      // Capture the original authorization before the call
      const originalAuthorization = mockConversationsSet.authorization;

      await service.applyAuthorizationPolicy(
        mockConversationsSet,
        mockParentAuthorization
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(originalAuthorization, mockParentAuthorization);
    });

    it('should cascade authorization to all conversations', async () => {
      conversationsSetService.getConversationsSetOrFail.mockResolvedValue(
        mockConversationsSet
      );
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        mockConversationsSet.authorization as IAuthorizationPolicy
      );
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      const result = await service.applyAuthorizationPolicy(
        mockConversationsSet,
        mockParentAuthorization
      );

      expect(
        conversationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      expect(
        conversationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('conversation-1');
      expect(
        conversationAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('conversation-2');
      expect(result).toHaveLength(3); // 1 set + 2 conversations
    });

    it('should return updated authorizations for set and conversations', async () => {
      conversationsSetService.getConversationsSetOrFail.mockResolvedValue(
        mockConversationsSet
      );
      const inheritedAuth = {
        ...mockConversationsSet.authorization,
        credentialRules: [...mockParentAuthorization.credentialRules],
      } as IAuthorizationPolicy;
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      const result = await service.applyAuthorizationPolicy(
        mockConversationsSet,
        mockParentAuthorization
      );

      expect(result).toContain(inheritedAuth);
      expect(result).toHaveLength(3);
    });

    it('should handle empty conversations array', async () => {
      const emptySet = {
        ...mockConversationsSet,
        conversations: [],
      };
      conversationsSetService.getConversationsSetOrFail.mockResolvedValue(
        emptySet
      );
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        emptySet.authorization as IAuthorizationPolicy
      );

      const result = await service.applyAuthorizationPolicy(
        emptySet,
        mockParentAuthorization
      );

      expect(
        conversationAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(result).toHaveLength(1); // Only the set authorization
    });
  });
});
