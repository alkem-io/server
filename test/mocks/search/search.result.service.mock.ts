import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { SearchResultService } from '@services/api/search2/search.result.service';

export const MockSearchResultsService: ValueProvider<
  PublicPart<SearchResultService>
> = {
  provide: SearchResultService,
  useValue: {
    getPostSearchResults: jest.fn(),
    getSpaceSearchResults: jest.fn(),
    getOrganizationSearchResults: jest.fn(),
    getUserSearchResults: jest.fn(),
    resolveSearchResults: jest.fn(),
  },
};
