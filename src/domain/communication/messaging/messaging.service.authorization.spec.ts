import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagingAuthorizationService } from './messaging.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MessagingService } from './messaging.service';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { ConversationService } from '../conversation/conversation.service';
import { IMessaging } from './messaging.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import type { Mocked } from 'vitest';

describe('MessagingAuthorizationService', () => {
  let service: MessagingAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let messagingService: Mocked<MessagingService>;
  let conversationAuthorizationService: Mocked<ConversationAuthorizationService>;

  const mockMessaging: IMessaging = {
    id: 'messaging-1',
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
  } as IMessaging;

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
      inheritParentAuthorization: vi.fn(),
      createCredentialRuleUsingTypesOnly: vi.fn().mockReturnValue({
        name: 'credentialRuleTypes-messagingCreateConversation',
        cascade: false,
        grantedPrivileges: ['CREATE'],
        criterias: [],
      }),
      appendCredentialAuthorizationRules: vi
        .fn()
        .mockImplementation(auth => auth),
      saveAll: vi.fn(),
    };

    const mockMessagingService = {
      getMessagingOrFail: vi.fn(),
    };

    const mockConversationAuthorizationService = {
      applyAuthorizationPolicy: vi.fn(),
    };

    const mockConversationService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingAuthorizationService,
        {
          provide: AuthorizationPolicyService,
          useValue: mockAuthorizationPolicyService,
        },
        {
          provide: MessagingService,
          useValue: mockMessagingService,
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

    service = module.get<MessagingAuthorizationService>(
      MessagingAuthorizationService
    );
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    messagingService = module.get(MessagingService);
    conversationAuthorizationService = module.get(
      ConversationAuthorizationService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit authorization from parent', async () => {
      messagingService.getMessagingOrFail.mockResolvedValue(mockMessaging);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
        ...mockMessaging.authorization,
        credentialRules: [...mockParentAuthorization.credentialRules],
      } as IAuthorizationPolicy);
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      // Capture the original authorization before the call
      const originalAuthorization = mockMessaging.authorization;

      await service.applyAuthorizationPolicy(
        mockMessaging,
        mockParentAuthorization
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(originalAuthorization, mockParentAuthorization);
    });

    it('should cascade authorization to all conversations', async () => {
      messagingService.getMessagingOrFail.mockResolvedValue(mockMessaging);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        mockMessaging.authorization as IAuthorizationPolicy
      );
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      const result = await service.applyAuthorizationPolicy(
        mockMessaging,
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
      messagingService.getMessagingOrFail.mockResolvedValue(mockMessaging);
      const inheritedAuth = {
        ...mockMessaging.authorization,
        credentialRules: [...mockParentAuthorization.credentialRules],
      } as IAuthorizationPolicy;
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      const result = await service.applyAuthorizationPolicy(
        mockMessaging,
        mockParentAuthorization
      );

      expect(result).toContain(inheritedAuth);
      expect(result).toHaveLength(3);
    });

    it('should handle empty conversations array', async () => {
      const emptySet = {
        ...mockMessaging,
        conversations: [],
      };
      messagingService.getMessagingOrFail.mockResolvedValue(emptySet);
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

    it('should grant CREATE privilege to registered users for creating conversations', async () => {
      messagingService.getMessagingOrFail.mockResolvedValue(mockMessaging);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        mockMessaging.authorization as IAuthorizationPolicy
      );
      conversationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [{ id: 'conv-auth-1' } as IAuthorizationPolicy]
      );

      await service.applyAuthorizationPolicy(
        mockMessaging,
        mockParentAuthorization
      );

      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalledWith(
        ['create'],
        ['global-registered'],
        'credentialRuleTypes-messagingCreateConversation'
      );
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalled();
    });
  });
});
