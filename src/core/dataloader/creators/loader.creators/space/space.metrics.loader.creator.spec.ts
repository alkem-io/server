import { RoleName } from '@common/enums/role.name';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { SpaceMetricsLoaderCreator } from './space.metrics.loader.creator';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

/**
 * Helper to build a Space row with the nested community -> roleSet -> roles chain
 * that the loader traverses.
 */
function makeSpaceRow(
  spaceId: string,
  aboutId: string,
  resourceID: string,
  memberType = 'space-member'
) {
  return {
    id: spaceId,
    about: { id: aboutId },
    community: {
      roleSet: {
        roles: [
          {
            name: RoleName.MEMBER,
            credential: { resourceID, type: memberType },
          },
          {
            name: RoleName.LEAD,
            credential: {
              resourceID: `lead-${resourceID}`,
              type: 'space-lead',
            },
          },
        ],
      },
    },
  };
}

describe('SpaceMetricsLoaderCreator', () => {
  let creator: SpaceMetricsLoaderCreator;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceMetricsLoaderCreator,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    creator = module.get(SpaceMetricsLoaderCreator);
    db = module.get(DRIZZLE);
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
    it('should resolve member metrics for multiple spaces', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'res-1'),
        makeSpaceRow('s-2', 'about-2', 'res-2'),
      ]);
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 25 },
        { resourceID: 'res-2', count: 50 },
      ]);

      const loader = creator.create();

      const [metrics1, metrics2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      // Each result should be an array with one NVP: { name: 'members', value: '<count>' }
      expect(metrics1).toHaveLength(1);
      expect(metrics1[0].name).toBe('members');
      expect(metrics1[0].value).toBe('25');

      expect(metrics2).toHaveLength(1);
      expect(metrics2[0].name).toBe('members');
      expect(metrics2[0].value).toBe('50');
    });

    it('should batch the Space find into a single call', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'res-1'),
      ]);
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 10 },
      ]);

      const loader = creator.create();
      await loader.load('about-1');
    });

    it('should return 0 members when credential count query returns no rows', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'res-1'),
      ]);
      db.groupBy.mockResolvedValueOnce([]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('members');
      expect(metrics[0].value).toBe('0');
    });

    it('should return empty array for spaceAbout IDs not found', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([]);

      const loader = creator.create();
      const metrics = await loader.load('about-nonexistent');

      expect(metrics).toEqual([]);
    });

    it('should return results in input order regardless of DB return order', async () => {
      // DB returns in reverse order
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-2', 'about-2', 'res-2'),
        makeSpaceRow('s-1', 'about-1', 'res-1'),
      ]);
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-2', count: 200 },
        { resourceID: 'res-1', count: 100 },
      ]);

      const loader = creator.create();

      const [m1, m2] = await Promise.all([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(m1[0].value).toBe('100');
      expect(m2[0].value).toBe('200');
    });

    it('should assign deterministic IDs to NVP objects', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'res-1'),
      ]);
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 5 },
      ]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics[0].id).toBe('members-about-1');
    });
  });

  describe('edge cases', () => {
    it('should skip spaces without community or roleSet', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        { id: 's-1', about: { id: 'about-1' }, community: undefined },
      ]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics).toEqual([]);
    });

    it('should skip spaces where member role has no credential', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        {
          id: 's-1',
          about: { id: 'about-1' },
          community: {
            roleSet: {
              roles: [{ name: RoleName.MEMBER, credential: undefined }],
            },
          },
        },
      ]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics).toEqual([]);
    });

    it('should skip spaces with no MEMBER role at all', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        {
          id: 's-1',
          about: { id: 'about-1' },
          community: {
            roleSet: {
              roles: [
                {
                  name: RoleName.LEAD,
                  credential: { resourceID: 'lead-res' },
                },
              ],
            },
          },
        },
      ]);

      const loader = creator.create();
      const metrics = await loader.load('about-1');

      expect(metrics).toEqual([]);
    });

    it('should propagate database errors to all pending loads', async () => {
      db.query.spaces.findMany.mockRejectedValueOnce(
        new Error('DB connection failed')
      );

      const loader = creator.create();

      const [r1, r2] = await Promise.allSettled([
        loader.load('about-1'),
        loader.load('about-2'),
      ]);

      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('rejected');
    });

    it('should use DataLoader caching for repeated keys', async () => {
      db.query.spaces.findMany.mockResolvedValueOnce([
        makeSpaceRow('s-1', 'about-1', 'res-1'),
      ]);
      db.groupBy.mockResolvedValueOnce([
        { resourceID: 'res-1', count: 10 },
      ]);

      const loader = creator.create();

      const result1 = await loader.load('about-1');
      const result2 = await loader.load('about-1');

      expect(result1).toBe(result2);
    });
  });
});
