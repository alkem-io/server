import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { VirtualContributorDefaultsService } from '../virtual-contributor-defaults/virtual.contributor.defaults.service';
import { VirtualActorLookupService } from '../virtual-contributor-lookup/virtual.contributor.lookup.service';
import { VirtualContributorPlatformSettingsService } from '../virtual-contributor-platform-settings/virtual.contributor.platform.settings.service';
import { VirtualContributorSettingsService } from '../virtual-contributor-settings/virtual.contributor.settings.service';
import { VirtualContributor } from './virtual.contributor.entity';
import { VirtualContributorService } from './virtual.contributor.service';

describe('VirtualContributorService', () => {
  let service: VirtualContributorService;
  let repository: {
    findOne: Mock;
    save: Mock;
    remove: Mock;
    countBy: Mock;
    find: Mock;
    createQueryBuilder: Mock;
  };
  let entityManager: {
    find: Mock;
    remove: Mock;
  };
  let authorizationPolicyService: { delete: Mock };
  let profileService: {
    createProfile: Mock;
    addOrUpdateTagsetOnProfile: Mock;
    updateProfile: Mock;
    deleteProfile: Mock;
  };
  let _contributorService: {
    addAvatarVisualToContributorProfile: Mock;
    ensureAvatarIsStoredInLocalStorageBucket: Mock;
  };
  let _communicationAdapter: { syncActor: Mock };
  let aiPersonaService: {
    createAiPersona: Mock;
    deleteAiPersona: Mock;
    getAiPersonaOrFail: Mock;
  };
  let aiServerAdapter: { getAiServer: Mock; refreshBodyOfKnowledge: Mock };
  let knowledgeBaseService: {
    createKnowledgeBase: Mock;
    save: Mock;
    delete: Mock;
  };
  let virtualActorLookupService: { getAccountOrFail: Mock };
  let virtualContributorSettingsService: { updateSettings: Mock };
  let virtualContributorPlatformSettingsService: { updateSettings: Mock };
  let accountLookupService: { getHostOrFail: Mock };
  let _virtualContributorDefaultsService: {
    createVirtualContributorNameID: Mock;
    createKnowledgeBaseInput: Mock;
  };

  beforeEach(async () => {
    entityManager = {
      find: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorService,
        repositoryProviderMockFactory(VirtualContributor),
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorService);
    repository = module.get(getRepositoryToken(VirtualContributor));
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    profileService = module.get(ProfileService) as any;
    _contributorService = module.get(ProfileAvatarService) as any;
    _communicationAdapter = module.get(CommunicationAdapter) as any;
    aiPersonaService = module.get(AiPersonaService) as any;
    aiServerAdapter = module.get(AiServerAdapter) as any;
    knowledgeBaseService = module.get(KnowledgeBaseService) as any;
    virtualActorLookupService = module.get(VirtualActorLookupService) as any;
    virtualContributorSettingsService = module.get(
      VirtualContributorSettingsService
    ) as any;
    virtualContributorPlatformSettingsService = module.get(
      VirtualContributorPlatformSettingsService
    ) as any;
    accountLookupService = module.get(AccountLookupService) as any;
    _virtualContributorDefaultsService = module.get(
      VirtualContributorDefaultsService
    ) as any;
  });

  describe('getVirtualContributorOrFail', () => {
    it('should return the virtual contributor when found', async () => {
      const mockVC = { id: 'vc-1', nameID: 'test-vc' };
      repository.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorByIdOrFail('vc-1');
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when virtual contributor is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorAndActor', () => {
    it('should return virtual contributor and actorId when VC is found', async () => {
      const mockCredentials = [{ id: 'cred-1' }];
      const mockVC = { id: 'vc-1', credentials: mockCredentials };
      repository.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorAndActor('vc-1');

      expect(result.virtualContributor).toBe(mockVC);
      expect(result.actorId).toBe('vc-1');
      expect(result.credentials).toBe(mockCredentials);
    });

    it('should throw EntityNotFoundException when VC is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorAndActor('vc-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageBucket', () => {
    it('should return the storage bucket from the virtual contributor profile', async () => {
      const mockBucket = { id: 'bucket-1' };
      const mockVC = { id: 'vc-1', profile: { storageBucket: mockBucket } };
      repository.findOne.mockResolvedValue(mockVC);

      const result = await service.getStorageBucket('vc-1');
      expect(result).toBe(mockBucket);
    });

    it('should throw RelationshipNotFoundException when storage bucket is not found', async () => {
      const mockVC = { id: 'vc-1', profile: { storageBucket: undefined } };
      repository.findOne.mockResolvedValue(mockVC);

      await expect(service.getStorageBucket('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const mockVC = { id: 'vc-1', profile: undefined };
      repository.findOne.mockResolvedValue(mockVC);

      await expect(service.getStorageBucket('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getKnowledgeBaseOrFail', () => {
    it('should return knowledge base when already loaded on the virtual contributor', async () => {
      const mockKB = { id: 'kb-1' };
      const vc = { id: 'vc-1', knowledgeBase: mockKB } as any;

      const result = await service.getKnowledgeBaseOrFail(vc);
      expect(result).toBe(mockKB);
    });

    it('should fetch and return knowledge base when not pre-loaded', async () => {
      const mockKB = { id: 'kb-1' };
      repository.findOne.mockResolvedValue({
        id: 'vc-1',
        knowledgeBase: mockKB,
      });

      const vc = { id: 'vc-1', knowledgeBase: undefined } as any;
      const result = await service.getKnowledgeBaseOrFail(vc);

      expect(result).toBe(mockKB);
    });

    it('should throw EntityNotFoundException when knowledge base is not found', async () => {
      repository.findOne.mockResolvedValue({
        id: 'vc-1',
        knowledgeBase: undefined,
      });

      const vc = { id: 'vc-1', knowledgeBase: undefined } as any;

      await expect(service.getKnowledgeBaseOrFail(vc)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getProvider', () => {
    it('should return the host contributor from the account', async () => {
      const mockAccount = { id: 'account-1' };
      const mockHost = { id: 'host-1' };
      virtualActorLookupService.getAccountOrFail.mockResolvedValue(mockAccount);
      accountLookupService.getHostOrFail.mockResolvedValue(mockHost);

      const result = await service.getProvider({ id: 'vc-1' } as any);

      expect(virtualActorLookupService.getAccountOrFail).toHaveBeenCalledWith(
        'vc-1'
      );
      expect(accountLookupService.getHostOrFail).toHaveBeenCalledWith(
        mockAccount
      );
      expect(result).toBe(mockHost);
    });
  });

  describe('updateVirtualContributorSettings', () => {
    it('should delegate to settings service and save', async () => {
      const updatedSettings = {
        privacy: { knowledgeBaseContentVisible: true },
      };
      virtualContributorSettingsService.updateSettings.mockReturnValue(
        updatedSettings
      );
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const vc = {
        id: 'vc-1',
        settings: { privacy: { knowledgeBaseContentVisible: false } },
      } as any;
      const result = await service.updateVirtualContributorSettings(vc, {
        privacy: { knowledgeBaseContentVisible: true },
      } as any);

      expect(
        virtualContributorSettingsService.updateSettings
      ).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.settings).toBe(updatedSettings);
    });
  });

  describe('updateVirtualContributorPlatformSettings', () => {
    it('should delegate to platform settings service and save', async () => {
      const updatedPlatformSettings = { promptGraphEditingEnabled: true };
      virtualContributorPlatformSettingsService.updateSettings.mockReturnValue(
        updatedPlatformSettings
      );
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const vc = {
        id: 'vc-1',
        platformSettings: { promptGraphEditingEnabled: false },
      } as any;
      const result = await service.updateVirtualContributorPlatformSettings(
        vc,
        {
          promptGraphEditingEnabled: true,
        } as any
      );

      expect(
        virtualContributorPlatformSettingsService.updateSettings
      ).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.platformSettings).toBe(updatedPlatformSettings);
    });
  });

  describe('refreshBodyOfKnowledge', () => {
    it('should return false without calling AI server for NONE body of knowledge type', async () => {
      const vc = {
        id: 'vc-1',
        bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.NONE,
      } as any;
      const actorContext = { userID: 'user-1' } as any;

      const result = await service.refreshBodyOfKnowledge(vc, actorContext);

      expect(result).toBe(false);
      expect(aiServerAdapter.refreshBodyOfKnowledge).not.toHaveBeenCalled();
    });

    it('should return false without calling AI server for OTHER body of knowledge type', async () => {
      const vc = {
        id: 'vc-1',
        bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.OTHER,
      } as any;
      const actorContext = { userID: 'user-1' } as any;

      const result = await service.refreshBodyOfKnowledge(vc, actorContext);

      expect(result).toBe(false);
    });

    it('should call AI server refresh for ALKEMIO_SPACE body of knowledge type', async () => {
      aiServerAdapter.refreshBodyOfKnowledge.mockResolvedValue(true);

      const vc = {
        id: 'vc-1',
        bodyOfKnowledgeType:
          VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        bodyOfKnowledgeID: 'bok-1',
        aiPersonaID: 'persona-1',
      } as any;
      const actorContext = { userID: 'user-1' } as any;

      const result = await service.refreshBodyOfKnowledge(vc, actorContext);

      expect(aiServerAdapter.refreshBodyOfKnowledge).toHaveBeenCalledWith(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        'persona-1'
      );
      expect(result).toBe(true);
    });

    it('should pass empty string for bodyOfKnowledgeID when it is undefined', async () => {
      aiServerAdapter.refreshBodyOfKnowledge.mockResolvedValue(true);

      const vc = {
        id: 'vc-1',
        bodyOfKnowledgeType:
          VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE,
        bodyOfKnowledgeID: undefined,
        aiPersonaID: 'persona-1',
      } as any;
      const actorContext = { userID: 'user-1' } as any;

      await service.refreshBodyOfKnowledge(vc, actorContext);

      expect(aiServerAdapter.refreshBodyOfKnowledge).toHaveBeenCalledWith(
        '',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE,
        'persona-1'
      );
    });
  });

  describe('deleteVirtualContributor', () => {
    it('should delete profile, authorization, AI persona, knowledge base, and invitations', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: { id: 'auth-1' },
        aiPersonaID: 'persona-1',
      };
      repository.findOne.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      aiPersonaService.deleteAiPersona.mockResolvedValue(undefined);
      knowledgeBaseService.delete.mockResolvedValue(undefined);
      entityManager.find.mockResolvedValue([]); // No invitations
      repository.remove.mockResolvedValue({ ...mockVC, id: undefined });

      const result = await service.deleteVirtualContributor('vc-1');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockVC.authorization
      );
      // Credentials are on Actor (which VC extends), deleted via cascade
      expect(aiPersonaService.deleteAiPersona).toHaveBeenCalledWith({
        ID: 'persona-1',
      });
      expect(knowledgeBaseService.delete).toHaveBeenCalledWith(
        mockVC.knowledgeBase
      );
      expect(result.id).toBe('vc-1');
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: undefined,
        knowledgeBase: { id: 'kb-1' },
      };
      repository.findOne.mockResolvedValue(mockVC);

      await expect(service.deleteVirtualContributor('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when knowledge base is missing', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        knowledgeBase: undefined,
      };
      repository.findOne.mockResolvedValue(mockVC);

      await expect(service.deleteVirtualContributor('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should skip authorization deletion when authorization is not set', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: undefined,
        aiPersonaID: undefined,
      };
      repository.findOne.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      knowledgeBaseService.delete.mockResolvedValue(undefined);
      entityManager.find.mockResolvedValue([]);
      repository.remove.mockResolvedValue({ ...mockVC, id: undefined });

      await service.deleteVirtualContributor('vc-1');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should handle AI persona deletion failure gracefully', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: undefined,
        aiPersonaID: 'persona-1',
      };
      repository.findOne.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      aiPersonaService.deleteAiPersona.mockRejectedValue(
        new Error('External service error')
      );
      knowledgeBaseService.delete.mockResolvedValue(undefined);
      entityManager.find.mockResolvedValue([]);
      repository.remove.mockResolvedValue({ ...mockVC, id: undefined });

      // Should not throw - AI persona deletion failure is caught
      const result = await service.deleteVirtualContributor('vc-1');
      expect(result.id).toBe('vc-1');
    });

    it('should delete invitations associated with the virtual contributor', async () => {
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'inv-auth-1' },
      };
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: undefined,
        aiPersonaID: undefined,
      };
      repository.findOne.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      knowledgeBaseService.delete.mockResolvedValue(undefined);
      entityManager.find.mockResolvedValue([mockInvitation]);
      entityManager.remove.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue({ ...mockVC, id: undefined });

      await service.deleteVirtualContributor('vc-1');

      expect(entityManager.find).toHaveBeenCalled();
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockInvitation.authorization
      );
      expect(entityManager.remove).toHaveBeenCalledWith(mockInvitation);
    });
  });

  describe('updateVirtualContributor', () => {
    it('should update the profile when profileData is provided', async () => {
      const mockProfile = { id: 'profile-1', displayName: 'Updated' };
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        profile: { id: 'profile-1', displayName: 'Old' },
        knowledgeBase: { profile: { description: '' } },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.countBy.mockResolvedValue(0);
      profileService.updateProfile.mockResolvedValue(mockProfile);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      await service.updateVirtualContributor({
        ID: 'vc-1',
        profileData: { displayName: 'Updated' },
      } as any);

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        { displayName: 'Updated' }
      );
    });

    it('should throw ValidationException when new nameID is already taken', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'old-name',
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.countBy.mockResolvedValue(1);

      await expect(
        service.updateVirtualContributor({
          ID: 'vc-1',
          nameID: 'taken-name',
        } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should not check nameID uniqueness when nameID has not changed', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'same-name',
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      await service.updateVirtualContributor({
        ID: 'vc-1',
        nameID: 'same-name',
      } as any);

      expect(repository.countBy).not.toHaveBeenCalled();
    });

    it('should update listedInStore when provided as a boolean', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        listedInStore: true,
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        listedInStore: false,
      } as any);

      expect(result.listedInStore).toBe(false);
    });

    it('should update searchVisibility when provided', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        searchVisibility: 'account',
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        searchVisibility: 'public',
      } as any);

      expect(result.searchVisibility).toBe('public');
    });

    it('should update knowledgeBase profile description when provided', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: { description: 'old' } },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        knowledgeBaseData: { profile: { description: 'new description' } },
      } as any);

      expect(result.knowledgeBase.profile.description).toBe('new description');
    });

    it('should update bodyOfKnowledgeType when provided and different', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.NONE,
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        bodyOfKnowledgeType:
          VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
      } as any);

      expect(result.bodyOfKnowledgeType).toBe(
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE
      );
    });

    it('should update interactionModes when provided', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        interactionModes: [],
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const newModes = ['mode1', 'mode2'];
      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        interactionModes: newModes,
      } as any);

      expect(result.interactionModes).toBe(newModes);
    });

    it('should update bodyOfKnowledgeDescription when provided as a string', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        bodyOfKnowledgeDescription: 'old',
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      repository.findOne.mockResolvedValue(mockVC);
      repository.save.mockImplementation((entity: any) =>
        Promise.resolve(entity)
      );

      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        bodyOfKnowledgeDescription: 'new description',
      } as any);

      expect(result.bodyOfKnowledgeDescription).toBe('new description');
    });
  });

  describe('getBodyOfKnowledgeLastUpdated', () => {
    it('should return the last updated date from the AI persona', async () => {
      const lastUpdated = new Date('2024-01-01');
      aiPersonaService.getAiPersonaOrFail.mockResolvedValue({
        bodyOfKnowledgeLastUpdated: lastUpdated,
      });

      const result = await service.getBodyOfKnowledgeLastUpdated({
        aiPersonaID: 'persona-1',
      } as any);

      expect(result).toBe(lastUpdated);
    });
  });
});
