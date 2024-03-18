import { Injectable } from '@nestjs/common';
import { AgentInfo } from '@core/authentication';
import { SearchInput } from '../search';
import { ISearchResults } from '../search/dto/search.result.dto';
import { SearchExtractService } from './search.extract.service';
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
    const onlyPublicResults = !agentInfo.email;
    const searchResults = await this.searchExtractService.search(
      searchData,
      onlyPublicResults
    );
    return this.searchResultService.resolveSearchResults(
      searchResults,
      agentInfo,
      searchData.searchInSpaceFilter
    );
  }
}
