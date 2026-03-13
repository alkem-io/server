import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import type { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { StorageAggregatorResolverService } from './storage.aggregator.resolver.service';

describe('StorageAggregatorResolverService', () => {
  let service: StorageAggregatorResolverService;
  let entityManager: {
    findOne: Mock;
    connection: { query: Mock };
  };
  let storageAggregatorRepository: MockType<Repository<StorageAggregator>>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    entityManager = {
      findOne: vi.fn(),
      connection: { query: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorResolverService,
        repositoryProviderMockFactory(StorageAggregator),
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

    service = module.get(StorageAggregatorResolverService);
    storageAggregatorRepository = module.get(
      `${StorageAggregator.name}Repository`
    ) as any;
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storage aggregator when found', async () => {
      const mockAggregator = { id: 'sa-1' };
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result = await service.getStorageAggregatorOrFail('sa-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw EntityNotFoundException when storageAggregatorID is empty', async () => {
      await expect(service.getStorageAggregatorOrFail('')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getParentAccountForStorageAggregator', () => {
    it('should return account when found for storage aggregator', async () => {
      const mockAccount = { id: 'account-1' };
      entityManager.findOne.mockResolvedValue(mockAccount);

      const result = await service.getParentAccountForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockAccount);
    });

    it('should throw EntityNotFoundException when no account found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getParentAccountForStorageAggregator({ id: 'sa-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getParentSpaceForStorageAggregator', () => {
    it('should return space when found for storage aggregator', async () => {
      const mockSpace = { id: 'space-1', about: { profile: {} } };
      entityManager.findOne.mockResolvedValue(mockSpace);

      const result = await service.getParentSpaceForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when no space found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getParentSpaceForStorageAggregator({ id: 'sa-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorForTemplatesManager', () => {
    it('should throw InvalidUUID when templatesManagerId is not a valid UUID', async () => {
      await expect(
        service.getStorageAggregatorForTemplatesManager('not-a-uuid')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should return storage aggregator via space when space has storageAggregator', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-1' };
      // First call: Space found with storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-1' },
      });
      // getStorageAggregatorOrFail call
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForTemplatesManager(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via platform when space is not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-2' };
      // First call: Space not found
      entityManager.findOne.mockResolvedValueOnce(null);
      // Second call: Platform found with storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-2' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForTemplatesManager(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw NotImplementedException when neither space nor platform found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForTemplatesManager(validUuid)
      ).rejects.toThrow(NotImplementedException);
    });
  });

  describe('getStorageAggregatorForCalloutsSet', () => {
    it('should throw InvalidUUID when calloutsSetID is not valid', async () => {
      await expect(
        service.getStorageAggregatorForCalloutsSet('bad-id')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should return storage aggregator via space when space has storageAggregator', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-1' };
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-1' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForCalloutsSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via virtual contributor when space is not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-vc' };
      // Space not found
      entityManager.findOne.mockResolvedValueOnce(null);
      // VC found with account.storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        account: { storageAggregator: { id: 'sa-vc' } },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForCalloutsSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw EntityNotFoundException when neither space nor virtual contributor found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForCalloutsSet(validUuid)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorForTemplatesSet', () => {
    it('should throw InvalidUUID when templatesSetId is not valid', async () => {
      await expect(
        service.getStorageAggregatorForTemplatesSet('bad-id')
      ).rejects.toThrow(InvalidUUID);
    });

    it('should return storage aggregator via templatesManager on a space', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const tmUuid = '660e8400-e29b-41d4-a716-446655440001';
      const mockAggregator = { id: 'sa-tm' };
      // Find TemplatesManager
      entityManager.findOne.mockResolvedValueOnce({ id: tmUuid });
      // getStorageAggregatorForTemplatesManager: Space found
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-tm' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForTemplatesSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should return storage aggregator via innovationPack when no templatesManager', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockAggregator = { id: 'sa-ip' };
      // No TemplatesManager found
      entityManager.findOne.mockResolvedValueOnce(null);
      // InnovationPack found with account.storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        account: { storageAggregator: { id: 'sa-ip' } },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForTemplatesSet(validUuid);

      expect(result).toBe(mockAggregator);
    });

    it('should throw EntityNotFoundException when neither templatesManager nor innovationPack found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForTemplatesSet(validUuid)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getParentOrganizationForStorageAggregator', () => {
    it('should return organization when found', async () => {
      const mockOrg = { id: 'org-1', profile: {} };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getParentOrganizationForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockOrg);
    });

    it('should throw EntityNotFoundException when no organization found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getParentOrganizationForStorageAggregator({
          id: 'sa-1',
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getParentUserForStorageAggregator', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', profile: {} };
      entityManager.findOne.mockResolvedValue(mockUser);

      const result = await service.getParentUserForStorageAggregator({
        id: 'sa-1',
      } as any);

      expect(result).toBe(mockUser);
    });

    it('should throw EntityNotFoundException when no user found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getParentUserForStorageAggregator({ id: 'sa-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getPlatformStorageAggregator', () => {
    it('should return storage aggregator from platform query', async () => {
      const mockAggregator = { id: 'sa-platform' };
      entityManager.connection.query.mockResolvedValue([
        { storageAggregatorId: 'sa-platform' },
      ]);
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result = await service.getPlatformStorageAggregator();

      expect(result).toBe(mockAggregator);
    });
  });

  describe('getStorageAggregatorForCollaboration', () => {
    it('should return storage aggregator via space collaboration', async () => {
      const mockAggregator = { id: 'sa-collab' };
      // Space found with storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-collab' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForCollaboration('collab-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw when space found but has no storageAggregator', async () => {
      // Space found but without storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: null,
      });

      await expect(
        service.getStorageAggregatorForCollaboration('collab-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return storage aggregator via template when no space found', async () => {
      const validTemplatesSetId = '550e8400-e29b-41d4-a716-446655440000';
      const tmUuid = '660e8400-e29b-41d4-a716-446655440001';
      const mockAggregator = { id: 'sa-template' };
      // No space found
      entityManager.findOne.mockResolvedValueOnce(null);
      // Template found with templatesSet
      entityManager.findOne.mockResolvedValueOnce({
        templatesSet: { id: validTemplatesSetId },
      });
      // getStorageAggregatorForTemplatesSet -> find TemplatesManager
      entityManager.findOne.mockResolvedValueOnce({ id: tmUuid });
      // getStorageAggregatorForTemplatesManager -> Space found
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-template' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result =
        await service.getStorageAggregatorForCollaboration('collab-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw when neither space nor template found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForCollaboration('collab-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorForCommunity', () => {
    it('should return storage aggregator via space community', async () => {
      const mockAggregator = { id: 'sa-comm' };
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-comm' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result = await service.getStorageAggregatorForCommunity('comm-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw when no space found for community', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForCommunity('comm-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorForForum', () => {
    it('should delegate to getPlatformStorageAggregator', async () => {
      const mockAggregator = { id: 'sa-platform' };
      entityManager.connection.query.mockResolvedValue([
        { storageAggregatorId: 'sa-platform' },
      ]);
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result = await service.getStorageAggregatorForForum();

      expect(result).toBe(mockAggregator);
    });
  });

  describe('getStorageAggregatorForCallout', () => {
    it('should throw when callout not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getStorageAggregatorForCallout('callout-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return storage aggregator via space when callout is in a collaboration on a space', async () => {
      const mockAggregator = { id: 'sa-space' };
      // findOne Callout with calloutsSet
      entityManager.findOne.mockResolvedValueOnce({
        id: 'callout-1',
        calloutsSet: { id: 'cs-1' },
      });
      // findOne Collaboration
      entityManager.findOne.mockResolvedValueOnce({ id: 'collab-1' });
      // findOne Space for collaboration
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: { id: 'sa-space' },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result = await service.getStorageAggregatorForCallout('callout-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw when callout is on a space but space has no storageAggregator', async () => {
      // findOne Callout with calloutsSet
      entityManager.findOne.mockResolvedValueOnce({
        id: 'callout-1',
        calloutsSet: { id: 'cs-1' },
      });
      // findOne Collaboration
      entityManager.findOne.mockResolvedValueOnce({ id: 'collab-1' });
      // findOne Space for collaboration but no storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        storageAggregator: null,
      });

      await expect(
        service.getStorageAggregatorForCallout('callout-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return storage aggregator via knowledge base when callout is not in a collaboration', async () => {
      const mockAggregator = { id: 'sa-kb' };
      // findOne Callout with calloutsSet
      entityManager.findOne.mockResolvedValueOnce({
        id: 'callout-1',
        calloutsSet: { id: 'cs-1' },
      });
      // findOne Collaboration: not found
      entityManager.findOne.mockResolvedValueOnce(null);
      // findOne KnowledgeBase with VC account storageAggregator
      entityManager.findOne.mockResolvedValueOnce({
        virtualContributor: {
          account: {
            storageAggregator: { id: 'sa-kb' },
          },
        },
      });
      vi.spyOn(storageAggregatorRepository, 'findOneOrFail').mockResolvedValue(
        mockAggregator
      );

      const result = await service.getStorageAggregatorForCallout('callout-1');

      expect(result).toBe(mockAggregator);
    });

    it('should throw when callout has no calloutsSet and no callout template found', async () => {
      // findOne Callout without calloutsSet
      entityManager.findOne.mockResolvedValueOnce({
        id: 'callout-1',
        calloutsSet: null,
      });
      // findOne TemplatesSet for callout template: not found
      entityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.getStorageAggregatorForCallout('callout-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
