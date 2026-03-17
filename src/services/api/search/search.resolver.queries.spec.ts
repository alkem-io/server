import { createMock } from '@golevelup/ts-vitest';
import { SearchResolverQueries } from './search.resolver.queries';
import { SearchService } from './search.service';

const actorContext = { actorID: 'user-1' } as any;

describe('SearchResolverQueries', () => {
  let resolver: SearchResolverQueries;
  let searchService: ReturnType<typeof createMock<SearchService>>;

  beforeEach(() => {
    searchService = createMock<SearchService>();
    searchService.search.mockResolvedValue({
      spaceResults: [],
    } as any);

    resolver = new SearchResolverQueries(searchService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should delegate to search service', async () => {
    const searchData = { terms: ['test'], filters: [] } as any;
    const result = await resolver.search(actorContext, searchData);
    expect(result).toBeDefined();
    expect(searchService.search).toHaveBeenCalledWith(searchData, actorContext);
  });
});
