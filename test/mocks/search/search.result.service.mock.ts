import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { SearchResultService } from '@services/api/search/result/search.result.service';

export const MockSearchResultsService: ValueProvider<
  PublicPart<SearchResultService>
> = {
  provide: SearchResultService,
  useValue: {
    getPostSearchResults: vi.fn(),
    getSpaceSearchResults: vi.fn(),
    getOrganizationSearchResults: vi.fn(),
    getUserSearchResults: vi.fn(),
    resolveSearchResults: vi.fn(),
  },
};
