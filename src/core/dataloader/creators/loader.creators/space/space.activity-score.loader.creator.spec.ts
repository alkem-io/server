import { AuthorizationPrivilege } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { SpaceActivityScoreLoaderCreator } from './space.activity-score.loader.creator';

/**
 * Sets up the two query-builder chains the loader drives: one over `Space`
 * (id → collaborationId) and one over `Activity` (grouped COUNT per
 * collaboration).
 */
function mockQueryBuilders(
  entityManager: Mocked<EntityManager>,
  spaceRows: Array<{ id: string; collaborationId: string | null }>,
  activityRows: Array<{ collaborationID: string; count: string }>
) {
  const spaceQb = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(spaceRows),
  };
  const activityQb = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(activityRows),
  };

  entityManager.createQueryBuilder.mockReturnValue(spaceQb as any);
  entityManager.getRepository.mockReturnValue({
    createQueryBuilder: vi.fn().mockReturnValue(activityQb),
  } as any);

  return { spaceQb, activityQb };
}

describe('SpaceActivityScoreLoaderCreator', () => {
  let creator: SpaceActivityScoreLoaderCreator;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      createQueryBuilder: vi.fn(),
      getRepository: vi.fn(),
      find: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceActivityScoreLoaderCreator,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();

    creator = module.get(SpaceActivityScoreLoaderCreator);
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

  describe('without checkParentPrivilege (backward compatibility)', () => {
    it('returns the raw activity count per Space and does not query for authorization', async () => {
      mockQueryBuilders(
        entityManager,
        [
          { id: 'space-1', collaborationId: 'collab-1' },
          { id: 'space-2', collaborationId: 'collab-2' },
        ],
        [
          { collaborationID: 'collab-1', count: '3' },
          { collaborationID: 'collab-2', count: '0' },
        ]
      );

      const loader = creator.create();
      const [score1, score2] = await Promise.all([
        loader.load('space-1'),
        loader.load('space-2'),
      ]);

      expect(score1).toBe(3);
      // collab-2 has no matching row in the grouped count -> 0
      expect(score2).toBe(0);
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('returns 0 for a Space with no collaboration', async () => {
      mockQueryBuilders(
        entityManager,
        [{ id: 'space-1', collaborationId: null }],
        []
      );

      const loader = creator.create();
      const score = await loader.load('space-1');

      expect(score).toBe(0);
    });
  });

  describe('with checkParentPrivilege (Space.activityScore field gate)', () => {
    const authorize = vi.fn();

    beforeEach(() => {
      authorize.mockReset();
    });

    it('rejects (does not leak a count for) a Space the actor cannot READ', async () => {
      mockQueryBuilders(
        entityManager,
        [{ id: 'private-space', collaborationId: 'collab-1' }],
        [{ collaborationID: 'collab-1', count: '42' }]
      );
      const authorization = { id: 'auth-1' };
      entityManager.find.mockResolvedValue([
        { id: 'private-space', authorization } as unknown as Space,
      ]);
      const denied = new ForbiddenAuthorizationPolicyException(
        'denied',
        AuthorizationPrivilege.READ,
        'auth-1',
        'actor-1'
      );
      authorize.mockImplementation(() => {
        throw denied;
      });

      const loader = creator.create({
        checkParentPrivilege: AuthorizationPrivilege.READ,
        authorize,
      } as any);

      await expect(loader.load('private-space')).rejects.toBe(denied);
      expect(authorize).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'private-space', authorization }),
        AuthorizationPrivilege.READ
      );
    });

    it('returns the real count for a Space the actor can READ', async () => {
      mockQueryBuilders(
        entityManager,
        [{ id: 'public-space', collaborationId: 'collab-1' }],
        [{ collaborationID: 'collab-1', count: '7' }]
      );
      entityManager.find.mockResolvedValue([
        { id: 'public-space', authorization: {} } as unknown as Space,
      ]);
      authorize.mockReturnValue(true);

      const loader = creator.create({
        checkParentPrivilege: AuthorizationPrivilege.READ,
        authorize,
      } as any);

      const score = await loader.load('public-space');

      expect(score).toBe(7);
    });

    it('propagates non-authorization errors from the authorize callback', async () => {
      mockQueryBuilders(
        entityManager,
        [{ id: 'space-1', collaborationId: 'collab-1' }],
        []
      );
      entityManager.find.mockResolvedValue([
        { id: 'space-1', authorization: {} } as unknown as Space,
      ]);
      authorize.mockImplementation(() => {
        throw new Error('unexpected');
      });

      const loader = creator.create({
        checkParentPrivilege: AuthorizationPrivilege.READ,
        authorize,
      } as any);

      await expect(loader.load('space-1')).rejects.toThrow('unexpected');
    });
  });
});
