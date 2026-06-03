import { ActorContext } from '@core/actor-context/actor.context';
import { ConfigService } from '@nestjs/config';
import { ISearchResults } from '@services/api/search/dto/results';
import { SearchCategory } from '@services/api/search/search.category';
import { SearchService } from '@services/api/search/search.service';
import { LoggerService } from '@nestjs/common';
import { AlkemioConfig } from '@src/types';
import { vi } from 'vitest';
import { SearchContentTool } from './search-content.tool';

/**
 * Regression: search_content requests EVERY category, so its per-category size
 * must be the platform budget (`search.max_results`) divided across the
 * categories — mirroring search.extract.service. Before the fix the default
 * size (10) × categories (5) = 50 exceeded the 40 cap, so
 * `validateSearchParameters` rejected EVERY call: search was unusable the moment
 * Elasticsearch was actually configured. These tests pin the invariant — the
 * summed per-category size never exceeds the configured max, whatever limit the
 * caller (the model) supplies, and the budget is actually used.
 */
describe('SearchContentTool — per-category size stays within the platform cap', () => {
  const CATEGORIES = Object.values(SearchCategory).length;

  const buildTool = (max: number) => {
    const search = vi.fn().mockResolvedValue({} as ISearchResults);
    const searchService = { search } as unknown as SearchService;
    const configService = {
      get: vi.fn().mockReturnValue(max),
    } as unknown as ConfigService<AlkemioConfig, true>;
    const logger = {
      verbose: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerService;
    const tool = new SearchContentTool(searchService, configService, logger);
    return { tool, search };
  };

  const actorContext = Object.assign(new ActorContext(), { actorID: 'actor-1' });

  const filtersOf = (search: ReturnType<typeof vi.fn>) =>
    search.mock.calls[0][0].filters as { category: string; size: number }[];
  const totalSize = (search: ReturnType<typeof vi.fn>) =>
    filtersOf(search).reduce((sum, f) => sum + f.size, 0);

  it('default (no limit) never exceeds the configured max across categories', async () => {
    const { tool, search } = buildTool(40);
    const res = await tool.execute({ query: 'sprint' }, actorContext);

    expect(res.isError).toBeFalsy();
    expect(totalSize(search)).toBeLessThanOrEqual(40);
    // The budget is actually used: each of the categories gets floor(max / N).
    expect(filtersOf(search).every(f => f.size === Math.floor(40 / CATEGORIES)));
    expect(filtersOf(search)).toHaveLength(CATEGORIES);
  });

  it('clamps an oversized caller limit back under the cap', async () => {
    const { tool, search } = buildTool(40);
    await tool.execute({ query: 'sprint', limit: 1000 }, actorContext);
    expect(totalSize(search)).toBeLessThanOrEqual(40);
  });

  it('honours a smaller per-category limit from the caller', async () => {
    const { tool, search } = buildTool(40);
    await tool.execute({ query: 'sprint', limit: 2 }, actorContext);
    expect(filtersOf(search).every(f => f.size === 2)).toBe(true);
    expect(totalSize(search)).toBe(2 * CATEGORIES);
  });

  it('tracks a different configured max (lower budget)', async () => {
    const { tool, search } = buildTool(20);
    await tool.execute({ query: 'x' }, actorContext);
    expect(totalSize(search)).toBeLessThanOrEqual(20);
  });
});
