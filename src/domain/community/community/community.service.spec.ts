import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { Community } from './community.entity';
import { ICommunity } from './community.interface';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let repository: {
    findOne: Mock;
    save: Mock;
    remove: Mock;
  };
  let roleSetService: {
    createRoleSet: Mock;
    removeRoleSetOrFail: Mock;
  };
  let communicationService: {
    createCommunication: Mock;
    removeCommunication: Mock;
  };
  let userGroupService: { removeUserGroup: Mock };
  let authorizationPolicyService: { delete: Mock };
  let communityResolverService: {
    getDisplayNameForRoleSetOrFail: Mock;
    getLevelZeroSpaceIdForCommunity: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        repositoryProviderMockFactory(Community),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunityService>(CommunityService);
    repository = module.get(getRepositoryToken(Community));
    roleSetService = module.get(RoleSetService) as any;
    communicationService = module.get(CommunicationService) as any;
    userGroupService = module.get(UserGroupService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    communityResolverService = module.get(CommunityResolverService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCommunityOrFail', () => {
    it('should return community when found', async () => {
      const community = { id: 'comm-1' } as ICommunity;
      repository.findOne.mockResolvedValue(community);
      const result = await service.getCommunityOrFail('comm-1');
      expect(result).toBe(community);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.getCommunityOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('createCommunity', () => {
    it('should create a community with roleSet and communication', async () => {
      const mockRoleSet = { id: 'rs-1' };
      const mockCommunication = { id: 'comms-1' };
      roleSetService.createRoleSet.mockResolvedValue(mockRoleSet);
      communicationService.createCommunication.mockResolvedValue(
        mockCommunication
      );

      const result = await service.createCommunity({
        name: 'Test Community',
        roleSetData: { roles: [], applicationForm: {} },
      } as any);

      expect(result.roleSet).toBe(mockRoleSet);
      expect(result.communication).toBe(mockCommunication);
      expect(result.groups).toEqual([]);
      expect(result.authorization).toBeDefined();
    });
  });

  describe('getUserGroups', () => {
    it('should return groups when loaded', async () => {
      const groups = [{ id: 'g1' }, { id: 'g2' }];
      const community = { id: 'comm-1', groups } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      const result = await service.getUserGroups(community);
      expect(result).toBe(groups);
    });

    it('should throw EntityNotInitializedException when groups not initialized', async () => {
      const community = {
        id: 'comm-1',
        groups: undefined,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      await expect(service.getUserGroups(community)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getUserGroup', () => {
    it('should return the matching group', async () => {
      const groups = [{ id: 'g1' }, { id: 'g2' }];
      const community = { id: 'comm-1', groups } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      const result = await service.getUserGroup(community, 'g2');
      expect(result).toBe(groups[1]);
    });

    it('should throw EntityNotInitializedException when groups not initialized', async () => {
      const community = {
        id: 'comm-1',
        groups: undefined,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      await expect(service.getUserGroup(community, 'g1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotFoundException when group not found', async () => {
      const community = {
        id: 'comm-1',
        groups: [{ id: 'g1' }],
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      await expect(
        service.getUserGroup(community, 'nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getRoleSet', () => {
    it('should return roleSet when found', async () => {
      const roleSet = { id: 'rs-1' };
      const community = {
        id: 'comm-1',
        roleSet,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      const result = await service.getRoleSet(community);
      expect(result).toBe(roleSet);
    });

    it('should throw EntityNotInitializedException when roleSet missing', async () => {
      const community = {
        id: 'comm-1',
        roleSet: undefined,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      await expect(service.getRoleSet(community)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getCommunication', () => {
    it('should return communication when found', async () => {
      const communication = { id: 'comms-1' };
      const community = {
        id: 'comm-1',
        communication,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      const result = await service.getCommunication('comm-1');
      expect(result).toBe(communication);
    });

    it('should throw EntityNotInitializedException when communication missing', async () => {
      const community = {
        id: 'comm-1',
        communication: undefined,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      await expect(service.getCommunication('comm-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('removeCommunityOrFail', () => {
    it('should throw RelationshipNotFoundException when child entities missing', async () => {
      const community = {
        id: 'comm-1',
        communication: null,
        roleSet: null,
        groups: null,
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);

      await expect(service.removeCommunityOrFail('comm-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should remove all child entities and return true', async () => {
      const community = {
        id: 'comm-1',
        communication: { id: 'comms-1', updates: { id: 'upd-1' } },
        roleSet: { id: 'rs-1' },
        groups: [{ id: 'g1' }],
        authorization: { id: 'auth-1' },
      } as unknown as ICommunity;
      repository.findOne.mockResolvedValue(community);
      roleSetService.removeRoleSetOrFail.mockResolvedValue(undefined);
      userGroupService.removeUserGroup.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      communicationService.removeCommunication.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue(undefined);

      const result = await service.removeCommunityOrFail('comm-1');
      expect(result).toBe(true);
      expect(roleSetService.removeRoleSetOrFail).toHaveBeenCalledWith('rs-1');
      expect(userGroupService.removeUserGroup).toHaveBeenCalledWith({
        ID: 'g1',
      });
      expect(authorizationPolicyService.delete).toHaveBeenCalled();
      expect(communicationService.removeCommunication).toHaveBeenCalledWith(
        'comms-1'
      );
    });
  });

  describe('save', () => {
    it('should delegate to repository save', async () => {
      const community = { id: 'comm-1' } as ICommunity;
      repository.save.mockResolvedValue(community);
      const result = await service.save(community);
      expect(result).toBe(community);
    });
  });

  describe('getDisplayName', () => {
    it('should delegate to communityResolverService', async () => {
      communityResolverService.getDisplayNameForRoleSetOrFail.mockResolvedValue(
        'Test Name'
      );
      const result = await service.getDisplayName({
        id: 'comm-1',
      } as ICommunity);
      expect(result).toBe('Test Name');
    });
  });

  describe('getLevelZeroSpaceIdForCommunity', () => {
    it('should delegate to communityResolverService', async () => {
      communityResolverService.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-1'
      );
      const result = await service.getLevelZeroSpaceIdForCommunity({
        id: 'comm-1',
      } as ICommunity);
      expect(result).toBe('space-1');
    });
  });
});
