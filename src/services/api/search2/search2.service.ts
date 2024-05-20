import { EntityManager } from 'typeorm';
import { isUUID } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Space } from '@domain/space/space/space.entity';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchInput } from '../search';
import { ISearchResults } from '../search/dto/search.result.dto';
import { SearchExtractService } from './search.extract.service';
import { SearchResultService } from './search.result.service';

@Injectable()
export class Search2Service {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private searchExtractService: SearchExtractService,
    private searchResultService: SearchResultService
  ) {}

  public async search(
    searchData: SearchInput,
    agentInfo: AgentInfo
  ): Promise<ISearchResults> {
    const onlyPublicResults = !agentInfo.email;
    if (
      searchData.searchInSpaceFilter &&
      !isUUID(searchData.searchInSpaceFilter)
    ) {
      await this.entityManager
        .findOneByOrFail(Space, {
          nameID: searchData.searchInSpaceFilter,
        })
        .then(({ id }) => (searchData.searchInSpaceFilter = id))
        .catch(() => {
          throw new EntityNotFoundException(
            'Space with the given identifier not found',
            LogContext.SEARCH,
            {
              message: `Space with the given identifier not found: ${searchData.searchInSpaceFilter}`,
            }
          );
        });
    }
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
