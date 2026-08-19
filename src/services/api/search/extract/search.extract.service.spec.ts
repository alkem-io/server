import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { SearchCategory } from '../search.category';
import { SearchResultType } from '../search.result.type';
import { SearchExtractService } from './search.extract.service';

describe('SearchExtractService', () => {
  let service: SearchExtractService;
  let mockClient: { msearch: Mock };

  const configServiceMock = {
    get: vi.fn((key: string) => {
      if (key === 'search.index_pattern') return 'test-';
      if (key === 'search.max_results') return 20;
      return undefined;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockClient = {
      msearch: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchExtractService,
        {
          provide: ELASTICSEARCH_CLIENT_PROVIDER,
          useValue: mockClient,
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

    service = module.get(SearchExtractService);
  });

  describe('search', () => {
    it('should throw when elasticsearch client is not initialized', async () => {
      // Build a service with no client
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SearchExtractService,
          {
            provide: ELASTICSEARCH_CLIENT_PROVIDER,
            useValue: undefined,
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

      const noClientService = module.get(SearchExtractService);

      await expect(
        noClientService.search({
          terms: ['test'],
          filters: [{ category: SearchCategory.SPACES, size: 5 }],
        } as any)
      ).rejects.toThrow('Elasticsearch client not initialized');
    });

    it('should return empty array when no indices match the filters', async () => {
      // Use onlyPublicResults = true with a category that has no public indices (CONTRIBUTORS)
      const result = await service.search(
        {
          terms: ['test'],
          filters: [{ category: SearchCategory.CONTRIBUTORS, size: 5 }],
        } as any,
        true // onlyPublicResults
      );

      expect(result).toEqual([]);
      expect(mockClient.msearch).not.toHaveBeenCalled();
    });

    it('should execute msearch and process results for valid filters', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 5.0,
                  fields: { id: ['space-1'], type: [SearchResultType.SPACE] },
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any);

      expect(mockClient.msearch).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'hit-1',
          score: 5.0,
          type: SearchResultType.SPACE,
        })
      );
    });

    it('should handle elastic error responses by filtering them out', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            // ElasticError response
            status: 400,
            error: { type: 'search_phase_execution_exception', reason: 'fail' },
          },
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 3.0,
                  fields: { id: ['user-1'], type: [SearchResultType.USER] },
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['test'],
        filters: [
          { category: SearchCategory.SPACES, size: 5 },
          { category: SearchCategory.CONTRIBUTORS, size: 5 },
        ],
      } as any);

      // Error response should be filtered out, only the valid hit remains
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hit-1');
    });

    it('should extract deduplicated matched terms from highlight fragments (server#3702)', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 5.0,
                  fields: { id: ['memo-1'], type: [SearchResultType.MEMO] },
                  highlight: {
                    markdown: [
                      'notes on <em>governance</em> and more <em>governance</em>',
                      'the <em>board</em> decided',
                    ],
                    'profile.displayName.text': ['<em>Governance</em> memo'],
                  },
                },
                {
                  _id: 'hit-2',
                  _score: 3.0,
                  fields: { id: ['space-1'], type: [SearchResultType.SPACE] },
                  // no highlight on the hit (e.g. only fields without a
                  // retrievable copy matched) -> terms stays empty
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['governance board'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any);

      expect(result).toHaveLength(2);
      // lowercased + deduplicated across fields and fragments
      expect(result[0].terms).toEqual(['governance', 'board']);
      expect(result[1].terms).toEqual([]);
    });

    it('should handle search results with missing entity id gracefully', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 1.0,
                  fields: {}, // no id field
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].result.id).toBe('N/A');
    });

    // T011: scope wiring — proves the flow-state scope reaches the ES query as a
    // "field-absent OR field-equals" term filter (the mechanism that guarantees
    // zero cross-scope leakage, SC-003). The flow-state UUID is globally unique
    // and transitively pins the collaboration, so it is the sole scope filter.
    // Full end-to-end leakage verification needs a live Elasticsearch index.
    it('wires flowState scope into the msearch query as a term filter', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        searchInFlowStateFilter: 'fs-uuid',
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      expect(mockClient.msearch).toHaveBeenCalledTimes(1);
      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      // body is the second item (header, body, header, body, ...)
      const body = searches[1];
      const must = body.query.bool.filter.bool.must;
      const termFields = must.map((c: any) => c.bool.should[1].term);
      expect(termFields).toEqual(
        expect.arrayContaining([{ flowStateID: 'fs-uuid' }])
      );
    });

    // T015: pagination wiring — proves the keyset cursor reaches ES as
    // search_after and the requested page size is honored.
    it('passes the keyset cursor as search_after and honors the page size', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        searchInFlowStateFilter: 'fs-uuid',
        filters: [
          {
            category: SearchCategory.COLLABORATION_TOOLS,
            size: 10,
            cursor: '4.2::callout-9',
          },
        ],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      const body = searches[1];
      // cursor "score::id" -> search_after [score, id]
      expect(body.search_after).toEqual([4.2, 'callout-9']);
      // sort is the keyset sort the cursor pages on
      expect(body.sort).toEqual({ _score: 'desc', id: 'desc' });
    });

    it('omits the scope filter entirely when no scope is provided (backward compatible global search)', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      const body = searches[1];
      expect(body.query.bool.filter).toBeUndefined();
    });

    it('keeps Callout search scoped to the callouts index when foldCalloutResources is off', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      // headers are the even items; collect every index targeted
      const indices = searches
        .filter((_item, i) => i % 2 === 0)
        .flatMap(header => header.index);
      expect(indices).toEqual(['test-callouts']);
    });

    it('widens a Callout search to post/whiteboard/memo indices when foldCalloutResources is on', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        foldCalloutResources: true,
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      const indices = searches
        .filter((_item, i) => i % 2 === 0)
        .flatMap(header => header.index);
      // callouts plus the fold-up resource indices, each at most once
      expect(indices).toEqual(
        expect.arrayContaining([
          'test-callouts',
          'test-posts',
          'test-whiteboards',
          'test-memos',
        ])
      );
      // single whiteboards/memos index covers both framing and contributions
      expect(indices.filter(name => name === 'test-whiteboards')).toHaveLength(
        1
      );
      expect(indices.filter(name => name === 'test-memos')).toHaveLength(1);
    });

    it('folds the resource indices into a single collaboration-tools sub-query so one cursor paginates them', async () => {
      // msearch groups indices by category into independent sub-queries, each
      // with its OWN search_after. The fold exposes a single callout-level
      // cursor; if the resource indices formed separate sub-queries their
      // search_after would never be populated and they would restart at hit 0
      // every page (endless client scroll on contributions). All fold indices
      // must therefore land in ONE search request (one header).
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        foldCalloutResources: true,
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      const headers = searches.filter((_item, i) => i % 2 === 0);
      // exactly one sub-query (one header + one body)
      expect(headers).toHaveLength(1);
      expect(searches).toHaveLength(2);
      // that single sub-query targets every fold index
      expect(headers[0].index).toEqual(
        expect.arrayContaining([
          'test-callouts',
          'test-posts',
          'test-whiteboards',
          'test-memos',
        ])
      );
    });

    it('does not widen non-Callout searches even when foldCalloutResources is on', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['governance'],
        foldCalloutResources: true,
        filters: [{ category: SearchCategory.SPACES, size: 10 }],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      const indices = searches
        .filter((_item, i) => i % 2 === 0)
        .flatMap(header => header.index);
      expect(indices).not.toContain('test-posts');
      expect(indices).not.toContain('test-callouts');
    });

    it('should handle search results with _ignored fields', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 2.0,
                  fields: { id: ['space-1'], type: [SearchResultType.SPACE] },
                  _ignored: ['some.field'],
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['test'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any);

      // Should still return the result despite ignored fields
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hit-1');
    });
  });
});
