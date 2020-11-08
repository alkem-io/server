import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchInput } from './search-input.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGroup } from '../../domain/user-group/user-group.entity';
import { User } from '../../domain/user/user.entity';
import { SearchResultEntry } from './search-result-entry.dto';
import { ISearchResultEntry } from './search-result-entry.interface';

enum SearchEntityTypes {
  User = 'user',
  Group = 'group',
}

const SEARCH_ENTITIES: string[] = [
  SearchEntityTypes.User,
  SearchEntityTypes.Group,
];
const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;

export class SearchService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async search(searchData: SearchInput): Promise<ISearchResultEntry[]> {
    this.validateSearchParameters(searchData);

    // Only support certain features for now
    if (searchData.challengesFilter)
      throw new Error('Filtering by challenges not yet implemented');
    if (searchData.tagsetNames)
      throw new Error('Searching on tagsets not yet implemented');

    // Ok - do the search!
    const results: ISearchResultEntry[] = [];
    const terms = searchData.terms;
    // By default search all entity types
    let searchUsers = true;
    let searchGroups = true;
    const entityTypesFilter = searchData.typesFilter;
    if (entityTypesFilter && entityTypesFilter.length > 0) {
      if (!entityTypesFilter.includes(SearchEntityTypes.User))
        searchUsers = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.Group))
        searchGroups = false;
    }
    for (let t = 0; t < terms.length; t++) {
      const term = terms[t];

      if (searchUsers) {
        const userMatches = await this.userRepository
          .createQueryBuilder('user')
          .where('user.firstName = :term')
          .setParameters({ term: `${term}` })
          .getMany();
        // Create results for each match
        for (let i = 0; i < userMatches.length; i++) {
          const matchedUser = userMatches[i];
          const resultEntry = new SearchResultEntry();
          resultEntry.result = matchedUser;
          results.push(resultEntry);
        }
      }

      if (searchGroups) {
        const groupMatches = await this.groupRepository
          .createQueryBuilder('group')
          .where('group.name = :term')
          .setParameters({ term: `${term}` })
          .getMany();
        // Create results for each match
        for (let i = 0; i < groupMatches.length; i++) {
          const matchedGroup = groupMatches[i];
          const resultEntry = new SearchResultEntry();
          resultEntry.result = matchedGroup;
          results.push(resultEntry);
        }
      }
    }

    this.logger.verbose(
      `Executed search query: ${results.length} results found`
    );

    return results;
  }

  validateSearchParameters(searchData: SearchInput) {
    if (searchData.terms.length > SEARCH_TERM_LIMIT)
      throw new Error(
        `Maximum number of search terms is ${SEARCH_TERM_LIMIT}; supplied: ${searchData.terms.length}`
      );
    // Check limit on tagsets that can be searched
    const tagsetNames = searchData.tagsetNames;
    if (tagsetNames && tagsetNames.length > TAGSET_NAMES_LIMIT)
      throw new Error(
        `Maximum number of tagset names is ${TAGSET_NAMES_LIMIT}; supplied: ${tagsetNames.length}`
      );
    // Check only allowed entity types supplied
    const entityTypes = searchData.typesFilter;
    if (entityTypes) {
      entityTypes.forEach(entityType => {
        if (!SEARCH_ENTITIES.includes(entityType))
          throw new Error(`Not allowed typeFilter encountered: ${entityType}`);
      });
    }
  }
}
