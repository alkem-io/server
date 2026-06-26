import { ActorContext } from '@core/actor-context/actor.context';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISearchResults } from '@services/api/search/dto/results';
import { SearchCategory } from '@services/api/search/search.category';
import { SearchService } from '@services/api/search/search.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
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
    const urlGeneratorService = {
      getWhiteboardUrlPath: vi.fn(),
      getMemoUrlPath: vi.fn(),
      getPostUrlPath: vi.fn(),
      getCalloutUrlPath: vi.fn(),
      getSpaceUrlPathByID: vi.fn(),
      createUrlForUserNameID: vi.fn(),
      createUrlForOrganizationNameID: vi.fn(),
    } as unknown as UrlGeneratorService;
    const tool = new SearchContentTool(
      searchService,
      configService,
      urlGeneratorService,
      logger
    );
    return { tool, search, urlGeneratorService };
  };

  const actorContext = Object.assign(new ActorContext(), {
    actorID: 'actor-1',
  });

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
    expect(
      filtersOf(search).every(f => f.size === Math.floor(40 / CATEGORIES))
    );
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

/**
 * Regression for the broken-assistant-links lane: search_content must surface a
 * real, browser-openable web `url` (built by the platform UrlGeneratorService)
 * for each match — NEVER the old custom `alkemio://...` scheme that no browser
 * can open. URL resolution is best-effort: one unresolvable entity must degrade
 * to no link instead of failing the whole tool result.
 */
describe('SearchContentTool — emits a real web url, never alkemio://', () => {
  const actorContext = Object.assign(new ActorContext(), {
    actorID: 'actor-1',
  });

  const buildToolWithResults = (results: unknown[]) => {
    const search = vi.fn().mockResolvedValue({
      framingResults: { results },
    } as unknown as ISearchResults);
    const searchService = { search } as unknown as SearchService;
    const configService = {
      get: vi.fn().mockReturnValue(40),
    } as unknown as ConfigService<AlkemioConfig, true>;
    const logger = {
      verbose: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerService;
    const getWhiteboardUrlPath = vi.fn();
    const urlGeneratorService = {
      getWhiteboardUrlPath,
      getMemoUrlPath: vi.fn(),
      getPostUrlPath: vi.fn(),
      getCalloutUrlPath: vi.fn(),
      getSpaceUrlPathByID: vi.fn(),
      createUrlForUserNameID: vi.fn(),
      createUrlForOrganizationNameID: vi.fn(),
    } as unknown as UrlGeneratorService;
    const tool = new SearchContentTool(
      searchService,
      configService,
      urlGeneratorService,
      logger
    );
    return { tool, getWhiteboardUrlPath };
  };

  const parseMatches = (res: { content: { text: string }[] }) =>
    JSON.parse(res.content[0].text).matches as {
      url?: string;
      uri?: string;
    }[];

  it('returns the UrlGeneratorService web url and no alkemio:// uri', async () => {
    const { tool, getWhiteboardUrlPath } = buildToolWithResults([
      {
        id: 'es-doc-1',
        score: 1,
        type: 'whiteboard',
        whiteboard: {
          id: 'wb-1',
          nameID: 'my-board',
          profile: { displayName: 'My Board' },
        },
      },
    ]);
    (getWhiteboardUrlPath as ReturnType<typeof vi.fn>).mockResolvedValue(
      'http://localhost:3000/space/collaboration/cool/whiteboards/my-board'
    );

    const res = (await tool.execute({ query: 'board' }, actorContext)) as {
      content: { text: string }[];
    };
    const matches = parseMatches(res);

    expect(getWhiteboardUrlPath).toHaveBeenCalledWith('wb-1', 'my-board');
    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBe(
      'http://localhost:3000/space/collaboration/cool/whiteboards/my-board'
    );
    expect(matches[0].uri).toBeUndefined();
    expect(JSON.stringify(matches)).not.toContain('alkemio://');
  });

  it('degrades to no url (never throws) when resolution fails', async () => {
    const { tool, getWhiteboardUrlPath } = buildToolWithResults([
      {
        id: 'es-doc-2',
        score: 1,
        type: 'whiteboard',
        whiteboard: { id: 'wb-2', nameID: 'orphan' },
      },
    ]);
    (getWhiteboardUrlPath as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('not found')
    );

    const res = (await tool.execute({ query: 'board' }, actorContext)) as {
      content: { text: string }[];
    };
    const matches = parseMatches(res);

    expect(res.content).toBeDefined();
    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBeUndefined();
  });
});
