import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { VirtualActorLookupService } from './virtual.contributor.lookup.service';

describe('VirtualActorLookupService', () => {
  let service: VirtualActorLookupService;
  let entityManager: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };
  let actorLookupService: {
    getActorAuthorizationOrFail: Mock;
    getActorIDsWithCredential: Mock;
  };
  let virtualContributorRepository: { createQueryBuilder: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    entityManager = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualActorLookupService,
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

    service = module.get(VirtualActorLookupService);
    actorLookupService = module.get(ActorLookupService) as any;
    virtualContributorRepository = module.get(
      getRepositoryToken(VirtualContributor)
    ) as any;
  });

  describe('getPaginatedAvailableEntryRoleVCs (promoted first)', () => {
    const fakeQueryBuilder = () => {
      const qb: any = {
        alias: 'virtual_contributor',
        expressionMap: { orderBys: {}, wheres: [] as unknown[] },
      };
      for (const method of [
        'leftJoinAndSelect',
        'leftJoin',
        'addSelect',
        'select',
        'setParameters',
        'orderBy',
        'addOrderBy',
        'take',
        'clone',
      ]) {
        qb[method] = vi.fn(() => qb);
      }
      for (const method of ['where', 'andWhere']) {
        qb[method] = vi.fn((condition: unknown) => {
          qb.expressionMap.wheres.push(condition);
          return qb;
        });
      }
      qb.getCount = vi.fn().mockResolvedValue(0);
      qb.getMany = vi.fn().mockResolvedValue([]);
      return qb;
    };

    it('orders promoted VCs first, then by rowId ascending, and still excludes current members', async () => {
      const qb = fakeQueryBuilder();
      virtualContributorRepository.createQueryBuilder = vi.fn(() => qb);
      actorLookupService.getActorIDsWithCredential.mockResolvedValue([
        'member-vc',
      ]);

      await service.getPaginatedAvailableEntryRoleVCs(
        { role: { type: 'space-member', resourceID: 'rs-1' } } as any,
        { first: 5 } as any
      );

      expect(qb.orderBy).toHaveBeenCalledWith(
        'virtual_contributor.promote',
        'DESC'
      );
      expect(qb.addOrderBy).toHaveBeenCalledWith(
        'virtual_contributor.rowId',
        'ASC'
      );
      expect(qb.where).toHaveBeenCalledWith(
        'NOT virtual_contributor.id IN (:...memberVirtualContributors)'
      );
    });
  });

  describe('getVirtualContributorOrFail', () => {
    it('should throw EntityNotFoundException when the ID is not a valid UUID', async () => {
      await expect(
        service.getVirtualContributorByIdOrFail('not-a-uuid')
      ).rejects.toThrow(EntityNotFoundException);

      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('should return the virtual contributor when found by valid UUID', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, nameID: 'test-vc' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorByIdOrFail(validId);
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when no virtual contributor is found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByIdOrFail(validId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorAndActor', () => {
    it('should return virtual contributor and actorID when VC is found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockCredentials = [{ id: 'cred-1' }];
      const mockVC = { id: validId, credentials: mockCredentials };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorAndActor(validId);
      expect(result.virtualContributor).toBe(mockVC);
      expect(result.actorID).toBe(validId);
      expect(result.credentials).toBe(mockCredentials);
    });

    it('should throw EntityNotFoundException when VC is not found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorAndActor(validId)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorById', () => {
    it('should return the virtual contributor when found by ID', async () => {
      const mockVC = { id: 'vc-1' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorById(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result).toBe(mockVC);
    });

    it('should return null when no virtual contributor matches the ID', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getVirtualContributorById(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
      );
      expect(result).toBeNull();
    });
  });

  describe('getVirtualContributorByIdOrFail', () => {
    it('should return the virtual contributor when found', async () => {
      const mockVC = { id: 'vc-1' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getVirtualContributorByIdOrFail(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when no virtual contributor matches', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByIdOrFail(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getVirtualContributorByNameIdOrFail', () => {
    it('should return the virtual contributor when found by nameID', async () => {
      const mockVC = { id: 'vc-1', nameID: 'test-vc' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result =
        await service.getVirtualContributorByNameIdOrFail('test-vc');
      expect(result).toBe(mockVC);
    });

    it('should throw EntityNotFoundException when nameID does not match', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('virtualContributorsWithCredentials', () => {
    it('should default resourceID to empty string when not provided', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.virtualContributorsWithCredentials({
        type: 'space-admin' as any,
      });

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            credentials: {
              type: 'space-admin',
              resourceID: '',
            },
          },
        })
      );
    });

    it('should pass the limit to the query', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.virtualContributorsWithCredentials(
        { type: 'vc-member' as any, resourceID: 'res-1' },
        5
      );

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('getAccountOrFail', () => {
    it('should return the account when it is loaded on the virtual contributor', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockAccount = { id: 'account-1' };
      const mockVC = { id: validId, account: mockAccount };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getAccountOrFail(validId);
      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotInitializedException when account is not loaded', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, account: undefined };
      entityManager.findOne.mockResolvedValue(mockVC);

      await expect(service.getAccountOrFail(validId)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getVirtualContributorAccountIdOrFail', () => {
    it('should return the account ID when VC and account exist', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, account: { id: 'account-1' } };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result =
        await service.getVirtualContributorAccountIdOrFail(validId);
      expect(result).toBe('account-1');
    });

    it('should throw EntityNotFoundException when VC is not found', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getVirtualContributorAccountIdOrFail(validId)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotInitializedException when account is not initialized', async () => {
      const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockVC = { id: validId, account: undefined };
      entityManager.findOne.mockResolvedValue(mockVC);

      await expect(
        service.getVirtualContributorAccountIdOrFail(validId)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should return null from getVirtualContributorById for non-UUID', async () => {
      const result = await service.getVirtualContributorById('not-a-uuid');
      expect(result).toBeNull();
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getVirtualContributorAuthorizationOrFail', () => {
    it('should delegate to actorLookupService.getActorAuthorizationOrFail', async () => {
      const mockAuth = { id: 'auth-1', credentialRules: '[]' };
      actorLookupService.getActorAuthorizationOrFail.mockResolvedValue(
        mockAuth
      );

      const result =
        await service.getVirtualContributorAuthorizationOrFail('vc-1');
      expect(
        actorLookupService.getActorAuthorizationOrFail
      ).toHaveBeenCalledWith('vc-1');
      expect(result).toBe(mockAuth);
    });
  });
});
