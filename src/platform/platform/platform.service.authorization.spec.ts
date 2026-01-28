import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationService } from './platform.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformService } from './platform.service';
import { ForumAuthorizationService } from '@platform/forum/forum.service.authorization';
import { LibraryAuthorizationService } from '@library/library/library.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { LicensingFrameworkAuthorizationService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { MessagingAuthorizationService } from '@domain/communication/messaging/messaging.service.authorization';
import { IPlatform } from './platform.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { RoleSetType } from '@common/enums/role.set.type';
import type { Mocked } from 'vitest';

describe('PlatformAuthorizationService', () => {
  let service: PlatformAuthorizationService;
  let platformService: Mocked<PlatformService>;
  let messagingAuthorizationService: Mocked<MessagingAuthorizationService>;

  const mockPlatform: IPlatform = {
    id: 'platform-1',
    authorization: {
      id: 'auth-1',
      credentialRules: [],
      privilegeRules: [],
      verifiedCredentialRules: [],
      type: 'PLATFORM' as any,
      createdDate: new Date(),
      updatedDate: new Date(),
    } as unknown as IAuthorizationPolicy,
    forum: { id: 'forum-1' } as any,
    library: { id: 'library-1' } as any,
    storageAggregator: { id: 'storage-1' } as any,
    licensingFramework: { id: 'licensing-1' } as any,
    templatesManager: { id: 'templates-1' } as any,
    roleSet: { id: 'roleset-1', type: RoleSetType.PLATFORM } as any,
    messaging: { id: 'messaging-1' } as any,
  } as IPlatform;

  beforeEach(async () => {
    const mockAuthorizationPolicyService = {
      reset: vi.fn(auth => auth),
      appendCredentialAuthorizationRules: vi.fn(auth => auth),
      cloneAuthorizationPolicy: vi.fn(auth => ({ ...auth })),
      appendCredentialRuleAnonymousRegisteredAccess: vi.fn(auth => auth),
      createCredentialRuleUsingTypesOnly: vi.fn(() => ({
        cascade: false,
      })),
      createCredentialRule: vi.fn(() => ({
        cascade: false,
      })),
    };

    const mockPlatformService = {
      getPlatformOrFail: vi.fn(),
    };

    const mockPlatformAuthorizationPolicyService = {
      inheritRootAuthorizationPolicy: vi.fn(auth => auth),
    };

    const mockForumAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockLibraryAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue({ id: 'lib-auth' }),
    };

    const mockStorageAggregatorAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockTemplatesManagerAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockLicensingFrameworkAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockRoleSetAuthorizationService = {
      applyAuthorizationPolicy: vi.fn().mockResolvedValue([]),
    };

    const mockMessagingAuthorizationService = {
      applyAuthorizationPolicy: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuthorizationService,
        {
          provide: AuthorizationPolicyService,
          useValue: mockAuthorizationPolicyService,
        },
        {
          provide: PlatformService,
          useValue: mockPlatformService,
        },
        {
          provide: PlatformAuthorizationPolicyService,
          useValue: mockPlatformAuthorizationPolicyService,
        },
        {
          provide: ForumAuthorizationService,
          useValue: mockForumAuthorizationService,
        },
        {
          provide: LibraryAuthorizationService,
          useValue: mockLibraryAuthorizationService,
        },
        {
          provide: StorageAggregatorAuthorizationService,
          useValue: mockStorageAggregatorAuthorizationService,
        },
        {
          provide: TemplatesManagerAuthorizationService,
          useValue: mockTemplatesManagerAuthorizationService,
        },
        {
          provide: LicensingFrameworkAuthorizationService,
          useValue: mockLicensingFrameworkAuthorizationService,
        },
        {
          provide: RoleSetAuthorizationService,
          useValue: mockRoleSetAuthorizationService,
        },
        {
          provide: MessagingAuthorizationService,
          useValue: mockMessagingAuthorizationService,
        },
      ],
    }).compile();

    service = module.get<PlatformAuthorizationService>(
      PlatformAuthorizationService
    );
    platformService = module.get(PlatformService);
    messagingAuthorizationService = module.get(MessagingAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw error if messaging is missing', async () => {
      const platformWithoutMessaging = {
        ...mockPlatform,
        messaging: undefined,
      };
      platformService.getPlatformOrFail.mockResolvedValue(
        platformWithoutMessaging
      );

      await expect(service.applyAuthorizationPolicy()).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should cascade authorization to messaging', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        { id: 'messaging-auth' } as IAuthorizationPolicy,
      ]);

      await service.applyAuthorizationPolicy();

      expect(
        messagingAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        mockPlatform.messaging,
        mockPlatform.authorization
      );
    });

    it('should include messaging authorizations in result', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      const messagingAuth = {
        id: 'messaging-auth',
      } as IAuthorizationPolicy;
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
        messagingAuth,
      ]);

      const result = await service.applyAuthorizationPolicy();

      expect(result).toContainEqual(messagingAuth);
    });

    it('should apply authorization to all platform children', async () => {
      platformService.getPlatformOrFail.mockResolvedValue(mockPlatform);
      messagingAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      const result = await service.applyAuthorizationPolicy();

      // Should have called authorization for all children including messaging
      expect(
        messagingAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
