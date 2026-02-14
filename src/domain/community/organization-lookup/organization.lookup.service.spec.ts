import { EntityNotFoundException, EntityNotInitializedException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { OrganizationLookupService } from './organization.lookup.service';

describe('OrganizationLookupService', () => {
  let service: OrganizationLookupService;
  let entityManager: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationLookupService,
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

    service = module.get(OrganizationLookupService);
  });

  describe('getOrganizationByUUID', () => {
    it('should return the organization when found by ID', async () => {
      const mockOrg = { id: 'org-1', nameID: 'my-org' };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganizationByUUID('org-1');
      expect(result).toBe(mockOrg);
    });

    it('should return null when no organization matches the ID', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getOrganizationByUUID('nonexistent');
      expect(result).toBeNull();
    });

    it('should merge provided options with the ID where clause', async () => {
      entityManager.findOne.mockResolvedValue({ id: 'org-1' });

      await service.getOrganizationByUUID('org-1', {
        relations: { agent: true },
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          relations: { agent: true },
          where: { id: 'org-1' },
        })
      );
    });
  });

  describe('getOrganizationOrFail', () => {
    it('should return the organization when it exists', async () => {
      const mockOrg = { id: 'org-1' };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganizationOrFail('org-1');
      expect(result).toBe(mockOrg);
    });

    it('should throw EntityNotFoundException when organization is not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getOrganizationOrFail('org-999')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getOrganizationAndAgent', () => {
    it('should return organization and agent when agent is initialized', async () => {
      const mockAgent = { id: 'agent-1' };
      const mockOrg = { id: 'org-1', agent: mockAgent };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganizationAndAgent('org-1');
      expect(result.organization).toBe(mockOrg);
      expect(result.agent).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent is not loaded', async () => {
      const mockOrg = { id: 'org-1', agent: undefined };
      entityManager.findOne.mockResolvedValue(mockOrg);

      await expect(service.getOrganizationAndAgent('org-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotFoundException when organization does not exist', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getOrganizationAndAgent('org-999')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getOrganizationByNameIdOrFail', () => {
    it('should return the organization when found by nameID', async () => {
      const mockOrg = { id: 'org-1', nameID: 'my-org' };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganizationByNameIdOrFail('my-org');
      expect(result).toBe(mockOrg);
    });

    it('should throw EntityNotFoundException when nameID does not match', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getOrganizationByNameIdOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getOrganizationByDomain', () => {
    it('should return the organization when found by domain', async () => {
      const mockOrg = { id: 'org-1', domain: 'example.com' };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getOrganizationByDomain('example.com');
      expect(result).toBe(mockOrg);
    });

    it('should return null when no organization matches the domain', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getOrganizationByDomain('unknown.com');
      expect(result).toBeNull();
    });
  });

  describe('organizationsWithCredentials', () => {
    it('should default resourceID to empty string when not provided', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.organizationsWithCredentials({ type: 'space-admin' as any });

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            agent: {
              credentials: {
                type: 'space-admin',
                resourceID: '',
              },
            },
          },
        })
      );
    });

    it('should pass the limit parameter to the query', async () => {
      entityManager.find.mockResolvedValue([]);

      await service.organizationsWithCredentials(
        { type: 'space-admin' as any, resourceID: 'space-1' },
        10
      );

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('countOrganizationsWithCredentials', () => {
    it('should return the count from the entity manager', async () => {
      entityManager.count.mockResolvedValue(3);

      const result = await service.countOrganizationsWithCredentials({
        type: 'space-member' as any,
        resourceID: 'space-1',
      });

      expect(result).toBe(3);
    });

    it('should default resourceID to empty string when not provided', async () => {
      entityManager.count.mockResolvedValue(0);

      await service.countOrganizationsWithCredentials({
        type: 'space-admin' as any,
      });

      expect(entityManager.count).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            agent: {
              credentials: {
                type: 'space-admin',
                resourceID: '',
              },
            },
          },
        })
      );
    });
  });
});
