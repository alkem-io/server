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

    // T006 [US1] — terms population from hit.matched_queries (FR-001/005/008).
    // The clause names ES echoes back in matched_queries are encoded ordinals
    // (term_0, term_1, ...) over the de-duplicated query tokens, so a single-word
    // query 'test' tokenizes to ['test'] -> the only clause name is 'term_0'.
    it('populates terms from hit.matched_queries decoded into query tokens', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 5.0,
                  fields: { id: ['space-1'], type: [SearchResultType.SPACE] },
                  matched_queries: ['term_0'],
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

      expect(result[0].terms).toEqual(['test']);
    });

    it('returns terms in query order, de-duplicated, for a multi-token query', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 5.0,
                  fields: { id: ['space-1'], type: [SearchResultType.SPACE] },
                  // ES reports names out of order; only first + third token hit
                  matched_queries: ['term_2', 'term_0'],
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        // 'open' duplicated -> tokenizes to ['open','source','governance']
        terms: ['open source open governance'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any);

      // term_0 -> 'open', term_2 -> 'governance'; query order preserved
      expect(result[0].terms).toEqual(['open', 'governance']);
    });

    it('returns terms: [] when a hit has no matched_queries (FR-008)', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'hit-1',
                  _score: 5.0,
                  fields: { id: ['space-1'], type: [SearchResultType.SPACE] },
                  // no matched_queries field at all
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

      expect(result[0].terms).toEqual([]);
    });

    it('threads the ordered attribution tokens into the ES query as named boost:0 should clauses', async () => {
      mockClient.msearch.mockResolvedValue({ responses: [] });

      await service.search({
        terms: ['alpha beta'],
        filters: [{ category: SearchCategory.SPACES, size: 5 }],
      } as any);

      const searches = mockClient.msearch.mock.calls[0][0].searches as any[];
      const body = searches[1];
      const should = body.query.bool.should as any[];
      expect(should).toHaveLength(2);
      expect(should.map((c: any) => c.multi_match.query)).toEqual([
        'alpha',
        'beta',
      ]);
      should.forEach((c: any) => expect(c.multi_match.boost).toBe(0));
    });

    // T011 [US2] — deep body-content attribution. matched_queries does not tell
    // us WHICH field matched (FR-010, out of scope); a token that matched only in
    // memo `markdown` / whiteboard `content` is reported identically to a
    // title match. Since fields:['*'] covers body content, a body-only hit still
    // yields the token in terms (SC-002 / FR-002 / FR-006).
    it('attributes a token matched only in memo body content', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'memo-1',
                  _score: 2.0,
                  fields: { id: ['memo-1'], type: [SearchResultType.MEMO] },
                  // 'governance' appeared only inside the memo markdown body
                  matched_queries: ['term_0'],
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['governance'],
        filters: [{ category: SearchCategory.FRAMINGS, size: 5 }],
      } as any);

      expect(result[0].type).toBe(SearchResultType.MEMO);
      expect(result[0].terms).toEqual(['governance']);
    });

    it('attributes a token matched only in whiteboard content', async () => {
      mockClient.msearch.mockResolvedValue({
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'wb-1',
                  _score: 2.0,
                  fields: {
                    id: ['wb-1'],
                    type: [SearchResultType.WHITEBOARD],
                  },
                  matched_queries: ['term_0'],
                },
              ],
            },
          },
        ],
      });

      const result = await service.search({
        terms: ['roadmap'],
        filters: [{ category: SearchCategory.FRAMINGS, size: 5 }],
      } as any);

      expect(result[0].type).toBe(SearchResultType.WHITEBOARD);
      expect(result[0].terms).toEqual(['roadmap']);
    });

    // T014 [US3] — global vs flow-state parity (SC-005 / FR-003). Both paths share
    // buildSearchQuery + processMultiSearchItem, so identical matched_queries
    // yield identical terms whether or not searchInFlowStateFilter is set.
    it('populates terms identically for global and flow-state-scoped searches', async () => {
      const hitResponse = {
        responses: [
          {
            hits: {
              hits: [
                {
                  _id: 'callout-1',
                  _score: 4.0,
                  fields: {
                    id: ['callout-1'],
                    type: [SearchResultType.CALLOUT],
                  },
                  matched_queries: ['term_0'],
                },
              ],
            },
          },
        ],
      };

      mockClient.msearch.mockResolvedValue(hitResponse);
      const globalResult = await service.search({
        terms: ['governance'],
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      mockClient.msearch.mockResolvedValue(hitResponse);
      const flowStateResult = await service.search({
        terms: ['governance'],
        searchInFlowStateFilter: 'fs-uuid',
        filters: [{ category: SearchCategory.COLLABORATION_TOOLS, size: 10 }],
      } as any);

      expect(globalResult[0].terms).toEqual(['governance']);
      expect(flowStateResult[0].terms).toEqual(globalResult[0].terms);
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
