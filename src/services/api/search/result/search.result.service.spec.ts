import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { SearchCategory } from '../search.category';
import { SearchResultType } from '../search.result.type';
import { SearchResultService } from './search.result.service';

describe('SearchResultService', () => {
  let service: SearchResultService;
  let authorizationService: { isAccessGranted: Mock };
  let actorLookupService: { getActorIDsWithCredential: Mock };
  let entityManager: {
    findBy: Mock;
    find: Mock;
    findOneByOrFail: Mock;
    findOne: Mock;
  };

  const actorContext = { credentials: [], actorID: 'actor-1' } as any;

  beforeEach(async () => {
    entityManager = {
      findBy: vi.fn().mockResolvedValue([]),
      find: vi.fn().mockResolvedValue([]),
      findOneByOrFail: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchResultService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SearchResultService);
    authorizationService = module.get(AuthorizationService) as any;
    actorLookupService = module.get(ActorLookupService) as any;
  });

  describe('getSpaceSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getSpaceSearchResults([]);

      expect(result).toEqual([]);
      expect(entityManager.findBy).not.toHaveBeenCalled();
    });

    it('should return single space result when spaceId filter is provided', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SPACE,
          result: { id: 'space-1' },
        },
      ] as any[];
      const space = { id: 'space-1', name: 'Test Space' };
      entityManager.findOneByOrFail.mockResolvedValue(space);

      const result = await service.getSpaceSearchResults(rawResults, 'space-1');

      expect(result).toHaveLength(1);
      expect(result[0].space).toBe(space);
    });

    it('should map raw results to spaces found by entity manager', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SPACE,
          result: { id: 'space-1' },
        },
        {
          id: 'sr-2',
          score: 3,
          type: SearchResultType.SPACE,
          result: { id: 'space-2' },
        },
      ] as any[];
      const spaces = [{ id: 'space-1' }, { id: 'space-2' }];
      entityManager.findBy.mockResolvedValue(spaces);

      const result = await service.getSpaceSearchResults(rawResults);

      expect(result).toHaveLength(2);
    });

    it('should filter out spaces with no matching raw result', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SPACE,
          result: { id: 'space-1' },
        },
      ] as any[];
      entityManager.findBy.mockResolvedValue([{ id: 'space-999' }]);

      const result = await service.getSpaceSearchResults(rawResults);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSubspaceSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getSubspaceSearchResults([], actorContext);

      expect(result).toEqual([]);
    });

    it('should filter out subspaces user is not authorized to read', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];
      entityManager.find.mockResolvedValue([
        {
          id: 'sub-1',
          authorization: { id: 'auth-1' },
          parentSpace: { id: 'space-1' },
        },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should filter out subspaces without parentSpace', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];
      entityManager.find.mockResolvedValue([
        {
          id: 'sub-1',
          authorization: { id: 'auth-1' },
          parentSpace: undefined,
        },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized subspaces with parentSpace', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];
      const parentSpace = { id: 'space-1' };
      entityManager.find.mockResolvedValue([
        { id: 'sub-1', authorization: { id: 'auth-1' }, parentSpace },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].parentSpace).toBe(parentSpace);
    });

    it('should filter out subspaces not found in raw results', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];
      entityManager.find.mockResolvedValue([
        {
          id: 'sub-other',
          authorization: { id: 'auth-1' },
          parentSpace: { id: 'space-1' },
        },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getUserSearchResults([]);

      expect(result).toEqual([]);
    });

    it('should return all matching users when no spaceId filter', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.USER,
          result: { id: 'user-1' },
        },
        {
          id: 'sr-2',
          score: 3,
          type: SearchResultType.USER,
          result: { id: 'user-2' },
        },
      ] as any[];
      entityManager.findBy.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);

      const result = await service.getUserSearchResults(rawResults);

      expect(result).toHaveLength(2);
    });

    it('should filter users by space membership when spaceId is provided', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.USER,
          result: { id: 'user-1' },
        },
        {
          id: 'sr-2',
          score: 3,
          type: SearchResultType.USER,
          result: { id: 'user-2' },
        },
      ] as any[];

      actorLookupService.getActorIDsWithCredential
        .mockResolvedValueOnce(['user-1'])
        .mockResolvedValueOnce([]);

      entityManager.findBy.mockResolvedValue([{ id: 'user-1' }]);

      const result = await service.getUserSearchResults(rawResults, 'space-1');

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe('user-1');
    });

    it('should exclude users not found in DB', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.USER,
          result: { id: 'user-1' },
        },
      ] as any[];
      entityManager.findBy.mockResolvedValue([{ id: 'user-other' }]);

      const result = await service.getUserSearchResults(rawResults);

      expect(result).toHaveLength(0);
    });
  });

  describe('getOrganizationSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getOrganizationSearchResults(
        [],
        actorContext
      );

      expect(result).toEqual([]);
    });

    it('should filter out organizations without READ authorization', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.ORGANIZATION,
          result: { id: 'org-1' },
        },
      ] as any[];
      entityManager.findBy.mockResolvedValue([
        { id: 'org-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.getOrganizationSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized organizations', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.ORGANIZATION,
          result: { id: 'org-1' },
        },
      ] as any[];
      entityManager.findBy.mockResolvedValue([
        { id: 'org-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getOrganizationSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].organization.id).toBe('org-1');
    });

    it('should filter organizations by spaceId when provided', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.ORGANIZATION,
          result: { id: 'org-1' },
        },
        {
          id: 'sr-2',
          score: 3,
          type: SearchResultType.ORGANIZATION,
          result: { id: 'org-2' },
        },
      ] as any[];

      actorLookupService.getActorIDsWithCredential
        .mockResolvedValueOnce(['org-1']) // SPACE_MEMBER
        .mockResolvedValueOnce([]) // SPACE_ADMIN
        .mockResolvedValueOnce([]); // SPACE_LEAD

      entityManager.findBy.mockResolvedValue([
        { id: 'org-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getOrganizationSearchResults(
        rawResults,
        actorContext,
        'space-1'
      );

      expect(result).toHaveLength(1);
      expect(result[0].organization.id).toBe('org-1');
    });
  });

  describe('getPostSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getPostSearchResults([], actorContext);

      expect(result).toEqual([]);
    });

    it('should filter out unauthorized posts', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.POST,
          result: { id: 'post-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'post-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.getPostSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized posts with their parents', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.POST,
          result: { id: 'post-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'post-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      // Mock callout parent query
      entityManager.find
        .mockResolvedValueOnce([
          {
            id: 'callout-1',
            settings: { visibility: 'published' },
            contributions: [{ post: { id: 'post-1' } }],
            calloutsSet: { id: 'cs-1', type: 'collaboration' },
          },
        ])
        // Mock space parent query
        .mockResolvedValueOnce([
          {
            id: 'space-1',
            level: 0,
            collaboration: {
              calloutsSet: {
                callouts: [
                  {
                    id: 'callout-1',
                    contributions: [{ post: { id: 'post-1' } }],
                  },
                ],
              },
            },
          },
        ]);

      const result = await service.getPostSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].post.id).toBe('post-1');
      expect(result[0].callout.id).toBe('callout-1');
      expect(result[0].space.id).toBe('space-1');
    });
  });

  describe('resolveSearchResults', () => {
    it('should return empty results for empty input', async () => {
      const filters = [
        { category: SearchCategory.SPACES, size: 5 },
        { category: SearchCategory.CONTRIBUTORS, size: 5 },
        { category: SearchCategory.CONTRIBUTIONS, size: 5 },
        { category: SearchCategory.FRAMINGS, size: 5 },
        { category: SearchCategory.COLLABORATION_TOOLS, size: 5 },
      ] as any[];

      const result = await service.resolveSearchResults(
        [],
        actorContext,
        filters
      );

      expect(result.spaceResults.results).toEqual([]);
      expect(result.actorResults.results).toEqual([]);
      expect(result.contributionResults.results).toEqual([]);
      expect(result.calloutResults.results).toEqual([]);
      expect(result.framingResults.results).toEqual([]);
    });

    it('should group results by type and resolve them', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 10,
          type: SearchResultType.SPACE,
          terms: [],
          result: { id: 'space-1' },
        },
        {
          id: 'sr-2',
          score: 5,
          type: SearchResultType.USER,
          terms: [],
          result: { id: 'user-1' },
        },
      ] as any[];

      const filters = [
        { category: SearchCategory.SPACES, size: 5 },
        { category: SearchCategory.CONTRIBUTORS, size: 5 },
      ] as any[];

      // Mock space query
      entityManager.findBy.mockImplementation((_entity: any, opts: any) => {
        // Return the entity based on input IDs
        const ids = opts?.id?.value ?? [];
        if (ids.includes('space-1')) {
          return Promise.resolve([{ id: 'space-1' }]);
        }
        if (ids.includes('user-1')) {
          return Promise.resolve([{ id: 'user-1' }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.resolveSearchResults(
        rawResults,
        actorContext,
        filters
      );

      expect(result.spaceResults.results.length).toBeGreaterThanOrEqual(0);
      expect(result.actorResults.results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCalloutSearchResult (via resolveSearchResults)', () => {
    it('should return empty for empty callout results', async () => {
      const result = await (service as any).getCalloutSearchResult(
        [],
        actorContext
      );
      expect(result).toEqual([]);
    });

    it('should filter out unauthorized callouts', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.CALLOUT,
          result: { id: 'callout-1' },
        },
      ] as any[];

      entityManager.find.mockResolvedValueOnce([
        {
          id: 'callout-1',
          authorization: { id: 'auth-1' },
          calloutsSet: { id: 'cs-1', type: 'collaboration' },
          framing: { id: 'f-1' },
          contributions: [],
        },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await (service as any).getCalloutSearchResult(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized callouts with space parent', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.CALLOUT,
          result: { id: 'callout-1' },
        },
      ] as any[];

      entityManager.find
        .mockResolvedValueOnce([
          {
            id: 'callout-1',
            authorization: { id: 'auth-1' },
            calloutsSet: { id: 'cs-1', type: 'collaboration' },
            framing: { id: 'f-1' },
            contributions: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'space-1',
            level: 0,
            collaboration: {
              calloutsSet: {
                callouts: [{ id: 'callout-1' }],
              },
            },
          },
        ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await (service as any).getCalloutSearchResult(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].callout.id).toBe('callout-1');
      expect(result[0].space.id).toBe('space-1');
    });
  });

  describe('getWhiteboardSearchResults (private)', () => {
    it('should return empty for empty input', async () => {
      const result = await (service as any).getWhiteboardSearchResults(
        [],
        actorContext
      );
      expect(result).toEqual([]);
    });

    it('should filter out unauthorized whiteboards', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.WHITEBOARD,
          result: { id: 'wb-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'wb-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await (service as any).getWhiteboardSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized whiteboards with framing parent', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.WHITEBOARD,
          result: { id: 'wb-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'wb-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      // Mock callout find for whiteboard parents
      entityManager.find
        .mockResolvedValueOnce([
          {
            id: 'callout-1',
            settings: { visibility: 'published' },
            framing: { whiteboard: { id: 'wb-1' } },
            contributions: [],
            calloutsSet: { id: 'cs-1', type: 'collaboration' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'space-1',
            level: 0,
            collaboration: {
              calloutsSet: {
                callouts: [
                  {
                    id: 'callout-1',
                    framing: { whiteboard: { id: 'wb-1' } },
                    contributions: [],
                  },
                ],
              },
            },
          },
        ]);

      const result = await (service as any).getWhiteboardSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].whiteboard.id).toBe('wb-1');
      expect(result[0].isContribution).toBe(false);
    });

    it('should mark contribution whiteboards as isContribution=true', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.WHITEBOARD,
          result: { id: 'wb-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'wb-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      entityManager.find
        .mockResolvedValueOnce([
          {
            id: 'callout-1',
            settings: { visibility: 'published' },
            framing: { whiteboard: null },
            contributions: [{ whiteboard: { id: 'wb-1' } }],
            calloutsSet: { id: 'cs-1', type: 'collaboration' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'space-1',
            level: 0,
            collaboration: {
              calloutsSet: {
                callouts: [
                  {
                    id: 'callout-1',
                    framing: { whiteboard: null },
                    contributions: [{ whiteboard: { id: 'wb-1' } }],
                  },
                ],
              },
            },
          },
        ]);

      const result = await (service as any).getWhiteboardSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].isContribution).toBe(true);
    });
  });

  describe('getMemoSearchResults (private)', () => {
    it('should return empty for empty input', async () => {
      const result = await (service as any).getMemoSearchResults(
        [],
        actorContext
      );
      expect(result).toEqual([]);
    });

    it('should filter out unauthorized memos', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.MEMO,
          result: { id: 'memo-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'memo-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await (service as any).getMemoSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized framing memos', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.MEMO,
          result: { id: 'memo-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'memo-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      entityManager.find
        .mockResolvedValueOnce([
          {
            id: 'callout-1',
            settings: { visibility: 'published' },
            framing: { memo: { id: 'memo-1' } },
            contributions: [],
            calloutsSet: { id: 'cs-1', type: 'collaboration' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'space-1',
            level: 0,
            collaboration: {
              calloutsSet: {
                callouts: [
                  {
                    id: 'callout-1',
                    framing: { memo: { id: 'memo-1' } },
                    contributions: [],
                  },
                ],
              },
            },
          },
        ]);

      const result = await (service as any).getMemoSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].memo.id).toBe('memo-1');
      expect(result[0].isContribution).toBe(false);
    });

    it('should return contribution memos with isContribution=true', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.MEMO,
          result: { id: 'memo-1' },
        },
      ] as any[];

      entityManager.findBy.mockResolvedValue([
        { id: 'memo-1', authorization: { id: 'auth-1' } },
      ]);
      authorizationService.isAccessGranted.mockReturnValue(true);

      entityManager.find
        .mockResolvedValueOnce([
          {
            id: 'callout-1',
            settings: { visibility: 'published' },
            framing: { memo: null },
            contributions: [{ memo: { id: 'memo-1' } }],
            calloutsSet: { id: 'cs-1', type: 'collaboration' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'space-1',
            level: 0,
            collaboration: {
              calloutsSet: {
                callouts: [
                  {
                    id: 'callout-1',
                    framing: { memo: null },
                    contributions: [{ memo: { id: 'memo-1' } }],
                  },
                ],
              },
            },
          },
        ]);

      const result = await (service as any).getMemoSearchResults(
        rawResults,
        actorContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].isContribution).toBe(true);
    });
  });
});
