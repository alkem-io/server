import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils';
import { SearchExtractService } from '@services/api/search2/search.extract.service';
import { SearchResultService } from '@services/api/search2/search.result.service';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { AgentInfo } from '@core/authentication';
import { ISearchResultChallenge } from '@services/api/search/dto/search.result.dto.entry.challenge';
import { ISearchResults } from '@services/api/search/dto/search.result.dto';

export const MockSearchResultsService: ValueProvider<
  PublicPart<SearchResultService>
> = {
  provide: SearchResultService,
  useValue: {
    getChallengeSearchResults: jest.fn(),
    getOpportunitySearchResults: jest.fn(),
    getPostSearchResults: jest.fn(),
    getSpaceSearchResults: jest.fn(),
    getOrganizationSearchResults: jest.fn(),
    getUserSearchResults: jest.fn(),
    resolveSearchResults: jest.fn(),
  },
};
