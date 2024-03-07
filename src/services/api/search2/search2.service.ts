import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication';
// todo: make types common to both implementations
import { SearchInput } from '../search';
import { ISearchResults } from '../search/dto/search.result.dto';
import { SearchExtractService } from './search.extract';
import { SearchResultService } from './search.result.service';

@Injectable()
export class Search2Service {
  constructor(
    private searchExtractService: SearchExtractService,
    private searchResultService: SearchResultService
  ) {}

  public async search(
    searchData: SearchInput,
    agentInfo: AgentInfo
  ): Promise<ISearchResults> {
    const searchResults = await this.searchExtractService.search(searchData);
    return this.searchResultService.resolveSearchResults(
      searchResults,
      agentInfo
    );
  }
}
