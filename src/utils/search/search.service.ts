import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchInput } from './search-input.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGroup } from '../../domain/user-group/user-group.entity';
import { User } from '../../domain/user/user.entity';
import { SearchResultEntry } from './search-result-entry.dto';
import { ISearchResultEntry } from './search-result-entry.interface';
import { LogContexts } from '../logging/logging.contexts';

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
const SCORE_INCREMENT = 10;

class Match {
  key = 0;
  score = 0;
  terms: string[] = [];
  entity: User | UserGroup | undefined;
}

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

    // Use maps to aggregate results as searching; data structure chosen for linear lookup o(1)
    const userResults: Map<number, Match> = new Map();
    const groupResults: Map<number, Match> = new Map();

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
          .leftJoinAndSelect('user.profile', 'profile')
          .where('user.firstName like :term')
          .orWhere('user.lastName like :term')
          .orWhere('user.email like :term')
          .orWhere('user.country like :term')
          .orWhere('user.city like :term')
          .orWhere('profile.description like :term')
          .setParameters({ term: `%${term}%` })
          .getMany();
        // Create results for each match
        for (let i = 0; i < userMatches.length; i++) {
          const matchedUser = userMatches[i];
          const match = new Match();
          match.entity = matchedUser;
          match.terms.push(term);
          match.key = matchedUser.id;
          this.addMatchingResult(userResults, match);
        }
      }

      if (searchGroups) {
        const groupMatches = await this.groupRepository
          .createQueryBuilder('group')
          .leftJoinAndSelect('group.profile', 'profile')
          .where('group.name like :term')
          .orWhere('profile.description like :term')
          .andWhere('group.includeInSearch = true')
          .setParameters({ term: `%${term}%` })
          .getMany();
        // Create results for each match
        for (let i = 0; i < groupMatches.length; i++) {
          const matchedGroup = groupMatches[i];
          const match = new Match();
          match.entity = matchedGroup;
          match.terms.push(term);
          match.key = matchedGroup.id;
          this.addMatchingResult(groupResults, match);
        }
      }
    }

    this.logger.verbose(
      `Executed search query: ${userResults.size} users results and ${groupResults.size} group results found`,
      LogContexts.API
    );

    const results: ISearchResultEntry[] = [];
    userResults.forEach(value => {
      const resultEntry = new SearchResultEntry();
      resultEntry.score = value.score;
      resultEntry.terms = value.terms;
      resultEntry.result = value.entity;
      results.push(resultEntry);
    });

    groupResults.forEach(value => {
      const resultEntry = new SearchResultEntry();
      resultEntry.score = value.score;
      resultEntry.terms = value.terms;
      resultEntry.result = value.entity;
      results.push(resultEntry);
    });

    return results;
  }

  // Add a new results entry or append to an existing entry.
  addMatchingResult(resultsMap: Map<number, Match>, match: Match) {
    const existingMatch = resultsMap.get(match.key);
    if (existingMatch) {
      existingMatch.score = existingMatch.score + SCORE_INCREMENT;
      // also add the term that was matched
      if (match.terms.length != 1)
        throw new Error('Expected exactly one matched term');
      existingMatch.terms.push(match.terms[0]);
    } else {
      match.score = SCORE_INCREMENT;
      resultsMap.set(match.key, match);
    }
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
