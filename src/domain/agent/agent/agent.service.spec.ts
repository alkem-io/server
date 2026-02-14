import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Agent } from '@domain/agent/agent/agent.entity';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Credential } from '@domain/agent/credential/credential.entity';
import { CredentialService } from '@domain/agent/credential/credential.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AgentInfoCacheService } from '@src/core/authentication.agent.info/agent.info.cache.service';
import { type Mock, vi } from 'vitest';

describe('AgentService', () => {
  let service: AgentService;
  let agentRepository: Record<string, Mock>;
  let credentialService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;
  let agentInfoCacheService: Record<string, Mock>;
  let cacheManager: Record<string, Mock>;

  beforeEach(async () => {
    // Mock the static BaseEntity.create method to avoid DataSource requirement
    vi.spyOn(Agent, 'create').mockImplementation((input: any) => {
      const agent = new Agent();
      Object.assign(agent, input);
      return agent as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        repositoryProviderMockFactory(Agent),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockReturnValue(300),
          };
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AgentService);
    agentRepository = module.get(getRepositoryToken(Agent));
    credentialService = module.get(CredentialService) as unknown as Record<string, Mock>;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as unknown as Record<string, Mock>;
    agentInfoCacheService = module.get(AgentInfoCacheService) as unknown as Record<string, Mock>;
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('createAgent', () => {
    it('should create an agent with empty credentials array and authorization policy', async () => {
      const inputData = { type: AgentType.USER };

      const result = await service.createAgent(inputData);

      expect(result.credentials).toEqual([]);
      expect(result.type).toEqual(AgentType.USER);
      expect(result.authorization).toBeDefined();
      expect(result.authorization!.type).toEqual(AuthorizationPolicyType.AGENT);
    });

    it('should create an agent with ORGANIZATION type', async () => {
      const inputData = { type: AgentType.ORGANIZATION };

      const result = await service.createAgent(inputData);

      expect(result.type).toEqual(AgentType.ORGANIZATION);
      expect(result.credentials).toEqual([]);
    });

    it('should create an agent with SPACE type', async () => {
      const inputData = { type: AgentType.SPACE };

      const result = await service.createAgent(inputData);

      expect(result.type).toEqual(AgentType.SPACE);
    });

    it('should always initialize credentials as an empty array', async () => {
      const inputData = { type: AgentType.VIRTUAL_CONTRIBUTOR };

      const result = await service.createAgent(inputData);

      expect(Array.isArray(result.credentials)).toBe(true);
      expect(result.credentials).toHaveLength(0);
    });
  });

  describe('getAgentOrFail', () => {
    it('should return the agent when it exists', async () => {
      const agentId = 'agent-uuid-1';
      const existingAgent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [],
      };

      agentRepository.findOne.mockResolvedValue(existingAgent);

      const result = await service.getAgentOrFail(agentId);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: agentId },
      });
      expect(result).toEqual(existingAgent);
    });

    it('should pass additional FindOneOptions to the repository', async () => {
      const agentId = 'agent-uuid-1';
      const existingAgent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [],
      };
      const options = { relations: { credentials: true } };

      agentRepository.findOne.mockResolvedValue(existingAgent);

      await service.getAgentOrFail(agentId, options);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: agentId },
        relations: { credentials: true },
      });
    });

    it('should throw EntityNotFoundException when agent does not exist', async () => {
      const agentId = 'nonexistent-uuid';
      agentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getAgentOrFail(agentId)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should include the agent ID in the exception message when not found', async () => {
      const agentId = 'missing-agent-uuid';
      agentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getAgentOrFail(agentId)
      ).rejects.toThrow(agentId);
    });
  });

  describe('deleteAgent', () => {
    it('should delete all credentials and authorization before removing the agent', async () => {
      const agentId = 'agent-uuid-1';
      const authorization = { id: 'auth-policy-1' };
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: '' },
        { id: 'cred-2', type: 'global-registered', resourceID: '' },
      ];
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials,
        authorization,
      };

      agentRepository.findOne.mockResolvedValue(agent);
      credentialService.deleteCredential.mockResolvedValue({});
      authorizationPolicyService.delete.mockResolvedValue({});
      agentRepository.remove.mockResolvedValue(agent);

      const result = await service.deleteAgent(agentId);

      expect(credentialService.deleteCredential).toHaveBeenCalledTimes(2);
      expect(credentialService.deleteCredential).toHaveBeenCalledWith('cred-1');
      expect(credentialService.deleteCredential).toHaveBeenCalledWith('cred-2');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(authorization);
      expect(agentRepository.remove).toHaveBeenCalledWith(agent);
      expect(result).toEqual(agent);
    });

    it('should handle agent with no credentials', async () => {
      const agentId = 'agent-uuid-2';
      const authorization = { id: 'auth-policy-2' };
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: undefined,
        authorization,
      };

      agentRepository.findOne.mockResolvedValue(agent);
      authorizationPolicyService.delete.mockResolvedValue({});
      agentRepository.remove.mockResolvedValue(agent);

      await service.deleteAgent(agentId);

      expect(credentialService.deleteCredential).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(authorization);
      expect(agentRepository.remove).toHaveBeenCalled();
    });

    it('should handle agent with no authorization policy', async () => {
      const agentId = 'agent-uuid-3';
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [],
        authorization: undefined,
      };

      agentRepository.findOne.mockResolvedValue(agent);
      agentRepository.remove.mockResolvedValue(agent);

      await service.deleteAgent(agentId);

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(agentRepository.remove).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when agent to delete does not exist', async () => {
      const agentId = 'nonexistent-uuid';
      agentRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteAgent(agentId)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('saveAgent', () => {
    it('should persist the agent via repository save', async () => {
      const agent = {
        id: 'agent-uuid-1',
        type: AgentType.USER,
        credentials: [],
      };
      const savedAgent = { ...agent };
      agentRepository.save.mockResolvedValue(savedAgent);

      const result = await service.saveAgent(agent);

      expect(agentRepository.save).toHaveBeenCalledWith(agent);
      expect(result).toEqual(savedAgent);
    });
  });

  describe('getAgentCredentials', () => {
    it('should return agent and credentials from cache when available', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: '' },
      ];
      const cachedAgent = {
        id: agentId,
        type: AgentType.USER,
        credentials,
      };

      cacheManager.get.mockResolvedValue(cachedAgent);

      const result = await service.getAgentCredentials(agentId);

      expect(cacheManager.get).toHaveBeenCalledWith(`@agent:id:${agentId}`);
      expect(result.agent).toEqual(cachedAgent);
      expect(result.credentials).toEqual(credentials);
      // Should not hit the repository when cache has the data
      expect(agentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache when not in cache', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: '' },
      ];
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials,
      };

      cacheManager.get.mockResolvedValue(undefined);
      agentRepository.findOne.mockResolvedValue(agent);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.getAgentCredentials(agentId);

      expect(agentRepository.findOne).toHaveBeenCalledWith({
        where: { id: agentId },
        relations: { credentials: true },
      });
      expect(cacheManager.set).toHaveBeenCalled();
      expect(result.agent).toEqual(agent);
      expect(result.credentials).toEqual(credentials);
    });

    it('should fetch from repository when cache returns agent without credentials', async () => {
      const agentId = 'agent-uuid-1';
      const cachedAgentNoCredentials = {
        id: agentId,
        type: AgentType.USER,
        credentials: undefined,
      };
      const agentWithCredentials = {
        id: agentId,
        type: AgentType.USER,
        credentials: [{ id: 'cred-1', type: 'global-admin', resourceID: '' }],
      };

      cacheManager.get.mockResolvedValue(cachedAgentNoCredentials);
      agentRepository.findOne.mockResolvedValue(agentWithCredentials);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.getAgentCredentials(agentId);

      expect(agentRepository.findOne).toHaveBeenCalled();
      expect(result.credentials).toHaveLength(1);
    });

    it('should throw EntityNotInitializedException when credentials are still null after fetch', async () => {
      const agentId = 'agent-uuid-1';
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: undefined,
      };

      cacheManager.get.mockResolvedValue(undefined);
      agentRepository.findOne.mockResolvedValue(agent);
      cacheManager.set.mockResolvedValue(undefined);

      await expect(
        service.getAgentCredentials(agentId)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotFoundException when agent does not exist in repository', async () => {
      const agentId = 'nonexistent-uuid';

      cacheManager.get.mockResolvedValue(undefined);
      agentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getAgentCredentials(agentId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('grantCredentialOrFail', () => {
    it('should grant a new credential to an agent', async () => {
      const agentId = 'agent-uuid-1';
      const credentials: any[] = [];
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials,
      };

      const newCredential = {
        id: 'new-cred-1',
        type: 'global-admin',
        resourceID: 'resource-1',
      };

      const agentAfterGrant = {
        ...agent,
        credentials: [newCredential],
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.createCredential.mockResolvedValue(newCredential);
      credentialService.save.mockResolvedValue(newCredential);
      agentRepository.findOne.mockResolvedValue(agentAfterGrant);
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.grantCredentialOrFail({
        agentID: agentId,
        type: 'global-admin',
        resourceID: 'resource-1',
      });

      expect(credentialService.createCredential).toHaveBeenCalledWith({
        agentID: agentId,
        type: 'global-admin',
        resourceID: 'resource-1',
      });
      expect(credentialService.save).toHaveBeenCalled();
      expect(agentInfoCacheService.updateAgentInfoCache).toHaveBeenCalled();
      expect(result).toEqual(agentAfterGrant);
    });

    it('should throw ValidationException when agent already has the same credential type and resourceID', async () => {
      const agentId = 'agent-uuid-1';
      const existingCredentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' },
      ];
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: existingCredentials,
      };

      cacheManager.get.mockResolvedValue(agent);

      await expect(
        service.grantCredentialOrFail({
          agentID: agentId,
          type: 'global-admin',
          resourceID: 'resource-1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should allow granting a credential of the same type but different resourceID', async () => {
      const agentId = 'agent-uuid-1';
      const existingCredentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' },
      ];
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: existingCredentials,
      };
      const newCredential = {
        id: 'new-cred-2',
        type: 'global-admin',
        resourceID: 'resource-2',
      };
      const agentAfterGrant = {
        ...agent,
        credentials: [...existingCredentials, newCredential],
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.createCredential.mockResolvedValue(newCredential);
      credentialService.save.mockResolvedValue(newCredential);
      agentRepository.findOne.mockResolvedValue(agentAfterGrant);
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.grantCredentialOrFail({
        agentID: agentId,
        type: 'global-admin',
        resourceID: 'resource-2',
      });

      expect(credentialService.createCredential).toHaveBeenCalled();
      expect(result.credentials).toHaveLength(2);
    });

    it('should allow granting a credential of a different type with the same resourceID', async () => {
      const agentId = 'agent-uuid-1';
      const existingCredentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' },
      ];
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: existingCredentials,
      };
      const newCredential = {
        id: 'new-cred-3',
        type: 'global-registered',
        resourceID: 'resource-1',
      };
      const agentAfterGrant = {
        ...agent,
        credentials: [...existingCredentials, newCredential],
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.createCredential.mockResolvedValue(newCredential);
      credentialService.save.mockResolvedValue(newCredential);
      agentRepository.findOne.mockResolvedValue(agentAfterGrant);
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.grantCredentialOrFail({
        agentID: agentId,
        type: 'global-registered',
        resourceID: 'resource-1',
      });

      expect(credentialService.createCredential).toHaveBeenCalled();
      expect(result).toEqual(agentAfterGrant);
    });

    it('should default resourceID to empty string when not provided', async () => {
      const agentId = 'agent-uuid-1';
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [],
      };
      const newCredential = {
        id: 'new-cred-4',
        type: 'global-registered',
        resourceID: '',
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.createCredential.mockResolvedValue(newCredential);
      credentialService.save.mockResolvedValue(newCredential);
      agentRepository.findOne.mockResolvedValue({ ...agent, credentials: [newCredential] });
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);

      await service.grantCredentialOrFail({
        agentID: agentId,
        type: 'global-registered',
        resourceID: undefined,
      } as any);

      expect(credentialService.createCredential).toHaveBeenCalled();
    });

    it('should update agent info cache after granting credential', async () => {
      const agentId = 'agent-uuid-1';
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [],
      };
      const newCredential = {
        id: 'new-cred-5',
        type: 'global-admin',
        resourceID: '',
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.createCredential.mockResolvedValue(newCredential);
      credentialService.save.mockResolvedValue(newCredential);
      agentRepository.findOne.mockResolvedValue({ ...agent, credentials: [newCredential] });
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);

      await service.grantCredentialOrFail({
        agentID: agentId,
        type: 'global-admin',
        resourceID: '',
      });

      expect(agentInfoCacheService.updateAgentInfoCache).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('revokeCredential', () => {
    it('should remove the matching credential and update caches', async () => {
      const agentId = 'agent-uuid-1';
      const credToRevoke = { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' };
      const credToKeep = { id: 'cred-2', type: 'global-registered', resourceID: '' };
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [credToRevoke, credToKeep],
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.deleteCredential.mockResolvedValue(credToRevoke);
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);
      agentRepository.save.mockResolvedValue({ ...agent, credentials: [credToKeep] });

      const result = await service.revokeCredential({
        agentID: agentId,
        type: 'global-admin',
        resourceID: 'resource-1',
      });

      expect(credentialService.deleteCredential).toHaveBeenCalledWith('cred-1');
      expect(agentInfoCacheService.updateAgentInfoCache).toHaveBeenCalled();
      expect(agentRepository.save).toHaveBeenCalled();
    });

    it('should not delete any credential when no match is found', async () => {
      const agentId = 'agent-uuid-1';
      const cred = { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' };
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [cred],
      };

      cacheManager.get.mockResolvedValue(agent);
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);
      agentRepository.save.mockResolvedValue(agent);

      await service.revokeCredential({
        agentID: agentId,
        type: 'global-registered',
        resourceID: 'resource-1',
      });

      expect(credentialService.deleteCredential).not.toHaveBeenCalled();
    });

    it('should default resourceID to empty string when not provided', async () => {
      const agentId = 'agent-uuid-1';
      const cred = { id: 'cred-1', type: 'global-admin', resourceID: '' };
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [cred],
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.deleteCredential.mockResolvedValue(cred);
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);
      agentRepository.save.mockResolvedValue({ ...agent, credentials: [] });

      await service.revokeCredential({
        agentID: agentId,
        type: 'global-admin',
        resourceID: undefined,
      } as any);

      expect(credentialService.deleteCredential).toHaveBeenCalledWith('cred-1');
    });

    it('should remove multiple matching credentials of the same type and resourceID', async () => {
      const agentId = 'agent-uuid-1';
      const cred1 = { id: 'cred-1', type: 'global-admin', resourceID: '' };
      const cred2 = { id: 'cred-2', type: 'global-admin', resourceID: '' };
      const otherCred = { id: 'cred-3', type: 'global-registered', resourceID: '' };
      const agent = {
        id: agentId,
        type: AgentType.USER,
        credentials: [cred1, cred2, otherCred],
      };

      cacheManager.get.mockResolvedValue(agent);
      credentialService.deleteCredential.mockResolvedValue({});
      agentInfoCacheService.updateAgentInfoCache.mockResolvedValue(undefined);
      cacheManager.set.mockResolvedValue(undefined);
      agentRepository.save.mockResolvedValue({ ...agent, credentials: [otherCred] });

      await service.revokeCredential({
        agentID: agentId,
        type: 'global-admin',
        resourceID: '',
      });

      expect(credentialService.deleteCredential).toHaveBeenCalledTimes(2);
      expect(credentialService.deleteCredential).toHaveBeenCalledWith('cred-1');
      expect(credentialService.deleteCredential).toHaveBeenCalledWith('cred-2');
    });
  });

  describe('hasValidCredential', () => {
    it('should return true when agent has a credential matching type and resourceID', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' },
      ];
      const agent = { id: agentId, type: AgentType.USER, credentials };

      cacheManager.get.mockResolvedValue(agent);

      const result = await service.hasValidCredential(agentId, {
        type: 'global-admin',
        resourceID: 'resource-1',
      });

      expect(result).toBe(true);
    });

    it('should return true when matching type only and no resourceID criteria given', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' },
      ];
      const agent = { id: agentId, type: AgentType.USER, credentials };

      cacheManager.get.mockResolvedValue(agent);

      const result = await service.hasValidCredential(agentId, {
        type: 'global-admin',
      });

      expect(result).toBe(true);
    });

    it('should return false when type matches but resourceID does not', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: 'resource-1' },
      ];
      const agent = { id: agentId, type: AgentType.USER, credentials };

      cacheManager.get.mockResolvedValue(agent);

      const result = await service.hasValidCredential(agentId, {
        type: 'global-admin',
        resourceID: 'resource-999',
      });

      expect(result).toBe(false);
    });

    it('should return false when agent has no matching credential type', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-registered', resourceID: '' },
      ];
      const agent = { id: agentId, type: AgentType.USER, credentials };

      cacheManager.get.mockResolvedValue(agent);

      const result = await service.hasValidCredential(agentId, {
        type: 'global-admin',
      });

      expect(result).toBe(false);
    });

    it('should return false when agent has an empty credentials array', async () => {
      const agentId = 'agent-uuid-1';
      const agent = { id: agentId, type: AgentType.USER, credentials: [] };

      cacheManager.get.mockResolvedValue(agent);

      const result = await service.hasValidCredential(agentId, {
        type: 'global-admin',
      });

      expect(result).toBe(false);
    });

    it('should check multiple credentials and return true on first match', async () => {
      const agentId = 'agent-uuid-1';
      const credentials = [
        { id: 'cred-1', type: 'global-registered', resourceID: '' },
        { id: 'cred-2', type: 'global-admin', resourceID: 'resource-1' },
        { id: 'cred-3', type: 'global-admin', resourceID: 'resource-2' },
      ];
      const agent = { id: agentId, type: AgentType.USER, credentials };

      cacheManager.get.mockResolvedValue(agent);

      const result = await service.hasValidCredential(agentId, {
        type: 'global-admin',
        resourceID: 'resource-2',
      });

      expect(result).toBe(true);
    });
  });

  describe('findAgentsWithMatchingCredentials', () => {
    it('should return agents that have matching credentials', async () => {
      const agent1 = { id: 'agent-1', type: AgentType.USER };
      const agent2 = { id: 'agent-2', type: AgentType.ORGANIZATION };
      const matchingCredentials = [
        { id: 'cred-1', type: 'global-admin', agent: agent1 },
        { id: 'cred-2', type: 'global-admin', agent: agent2 },
      ];

      credentialService.findMatchingCredentials.mockResolvedValue(matchingCredentials);

      const result = await service.findAgentsWithMatchingCredentials({
        type: 'global-admin',
      });

      expect(credentialService.findMatchingCredentials).toHaveBeenCalledWith({
        type: 'global-admin',
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(agent1);
      expect(result[1]).toEqual(agent2);
    });

    it('should exclude credentials that have no associated agent', async () => {
      const agent1 = { id: 'agent-1', type: AgentType.USER };
      const matchingCredentials = [
        { id: 'cred-1', type: 'global-admin', agent: agent1 },
        { id: 'cred-2', type: 'global-admin', agent: undefined },
      ];

      credentialService.findMatchingCredentials.mockResolvedValue(matchingCredentials);

      const result = await service.findAgentsWithMatchingCredentials({
        type: 'global-admin',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(agent1);
    });

    it('should return an empty array when no credentials match', async () => {
      credentialService.findMatchingCredentials.mockResolvedValue([]);

      const result = await service.findAgentsWithMatchingCredentials({
        type: 'nonexistent-type',
      });

      expect(result).toEqual([]);
    });
  });

  describe('countAgentsWithMatchingCredentials', () => {
    it('should delegate counting to credentialService', async () => {
      credentialService.countMatchingCredentials.mockResolvedValue(5);

      const result = await service.countAgentsWithMatchingCredentials({
        type: 'global-admin',
      });

      expect(credentialService.countMatchingCredentials).toHaveBeenCalledWith({
        type: 'global-admin',
      });
      expect(result).toEqual(5);
    });

    it('should return zero when no matching credentials exist', async () => {
      credentialService.countMatchingCredentials.mockResolvedValue(0);

      const result = await service.countAgentsWithMatchingCredentials({
        type: 'nonexistent-type',
      });

      expect(result).toEqual(0);
    });
  });
});
