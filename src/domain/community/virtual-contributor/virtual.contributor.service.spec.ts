import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { KnowledgeBaseService } from '@domain/common/knowledge-base/knowledge.base.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { ContributorService } from '../contributor/contributor.service';
import { VirtualContributorDefaultsService } from '../virtual-contributor-defaults/virtual.contributor.defaults.service';
import { VirtualContributorLookupService } from '../virtual-contributor-lookup/virtual.contributor.lookup.service';
import { VirtualContributorPlatformSettingsService } from '../virtual-contributor-platform-settings/virtual.contributor.platform.settings.service';
import { VirtualContributorSettingsService } from '../virtual-contributor-settings/virtual.contributor.settings.service';
import { VirtualContributor } from './virtual.contributor.entity';
import { VirtualContributorService } from './virtual.contributor.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('VirtualContributorService', () => {
  let service: VirtualContributorService;
  let db: any;
  let authorizationPolicyService: { delete: Mock };
  let agentService: { createAgent: Mock; deleteAgent: Mock };
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
  let virtualContributorLookupService: { getAccountOrFail: Mock };
  let virtualContributorSettingsService: { updateSettings: Mock };
  let virtualContributorPlatformSettingsService: { updateSettings: Mock };
  let accountLookupService: { getHostOrFail: Mock };
  let _virtualContributorDefaultsService: {
    createVirtualContributorNameID: Mock;
    createKnowledgeBaseInput: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VirtualContributorService);
    db = module.get(DRIZZLE);
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    agentService = module.get(AgentService) as any;
    profileService = module.get(ProfileService) as any;
    _contributorService = module.get(ContributorService) as any;
    _communicationAdapter = module.get(CommunicationAdapter) as any;
    aiPersonaService = module.get(AiPersonaService) as any;
    aiServerAdapter = module.get(AiServerAdapter) as any;
    knowledgeBaseService = module.get(KnowledgeBaseService) as any;
    virtualContributorLookupService = module.get(
      VirtualContributorLookupService
    ) as any;
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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorOrFail('vc-1');
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when virtual contributor is not found', async () => {
      db.query.virtualContributors.findFirst.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorAndAgent', () => {
    it('should return virtual contributor and agent when agent is loaded', async () => {
      const mockAgent = { id: 'agent-1' };
      const mockVC = { id: 'vc-1', agent: mockAgent };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorAndAgent('vc-1');

      expect(result.virtualContributor).toBe(mockVC);
      expect(result.agent).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent is not loaded', async () => {
      const mockVC = { id: 'vc-1', agent: undefined };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      await expect(
        service.getVirtualContributorAndAgent('vc-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getStorageBucket', () => {
    it('should return the storage bucket from the virtual contributor profile', async () => {
      const mockBucket = { id: 'bucket-1' };
      const mockVC = { id: 'vc-1', profile: { storageBucket: mockBucket } };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      const result = await service.getStorageBucket('vc-1');
      expect(result).toBe(mockBucket);
    });

    it('should throw RelationshipNotFoundException when storage bucket is not found', async () => {
      const mockVC = { id: 'vc-1', profile: { storageBucket: undefined } };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      await expect(service.getStorageBucket('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const mockVC = { id: 'vc-1', profile: undefined };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      await expect(service.getStorageBucket('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getAgent', () => {
    it('should return the agent when loaded on the virtual contributor', async () => {
      const mockAgent = { id: 'agent-1' };
      db.query.virtualContributors.findFirst.mockResolvedValue({ id: 'vc-1', agent: mockAgent });

      const result = await service.getAgent({ id: 'vc-1' } as any);
      expect(result).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent is not loaded', async () => {
      db.query.virtualContributors.findFirst.mockResolvedValue({ id: 'vc-1', agent: undefined });

      await expect(service.getAgent({ id: 'vc-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
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
      db.query.virtualContributors.findFirst.mockResolvedValue({
        id: 'vc-1',
        knowledgeBase: mockKB,
      });

      const vc = { id: 'vc-1', knowledgeBase: undefined } as any;
      const result = await service.getKnowledgeBaseOrFail(vc);

      expect(result).toBe(mockKB);
    });

    it('should throw EntityNotFoundException when knowledge base is not found', async () => {
      db.query.virtualContributors.findFirst.mockResolvedValue({
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
      virtualContributorLookupService.getAccountOrFail.mockResolvedValue(
        mockAccount
      );
      accountLookupService.getHostOrFail.mockResolvedValue(mockHost);

      const result = await service.getProvider({ id: 'vc-1' } as any);

      expect(
        virtualContributorLookupService.getAccountOrFail
      ).toHaveBeenCalledWith('vc-1');
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

      const vc = {
        id: 'vc-1',
        settings: { privacy: { knowledgeBaseContentVisible: false } },
      } as any;
      db.returning.mockResolvedValueOnce([{ ...vc, settings: updatedSettings }]);
      const result = await service.updateVirtualContributorSettings(vc, {
        privacy: { knowledgeBaseContentVisible: true },
      } as any);

      expect(
        virtualContributorSettingsService.updateSettings
      ).toHaveBeenCalled();

      expect(result.settings).toEqual(updatedSettings);
    });
  });

  describe('updateVirtualContributorPlatformSettings', () => {
    it('should delegate to platform settings service and save', async () => {
      const updatedPlatformSettings = { promptGraphEditingEnabled: true };
      virtualContributorPlatformSettingsService.updateSettings.mockReturnValue(
        updatedPlatformSettings
      );

      const vc = {
        id: 'vc-1',
        platformSettings: { promptGraphEditingEnabled: false },
      } as any;
      db.returning.mockResolvedValueOnce([{ ...vc, platformSettings: updatedPlatformSettings }]);
      const result = await service.updateVirtualContributorPlatformSettings(
        vc,
        {
          promptGraphEditingEnabled: true,
        } as any
      );

      expect(
        virtualContributorPlatformSettingsService.updateSettings
      ).toHaveBeenCalled();

      expect(result.platformSettings).toEqual(updatedPlatformSettings);
    });
  });

  describe('refreshBodyOfKnowledge', () => {
    it('should return false without calling AI server for NONE body of knowledge type', async () => {
      const vc = {
        id: 'vc-1',
        bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.NONE,
      } as any;
      const agentInfo = { userID: 'user-1' } as any;

      const result = await service.refreshBodyOfKnowledge(vc, agentInfo);

      expect(result).toBe(false);
      expect(aiServerAdapter.refreshBodyOfKnowledge).not.toHaveBeenCalled();
    });

    it('should return false without calling AI server for OTHER body of knowledge type', async () => {
      const vc = {
        id: 'vc-1',
        bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.OTHER,
      } as any;
      const agentInfo = { userID: 'user-1' } as any;

      const result = await service.refreshBodyOfKnowledge(vc, agentInfo);

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
      const agentInfo = { userID: 'user-1' } as any;

      const result = await service.refreshBodyOfKnowledge(vc, agentInfo);

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
      const agentInfo = { userID: 'user-1' } as any;

      await service.refreshBodyOfKnowledge(vc, agentInfo);

      expect(aiServerAdapter.refreshBodyOfKnowledge).toHaveBeenCalledWith(
        '',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_KNOWLEDGE_BASE,
        'persona-1'
      );
    });
  });

  describe('deleteVirtualContributor', () => {
    it('should delete profile, authorization, agent, AI persona, knowledge base, and invitations', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        agent: { id: 'agent-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: { id: 'auth-1' },
        aiPersonaID: 'persona-1',
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      agentService.deleteAgent.mockResolvedValue(undefined);
      aiPersonaService.deleteAiPersona.mockResolvedValue(undefined);
      knowledgeBaseService.delete.mockResolvedValue(undefined);
      db.query.virtualContributors.findMany.mockResolvedValue([]); // No invitations

      const result = await service.deleteVirtualContributor('vc-1');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockVC.authorization
      );
      expect(agentService.deleteAgent).toHaveBeenCalledWith('agent-1');
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
        agent: { id: 'agent-1' },
        knowledgeBase: { id: 'kb-1' },
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      await expect(service.deleteVirtualContributor('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when agent is missing', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        agent: undefined,
        knowledgeBase: { id: 'kb-1' },
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      await expect(service.deleteVirtualContributor('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when knowledge base is missing', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        agent: { id: 'agent-1' },
        knowledgeBase: undefined,
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);

      await expect(service.deleteVirtualContributor('vc-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should skip authorization deletion when authorization is not set', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        agent: { id: 'agent-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: undefined,
        aiPersonaID: undefined,
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      agentService.deleteAgent.mockResolvedValue(undefined);
      knowledgeBaseService.delete.mockResolvedValue(undefined);

      await service.deleteVirtualContributor('vc-1');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should handle AI persona deletion failure gracefully', async () => {
      const mockVC = {
        id: 'vc-1',
        profile: { id: 'profile-1' },
        agent: { id: 'agent-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: undefined,
        aiPersonaID: 'persona-1',
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      profileService.deleteProfile.mockResolvedValue(undefined);
      agentService.deleteAgent.mockResolvedValue(undefined);
      aiPersonaService.deleteAiPersona.mockRejectedValue(
        new Error('External service error')
      );
      knowledgeBaseService.delete.mockResolvedValue(undefined);

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
        agent: { id: 'agent-1' },
        knowledgeBase: { id: 'kb-1' },
        authorization: undefined,
        aiPersonaID: undefined,
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.query.invitations.findMany.mockResolvedValueOnce([mockInvitation]);
      profileService.deleteProfile.mockResolvedValue(undefined);
      agentService.deleteAgent.mockResolvedValue(undefined);
      knowledgeBaseService.delete.mockResolvedValue(undefined);

      authorizationPolicyService.delete.mockResolvedValue(undefined);

      await service.deleteVirtualContributor('vc-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockInvitation.authorization
      );
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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      profileService.updateProfile.mockResolvedValue(mockProfile);
      db.returning.mockResolvedValueOnce([mockVC]);

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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      // checkNameIdOrFail uses db.select().from().where() - mock where to return existing record
      db.where.mockResolvedValueOnce([{ count: 'existing-id' }]);

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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.returning.mockResolvedValueOnce([mockVC]);

      await service.updateVirtualContributor({
        ID: 'vc-1',
        nameID: 'same-name',
      } as any);
    });

    it('should update listedInStore when provided as a boolean', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        listedInStore: true,
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.returning.mockResolvedValueOnce([{ ...mockVC, listedInStore: false }]);

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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.returning.mockResolvedValueOnce([{ ...mockVC, searchVisibility: 'public' }]);

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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.returning.mockResolvedValueOnce([{ ...mockVC, knowledgeBase: { profile: { description: 'new description' } } }]);

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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.returning.mockResolvedValueOnce([{ ...mockVC, bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE }]);

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
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      const newModes = ['mode1', 'mode2'];
      db.returning.mockResolvedValueOnce([{ ...mockVC, interactionModes: newModes }]);

      const result = await service.updateVirtualContributor({
        ID: 'vc-1',
        interactionModes: newModes,
      } as any);

      expect(result.interactionModes).toEqual(newModes);
    });

    it('should update bodyOfKnowledgeDescription when provided as a string', async () => {
      const mockVC = {
        id: 'vc-1',
        nameID: 'test-vc',
        bodyOfKnowledgeDescription: 'old',
        profile: { id: 'profile-1', displayName: 'Test' },
        knowledgeBase: { profile: {} },
      };
      db.query.virtualContributors.findFirst.mockResolvedValue(mockVC);
      db.returning.mockResolvedValueOnce([{ ...mockVC, bodyOfKnowledgeDescription: 'new description' }]);

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
