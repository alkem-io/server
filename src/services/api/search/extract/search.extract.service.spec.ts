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
