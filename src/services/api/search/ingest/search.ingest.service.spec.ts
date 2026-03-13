import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { TaskService } from '@services/task';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock, vi } from 'vitest';
import { SearchIngestService } from './search.ingest.service';

describe('SearchIngestService', () => {
  let service: SearchIngestService;
  let mockTaskService: {
    complete: Mock;
    completeWithError: Mock;
    updateTaskResults: Mock;
    updateTaskErrors: Mock;
  };
  let _mockLogger: { verbose: Mock; error: Mock; warn: Mock };
  let mockElasticClient: {
    indices: {
      create: Mock;
      delete: Mock;
      getAlias: Mock;
      updateAliases: Mock;
    };
    bulk: Mock;
  };
  let mockEntityManager: {
    find: Mock;
    count: Mock;
    findBy: Mock;
  };

  const configServiceMock = {
    get: vi.fn((key: string) => {
      if (key === 'search.index_pattern') return 'test-';
      return undefined;
    }),
  };

  const task = { id: 'task-id' } as any;
  const suffix = '20250923120000';

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockElasticClient = {
      indices: {
        create: vi.fn().mockResolvedValue({ acknowledged: true }),
        delete: vi.fn().mockResolvedValue({ acknowledged: true }),
        getAlias: vi.fn().mockResolvedValue({}),
        updateAliases: vi.fn().mockResolvedValue({ acknowledged: true }),
      },
      bulk: vi.fn().mockResolvedValue({ errors: false, items: [] }),
    };

    mockEntityManager = {
      find: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findBy: vi.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIngestService,
        {
          provide: ELASTICSEARCH_CLIENT_PROVIDER,
          useValue: mockElasticClient,
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SearchIngestService>(SearchIngestService);
    mockTaskService = module.get(TaskService) as any;
    _mockLogger = module.get(WINSTON_MODULE_NEST_PROVIDER) as any;

    // Mock task service methods
    mockTaskService.complete.mockResolvedValue(undefined);
    mockTaskService.completeWithError.mockResolvedValue(undefined);
    mockTaskService.updateTaskResults.mockResolvedValue(undefined);
    mockTaskService.updateTaskErrors.mockResolvedValue(undefined);

    vi.spyOn(service as any, 'generateSuffix').mockReturnValue(suffix);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestFromScratch', () => {
    it('should complete the task when all steps succeed and no old aliases exist', async () => {
      vi.spyOn(service as any, 'ingestStepCreateIndices').mockResolvedValue(
        undefined
      );
      vi.spyOn(service as any, 'ingestStepIngestIntoIndices').mockResolvedValue(
        undefined
      );
      vi.spyOn(service as any, 'ingestStepAssignAliases').mockResolvedValue([]);

      await service.ingestFromScratch(task);

      expect(mockTaskService.complete).toHaveBeenCalledWith(task.id);
    });

    it('should delete old indices when aliases existed', async () => {
      vi.spyOn(service as any, 'ingestStepCreateIndices').mockResolvedValue(
        undefined
      );
      vi.spyOn(service as any, 'ingestStepIngestIntoIndices').mockResolvedValue(
        undefined
      );
      vi.spyOn(service as any, 'ingestStepAssignAliases').mockResolvedValue([
        { index: 'old-index-1', alias: 'test-spaces' },
        { index: 'old-index-2', alias: 'test-users' },
      ]);
      const deleteSpy = vi
        .spyOn(service as any, 'ingestStepDeleteOldIndices')
        .mockResolvedValue(undefined);

      await service.ingestFromScratch(task);

      expect(deleteSpy).toHaveBeenCalledWith(task, [
        'old-index-1',
        'old-index-2',
      ]);
      expect(mockTaskService.complete).toHaveBeenCalledWith(task.id);
    });

    it('should completeWithError and log error on failure', async () => {
      const error = new Error('fail!');
      vi.spyOn(service as any, 'ingestStepCreateIndices').mockRejectedValue(
        error
      );

      await service.ingestFromScratch(task);

      expect(mockTaskService.completeWithError).toHaveBeenCalledWith(
        task.id,
        expect.stringContaining('Ingest from scratch failed: fail!')
      );
    });
  });

  describe('ensureIndicesExist', () => {
    it('should create all indices and return acknowledged', async () => {
      const result = await (service as any).ensureIndicesExist(suffix);

      expect(result.acknowledged).toBe(true);
      // 8 aliases: spaces, subspaces, organizations, users, posts, callouts, whiteboards, memos
      expect(mockElasticClient.indices.create).toHaveBeenCalledTimes(8);
    });

    it('should return not acknowledged when a create call fails', async () => {
      mockElasticClient.indices.create.mockRejectedValueOnce({
        meta: { body: { error: { reason: 'index already exists' } } },
      });

      const result = await (service as any).ensureIndicesExist(suffix);

      expect(result.acknowledged).toBe(false);
      expect(result.message).toBe('index already exists');
    });

    it('should return not acknowledged when client is undefined', async () => {
      (service as any).elasticClient = undefined;

      const result = await (service as any).ensureIndicesExist(suffix);

      expect(result.acknowledged).toBe(false);
      expect(result.message).toBe('Elasticsearch client not initialized');
    });
  });

  describe('removeIndices', () => {
    it('should delete indices and return acknowledged', async () => {
      const result = await (service as any).removeIndices(['idx-1', 'idx-2']);

      expect(result.acknowledged).toBe(true);
      expect(mockElasticClient.indices.delete).toHaveBeenCalledTimes(2);
    });

    it('should treat 404 as acknowledged (already deleted)', async () => {
      mockElasticClient.indices.delete.mockRejectedValueOnce({
        meta: { statusCode: 404, body: { error: { reason: 'not found' } } },
      });

      const result = await (service as any).removeIndices(['idx-1']);

      expect(result.acknowledged).toBe(true);
    });

    it('should return not acknowledged on non-404 error', async () => {
      mockElasticClient.indices.delete.mockRejectedValueOnce({
        meta: { statusCode: 500, body: { error: { reason: 'server error' } } },
      });

      const result = await (service as any).removeIndices(['idx-1']);

      expect(result.acknowledged).toBe(false);
      expect(result.message).toBe('server error');
    });

    it('should return not acknowledged when client is undefined', async () => {
      (service as any).elasticClient = undefined;

      const result = await (service as any).removeIndices(['idx-1']);

      expect(result.acknowledged).toBe(false);
    });
  });

  describe('getActiveAliases', () => {
    it('should return aliases from elasticsearch', async () => {
      mockElasticClient.indices.getAlias.mockResolvedValue({
        'test-spaces-20250101': { aliases: { 'test-spaces': {} } },
        'test-users-20250101': { aliases: { 'test-users': {} } },
      });

      const result = await (service as any).getActiveAliases();

      expect(result).toEqual([
        { index: 'test-spaces-20250101', alias: 'test-spaces' },
        { index: 'test-users-20250101', alias: 'test-users' },
      ]);
    });

    it('should return empty array when getAlias throws (no aliases)', async () => {
      mockElasticClient.indices.getAlias.mockRejectedValue(
        new Error('not found')
      );

      const result = await (service as any).getActiveAliases();

      expect(result).toEqual([]);
    });

    it('should throw when client is undefined', async () => {
      (service as any).elasticClient = undefined;

      await expect((service as any).getActiveAliases()).rejects.toThrow(
        'Elasticsearch client not initialized'
      );
    });
  });

  describe('assignAliasToIndex', () => {
    it('should add alias actions', async () => {
      const data = [{ alias: 'test-spaces', index: 'test-spaces-20250101' }];

      await (service as any).assignAliasToIndex(data);

      expect(mockElasticClient.indices.updateAliases).toHaveBeenCalledWith({
        actions: [
          { add: { index: 'test-spaces-20250101', alias: 'test-spaces' } },
        ],
      });
    });

    it('should include remove actions when removeOldAlias is true', async () => {
      const data = [{ alias: 'test-spaces', index: 'test-spaces-20250101' }];

      await (service as any).assignAliasToIndex(data, true);

      const call = mockElasticClient.indices.updateAliases.mock.calls[0][0];
      expect(call.actions).toEqual([
        { remove: { index: '*', alias: 'test-spaces' } },
        { add: { index: 'test-spaces-20250101', alias: 'test-spaces' } },
      ]);
    });

    it('should throw when client is undefined', async () => {
      (service as any).elasticClient = undefined;

      await expect(
        (service as any).assignAliasToIndex([{ alias: 'a', index: 'i' }])
      ).rejects.toThrow('Elasticsearch client not initialized');
    });
  });

  describe('ingestBulk', () => {
    it('should return success false when client is undefined', async () => {
      (service as any).elasticClient = undefined;

      const result = await (service as any).ingestBulk([], 'idx', task);

      expect(result.success).toBe(false);
      expect(result.total).toBe(0);
    });

    it('should return success true with 0 total for empty data', async () => {
      const result = await (service as any).ingestBulk([], 'idx', task);

      expect(result.success).toBe(true);
      expect(result.total).toBe(0);
    });

    it('should call bulk with operations and return success', async () => {
      const data = [
        { id: '1', name: 'doc1' },
        { id: '2', name: 'doc2' },
      ];

      mockElasticClient.bulk.mockResolvedValue({ errors: false, items: [] });

      const result = await (service as any).ingestBulk(
        data,
        'test-index',
        task
      );

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(mockElasticClient.bulk).toHaveBeenCalledWith({
        refresh: true,
        operations: [
          { index: { _index: 'test-index' } },
          { id: '1', name: 'doc1' },
          { index: { _index: 'test-index' } },
          { id: '2', name: 'doc2' },
        ],
      });
    });

    it('should return errored documents when bulk has errors', async () => {
      const data = [{ id: '1' }];

      mockElasticClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          {
            index: {
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      });

      const result = await (service as any).ingestBulk(
        data,
        'test-index',
        task
      );

      expect(result.success).toBe(false);
      expect(result.erroredDocuments).toHaveLength(1);
      expect(result.erroredDocuments[0].status).toBe(400);
    });
  });

  describe('ingestStepCreateIndices', () => {
    it('should throw when index creation is not acknowledged', async () => {
      vi.spyOn(service as any, 'ensureIndicesExist').mockResolvedValue({
        acknowledged: false,
        message: 'creation failed',
      });

      await expect(
        (service as any).ingestStepCreateIndices(task, suffix)
      ).rejects.toThrow('Failed to create indices: creation failed');
    });

    it('should succeed when acknowledged', async () => {
      vi.spyOn(service as any, 'ensureIndicesExist').mockResolvedValue({
        acknowledged: true,
      });

      await expect(
        (service as any).ingestStepCreateIndices(task, suffix)
      ).resolves.toBeUndefined();
      expect(mockTaskService.updateTaskResults).toHaveBeenCalledWith(
        task.id,
        'Indices created'
      );
    });
  });

  describe('ingestStepIngestIntoIndices', () => {
    it('should throw when ingest fails', async () => {
      vi.spyOn(service as any, 'ingest').mockRejectedValue(
        new Error('ingest boom')
      );

      await expect(
        (service as any).ingestStepIngestIntoIndices(task, suffix)
      ).rejects.toThrow('Ingest completed with errors: ingest boom');
    });

    it('should succeed when ingest works', async () => {
      vi.spyOn(service as any, 'ingest').mockResolvedValue({});

      await expect(
        (service as any).ingestStepIngestIntoIndices(task, suffix)
      ).resolves.toBeUndefined();
    });
  });

  describe('ingestStepDeleteOldIndices', () => {
    it('should throw when removal is not acknowledged', async () => {
      vi.spyOn(service as any, 'removeIndices').mockResolvedValue({
        acknowledged: false,
        message: 'delete failed',
      });

      await expect(
        (service as any).ingestStepDeleteOldIndices(task, ['old-idx'])
      ).rejects.toThrow('Failed to delete old indices: delete failed');
    });

    it('should succeed when removal is acknowledged', async () => {
      vi.spyOn(service as any, 'removeIndices').mockResolvedValue({
        acknowledged: true,
      });

      await expect(
        (service as any).ingestStepDeleteOldIndices(task, ['old-idx'])
      ).resolves.toBeUndefined();
    });
  });

  describe('ingestStepAssignAliases', () => {
    it('should return active alias data and call assignAliasToIndex with no removal for fresh setup', async () => {
      vi.spyOn(service as any, 'getActiveAliases').mockResolvedValue([]);
      const assignSpy = vi
        .spyOn(service as any, 'assignAliasToIndex')
        .mockResolvedValue(undefined);

      const result = await (service as any).ingestStepAssignAliases(
        task,
        suffix
      );

      expect(result).toEqual([]);
      expect(assignSpy).toHaveBeenCalled();
      // When no aliases exist, aliasesExist is false
      const call = assignSpy.mock.calls[0];
      expect(call[1]).toBe(false); // removeOldAlias = false
    });

    it('should call assignAliasToIndex with removal when aliases exist', async () => {
      vi.spyOn(service as any, 'getActiveAliases').mockResolvedValue([
        { index: 'old-idx', alias: 'test-spaces' },
      ]);
      const assignSpy = vi
        .spyOn(service as any, 'assignAliasToIndex')
        .mockResolvedValue(undefined);

      const result = await (service as any).ingestStepAssignAliases(
        task,
        suffix
      );

      expect(result).toHaveLength(1);
      const call = assignSpy.mock.calls[0];
      expect(call[1]).toBe(true); // removeOldAlias = true
    });
  });

  describe('ingest', () => {
    it('should return N/A result when client is undefined', async () => {
      (service as any).elasticClient = undefined;

      const result = await (service as any).ingest(task, suffix);

      expect(result['N/A']).toBeDefined();
      expect(result['N/A'].batches[0].success).toBe(false);
    });

    it('should process all entity types', async () => {
      // All counts return 0, so we get quick success for each
      mockEntityManager.count.mockResolvedValue(0);

      const _result = await (service as any).ingest(task, suffix);

      // 9 ingest params (L0, L1, L2, orgs, users, callouts, posts, whiteboards, memos)
      // count is called for each
      expect(mockEntityManager.count).toHaveBeenCalled();
    });
  });

  describe('fetchAndIngest', () => {
    it('should return early with 0 message when count is 0', async () => {
      const fetchFn = vi.fn();
      const countFn = vi.fn().mockResolvedValue(0);

      const result = await (service as any).fetchAndIngest(
        'test-index',
        fetchFn,
        countFn,
        100,
        task
      );

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(0);
      expect(result[0].success).toBe(true);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and ingest in batches', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([]);
      const countFn = vi.fn().mockResolvedValue(2);

      mockElasticClient.bulk.mockResolvedValue({ errors: false, items: [] });

      const result = await (service as any).fetchAndIngest(
        'test-index',
        fetchFn,
        countFn,
        2,
        task
      );

      expect(fetchFn).toHaveBeenCalledTimes(2); // one batch of 2, one for start=2
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateSuffix', () => {
    it('should return a date-based suffix in YYYYMMDDHHmmss format', () => {
      // Restore the spy so we test the real method
      vi.restoreAllMocks();

      const realSuffix = (service as any).generateSuffix();

      // Should be 14 chars of digits
      expect(realSuffix).toMatch(/^\d{14}$/);
    });
  });

  describe('entity fetch methods', () => {
    const makeSpace = (overrides: Record<string, any> = {}) => ({
      id: 'space-1',
      level: 0,
      visibility: 'active',
      about: {
        why: 'why',
        who: 'who',
        profile: {
          displayName: 'Test Space',
          tagline: 'tagline',
          description: 'desc',
          location: { city: 'Berlin', country: 'DE' },
          tagsets: [{ tags: ['tag1', 'tag2'] }],
        },
      },
      ...overrides,
    });

    describe('fetchSpacesLevel0', () => {
      it('should transform spaces to search documents with SPACE type', async () => {
        const space = makeSpace();
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchSpacesLevel0(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('space');
        expect(result[0].spaceID).toBe('space-1');
        expect(result[0].account).toBeUndefined();
        expect(result[0].profile.tags).toBe('tag1 tag2');
        expect(result[0].profile.tagsets).toBeUndefined();
      });
    });

    describe('fetchSpacesLevel1', () => {
      it('should transform L1 spaces with parent spaceID', async () => {
        const space = makeSpace({
          level: 1,
          parentSpace: { id: 'parent-space-1' },
        });
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchSpacesLevel1(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('subspace');
        expect(result[0].spaceID).toBe('parent-space-1');
        expect(result[0].parentSpace).toBeUndefined();
      });

      it('should use N/A when parentSpace is missing', async () => {
        const space = makeSpace({ level: 1, parentSpace: undefined });
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchSpacesLevel1(0, 100);

        expect(result[0].spaceID).toBe('N/A');
      });
    });

    describe('fetchSpacesLevel2', () => {
      it('should resolve grandparent spaceID', async () => {
        const space = makeSpace({
          level: 2,
          parentSpace: {
            id: 'l1-space',
            parentSpace: { id: 'l0-space' },
          },
        });
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchSpacesLevel2(0, 100);

        expect(result[0].type).toBe('subspace');
        expect(result[0].spaceID).toBe('l0-space');
      });

      it('should use N/A when grandparent is missing', async () => {
        const space = makeSpace({
          level: 2,
          parentSpace: { id: 'l1-space', parentSpace: undefined },
        });
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchSpacesLevel2(0, 100);

        expect(result[0].spaceID).toBe('N/A');
      });
    });

    describe('fetchOrganizations', () => {
      it('should transform organizations to search documents', async () => {
        const org = {
          id: 'org-1',
          profile: {
            displayName: 'Org',
            tagline: 'tagline',
            description: 'desc',
            location: { city: 'Berlin', country: 'DE' },
            tagsets: [{ tags: ['org-tag'] }],
          },
        };
        mockEntityManager.find.mockResolvedValue([org]);

        const result = await (service as any).fetchOrganizations(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('organization');
        expect(result[0].profile.tags).toBe('org-tag');
      });
    });

    describe('fetchUsers', () => {
      it('should transform users and strip sensitive data', async () => {
        const user = {
          id: 'user-1',
          email: 'user@test.com',
          phone: '123',
          serviceProfile: false,
          profile: {
            displayName: 'User',
            tagline: 'tagline',
            description: 'desc',
            location: { city: 'Berlin', country: 'DE' },
            tagsets: [{ tags: ['user-tag'] }],
          },
        };
        mockEntityManager.find.mockResolvedValue([user]);

        const result = await (service as any).fetchUsers(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('user');
        expect(result[0].email).toBeUndefined();
        expect(result[0].phone).toBeUndefined();
        expect(result[0].serviceProfile).toBeUndefined();
      });
    });

    describe('fetchCallout', () => {
      it('should transform callouts with space context', async () => {
        const space = {
          id: 'space-1',
          visibility: 'active',
          parentSpace: undefined,
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  createdBy: 'user-1',
                  createdDate: new Date(),
                  nameID: 'callout-name',
                  framing: {
                    profile: {
                      displayName: 'Callout',
                      tagline: 'callout-tagline',
                      description: 'desc',
                      tagsets: [{ tags: ['callout-tag'] }],
                    },
                  },
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchCallout(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('callout');
        expect(result[0].spaceID).toBe('space-1');
        expect(result[0].collaborationID).toBe('collab-1');
      });

      it('should resolve spaceID from parentSpace chain', async () => {
        const space = {
          id: 'l1-space',
          visibility: 'active',
          parentSpace: { id: 'l0-space', parentSpace: undefined },
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  framing: {
                    profile: { tagsets: [] },
                  },
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchCallout(0, 100);

        expect(result[0].spaceID).toBe('l0-space');
      });
    });

    describe('fetchWhiteboard', () => {
      it('should transform framing whiteboards with extracted text', async () => {
        const excalidrawContent = JSON.stringify({
          elements: [{ type: 'text', originalText: 'Hello World' }],
        });

        const space = {
          id: 'space-1',
          visibility: 'active',
          parentSpace: undefined,
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  framing: {
                    whiteboard: {
                      id: 'wb-1',
                      content: excalidrawContent,
                      profile: {
                        displayName: 'WB',
                        tagsets: [],
                      },
                    },
                  },
                  contributions: [],
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchWhiteboard(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('whiteboard');
        expect(result[0].content).toBe('Hello World');
      });

      it('should skip whiteboards with no content', async () => {
        const space = {
          id: 'space-1',
          visibility: 'active',
          parentSpace: undefined,
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  framing: {
                    whiteboard: {
                      id: 'wb-1',
                      content: '',
                      profile: { displayName: 'WB', tagsets: [] },
                    },
                  },
                  contributions: [],
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchWhiteboard(0, 100);

        // Empty content means no whiteboard ingested
        expect(result).toHaveLength(0);
      });

      it('should include contribution whiteboards', async () => {
        const excalidrawContent = JSON.stringify({
          elements: [{ type: 'text', originalText: 'Contribution text' }],
        });

        const space = {
          id: 'space-1',
          visibility: 'active',
          parentSpace: undefined,
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  framing: { whiteboard: null },
                  contributions: [
                    {
                      whiteboard: {
                        id: 'wb-2',
                        content: excalidrawContent,
                        profile: { displayName: 'WB2', tagsets: [] },
                      },
                    },
                  ],
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchWhiteboard(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].content).toBe('Contribution text');
      });
    });

    describe('fetchPosts', () => {
      it('should transform posts from contributions', async () => {
        const space = {
          id: 'space-1',
          visibility: 'active',
          parentSpace: undefined,
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  contributions: [
                    {
                      post: {
                        id: 'post-1',
                        createdBy: 'user-1',
                        nameID: 'post-name',
                        profile: {
                          displayName: 'Post',
                          tagsets: [{ tags: ['post-tag'] }],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchPosts(0, 100);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('post');
        expect(result[0].spaceID).toBe('space-1');
        expect(result[0].profile.tags).toBe('post-tag');
      });

      it('should skip contributions without post', async () => {
        const space = {
          id: 'space-1',
          visibility: 'active',
          parentSpace: undefined,
          collaboration: {
            id: 'collab-1',
            calloutsSet: {
              callouts: [
                {
                  id: 'callout-1',
                  contributions: [{ post: undefined }],
                },
              ],
            },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchPosts(0, 100);

        expect(result).toHaveLength(0);
      });
    });

    describe('fetchMemo', () => {
      it('should return empty for spaces with no callouts', async () => {
        const space = {
          id: 'space-1',
          visibility: 'active',
          collaboration: {
            calloutsSet: { callouts: undefined },
          },
        };
        mockEntityManager.find.mockResolvedValue([space]);

        const result = await (service as any).fetchMemo(0, 100);

        expect(result).toEqual([]);
      });
    });

    describe('count methods', () => {
      it('fetchSpacesLevel0Count should count L0 active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(5);
        const result = await (service as any).fetchSpacesLevel0Count();
        expect(result).toBe(5);
        expect(mockEntityManager.count).toHaveBeenCalled();
      });

      it('fetchSpacesLevel1Count should count L1 active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(3);
        const result = await (service as any).fetchSpacesLevel1Count();
        expect(result).toBe(3);
      });

      it('fetchSpacesLevel2Count should count L2 active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(2);
        const result = await (service as any).fetchSpacesLevel2Count();
        expect(result).toBe(2);
      });

      it('fetchOrganizationsCount should count organizations', async () => {
        mockEntityManager.count.mockResolvedValue(10);
        const result = await (service as any).fetchOrganizationsCount();
        expect(result).toBe(10);
      });

      it('fetchUsersCount should count non-service users', async () => {
        mockEntityManager.count.mockResolvedValue(20);
        const result = await (service as any).fetchUsersCount();
        expect(result).toBe(20);
      });

      it('fetchCalloutCount should count active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(7);
        const result = await (service as any).fetchCalloutCount();
        expect(result).toBe(7);
      });

      it('fetchPostsCount should count active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(4);
        const result = await (service as any).fetchPostsCount();
        expect(result).toBe(4);
      });

      it('fetchWhiteboardCount should count active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(6);
        const result = await (service as any).fetchWhiteboardCount();
        expect(result).toBe(6);
      });

      it('fetchMemoCount should count active spaces', async () => {
        mockEntityManager.count.mockResolvedValue(8);
        const result = await (service as any).fetchMemoCount();
        expect(result).toBe(8);
      });
    });
  });
});
