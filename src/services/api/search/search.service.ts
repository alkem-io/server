import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Space } from '@domain/space/space/space.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchExtractService } from './extract/search.extract.service';
import { SearchResultService } from './result/search.result.service';
import { ISearchResults, SearchInput } from './dto';
import { validateSearchParameters } from '@services/api/search/util';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class SearchService {
  private readonly maxSearchResults: number;
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private searchExtractService: SearchExtractService,
    private searchResultService: SearchResultService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    this.maxSearchResults = this.configService.get('search.max_results', {
      infer: true,
    });
  }

  public async search(
    searchData: SearchInput,
    agentInfo: AgentInfo
  ): Promise<ISearchResults> {
    validateSearchParameters(searchData, {
      maxSearchResults: this.maxSearchResults,
    });
    // check if the Space exists
    try {
      await this.entityManager.findOneByOrFail(Space, {
        nameID: searchData.searchInSpaceFilter,
      });
    } catch (e) {
      throw new EntityNotFoundException(
        'Space with the given identifier not found',
        LogContext.SEARCH,
        { searchInSpaceFilter: searchData.searchInSpaceFilter }
      );
    }
    // search only in the public available data if the user is not authenticated
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
