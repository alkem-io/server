import { User } from '@domain/community/user/user.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { LeadUsersByRoleSetLoaderCreator } from './lead.users.by.role.set.loader.creator';

describe('LeadUsersByRoleSetLoaderCreator', () => {
  let creator: LeadUsersByRoleSetLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadUsersByRoleSetLoaderCreator,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    creator = module.get(LeadUsersByRoleSetLoaderCreator);
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
    it('should return empty arrays for keys with no matching users', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('space-lead|resource-1'),
        loader.load('space-lead|resource-2'),
      ]);

      expect(r1).toEqual([]);
      expect(r2).toEqual([]);
    });

    it('should group users by composite key', async () => {
      const user1 = {
        id: 'user-1',
        credentials: [{ type: 'space-lead', resourceID: 'resource-1' }],
      };
      const user2 = {
        id: 'user-2',
        credentials: [{ type: 'space-lead', resourceID: 'resource-2' }],
      };
      const user3 = {
        id: 'user-3',
        credentials: [{ type: 'space-lead', resourceID: 'resource-1' }],
      };

      entityManager.find.mockResolvedValue([user1, user2, user3]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('space-lead|resource-1'),
        loader.load('space-lead|resource-2'),
      ]);

      expect(r1).toHaveLength(2);
      expect(r1).toEqual(expect.arrayContaining([user1, user3]));
      expect(r2).toHaveLength(1);
      expect(r2).toEqual([user2]);
    });

    it('should query with correct where conditions', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      await Promise.all([
        loader.load('type-a|res-1'),
        loader.load('type-b|res-2'),
      ]);

      expect(entityManager.find).toHaveBeenCalledWith(User, {
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

      expect(entityManager.find).toHaveBeenCalledWith(User, {
        where: [{ credentials: { type: 'type-a', resourceID: '' } }],
        relations: { credentials: true },
      });
    });

    it('should handle key without pipe separator', async () => {
      entityManager.find.mockResolvedValue([]);

      const loader = creator.create();

      await loader.load('type-only');

      expect(entityManager.find).toHaveBeenCalledWith(User, {
        where: [
          {
            credentials: { type: 'type-only', resourceID: '' },
          },
        ],
        relations: { credentials: true },
      });
    });

    it('should handle user with multiple credentials matching different keys', async () => {
      const user = {
        id: 'user-1',
        credentials: [
          { type: 'lead', resourceID: 'res-1' },
          { type: 'lead', resourceID: 'res-2' },
        ],
      };

      entityManager.find.mockResolvedValue([user]);

      const loader = creator.create();

      const [r1, r2] = await Promise.all([
        loader.load('lead|res-1'),
        loader.load('lead|res-2'),
      ]);

      expect(r1).toEqual([user]);
      expect(r2).toEqual([user]);
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
