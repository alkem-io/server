import { Organization } from '@domain/community/organization/organization.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { LeadOrganizationsByRoleSetLoaderCreator } from './lead.organizations.by.role.set.loader.creator';

describe('LeadOrganizationsByRoleSetLoaderCreator', () => {
  let creator: LeadOrganizationsByRoleSetLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadOrganizationsByRoleSetLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(LeadOrganizationsByRoleSetLoaderCreator);
    entityManager = module.get(
      getEntityManagerToken()
    ) as Mocked<EntityManager>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(creator).toBeDefined();
  });

  it('should create a DataLoader', () => {
    const loader = creator.create();
    expect(loader).toBeDefined();
    expect(typeof loader.load).toBe('function');
  });

  describe('batch loading', () => {
    it('should return empty arrays for keys with no matching organizations', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('space-lead|resource-1'),
        loader.load('space-lead|resource-2'),
      ]);

      expect(r1).toEqual([]);
      expect(r2).toEqual([]);
    });

    it('should group organizations by composite key', async () => {
      const org1 = {
        id: 'org-1',
        credentials: [{ type: 'space-lead', resourceID: 'resource-1' }],
      };
      const org2 = {
        id: 'org-2',
        credentials: [{ type: 'space-lead', resourceID: 'resource-2' }],
      };
      const org3 = {
        id: 'org-3',
        credentials: [{ type: 'space-lead', resourceID: 'resource-1' }],
      };

      entityManager.find.mockResolvedValue([org1, org2, org3]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('space-lead|resource-1'),
        loader.load('space-lead|resource-2'),
      ]);

      expect(r1).toHaveLength(2);
      expect(r1).toEqual(expect.arrayContaining([org1, org3]));
      expect(r2).toHaveLength(1);
      expect(r2).toEqual([org2]);
    });

    it('should query with correct where conditions', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      await Promise.all([
        loader.load('type-a|res-1'),
        loader.load('type-b|res-2'),
      ]);

      expect(entityManager.find).toHaveBeenCalledWith(Organization, {
        where: [
          { credentials: { type: 'type-a', resourceID: 'res-1' } },
          { credentials: { type: 'type-b', resourceID: 'res-2' } },
        ],
        relations: { credentials: true },
      });
    });

    it('should handle keys with empty resourceID', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      await loader.load('type-a|');

      expect(entityManager.find).toHaveBeenCalledWith(Organization, {
        where: [{ credentials: { type: 'type-a', resourceID: '' } }],
        relations: { credentials: true },
      });
    });

    it('should handle key without pipe separator (resourceID defaults to empty)', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      await loader.load('type-only');

      expect(entityManager.find).toHaveBeenCalledWith(Organization, {
        where: [
          {
            credentials: { type: 'type-only', resourceID: '' },
          },
        ],
        relations: { credentials: true },
      });
    });

    it('should handle organization with multiple credentials matching different keys', async () => {
      const org = {
        id: 'org-1',
        credentials: [
          { type: 'lead', resourceID: 'res-1' },
          { type: 'lead', resourceID: 'res-2' },
        ],
      };

      entityManager.find.mockResolvedValue([org]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('lead|res-1'),
        loader.load('lead|res-2'),
      ]);

      // Same org should appear in both results
      expect(r1).toEqual([org]);
      expect(r2).toEqual([org]);
    });
  });

  describe('caching', () => {
    it('should cache results for repeated keys', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      await loader.load('key|value');
      await loader.load('key|value');

      expect(entityManager.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should propagate database errors', async () => {
      entityManager.find.mockRejectedValue(new Error('DB error'));

      const loader = creator.create();

      await expect(loader.load('type|resource')).rejects.toThrow('DB error');
    });
  });
});
