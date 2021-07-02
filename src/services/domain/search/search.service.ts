import { Inject, LoggerService, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchInput } from './search-input.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { User } from '@domain/community/user/user.entity';
import { SearchResultEntry } from './search-result-entry.dto';
import { ISearchResultEntry } from './search-result-entry.interface';
import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions/validation.exception';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';

enum SearchEntityTypes {
  User = 'user',
  Group = 'group',
  Organisation = 'organisation',
  Challenge = 'challenge',
}

const SEARCH_ENTITIES: string[] = [
  SearchEntityTypes.User,
  SearchEntityTypes.Group,
  SearchEntityTypes.Organisation,
  SearchEntityTypes.Challenge,
];
const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;
const TERM_MINIMUM_LENGTH = 2;
const SCORE_INCREMENT = 10;

class Match {
  key = 0;
  score = 0;
  terms: string[] = [];
  entity: User | UserGroup | Organisation | Challenge | undefined;
}

export class SearchService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async search(searchData: SearchInput): Promise<ISearchResultEntry[]> {
    this.validateSearchParameters(searchData);

    // Use maps to aggregate results as searching; data structure chosen for linear lookup o(1)
    const userResults: Map<number, Match> = new Map();
    const groupResults: Map<number, Match> = new Map();
    const organisationResults: Map<number, Match> = new Map();
    const challengeResults: Map<number, Match> = new Map();

    const filteredTerms = this.validateSearchTerms(searchData.terms);

    // By default search all entity types
    let searchUsers = true;
    let searchGroups = true;
    let searchOrganisations = true;
    let searchChallenges = true;
    const entityTypesFilter = searchData.typesFilter;
    [
      searchUsers,
      searchGroups,
      searchOrganisations,
      searchChallenges,
    ] = await this.searchBy(entityTypesFilter);

    // Only support certain features for now
    if (searchData.challengesFilter)
      throw new NotImplementedException(
        'Filtering by challenges not yet implemented',
        LogContext.SEARCH
      );
    if (searchData.tagsetNames)
      await this.searchTagsets(
        searchData.tagsetNames,
        filteredTerms,
        userResults,
        groupResults,
        organisationResults,
        entityTypesFilter
      );

    if (searchUsers) await this.searchUsersByTerms(filteredTerms, userResults);
    if (searchGroups)
      await this.searchGroupsByTerms(filteredTerms, groupResults);
    if (searchOrganisations)
      await this.searchOrganisationsByTerms(filteredTerms, organisationResults);
    if (searchChallenges)
      await this.searchChallengesByTerms(filteredTerms, challengeResults);

    this.logger.verbose?.(
      `Executed search query: ${userResults.size} users results; ${groupResults.size} group results; ${organisationResults.size} organisation results found; ${challengeResults.size} challenge results found`,
      LogContext.API
    );

    let results: ISearchResultEntry[] = [];
    results = await this.buildSearchResults(userResults);
    results.push(...(await this.buildSearchResults(groupResults)));
    results.push(...(await this.buildSearchResults(organisationResults)));
    results.push(...(await this.buildSearchResults(challengeResults)));
    this.ensureUniqueTermsPerResult(results);
    return results;
  }

  validateSearchTerms(terms: string[]): string[] {
    const filteredTerms: string[] = [];
    for (const term of terms) {
      if (term.length < TERM_MINIMUM_LENGTH) {
        throw new ValidationException(
          `Search: Skipping term below minimum length: ${term}`,
          LogContext.SEARCH
        );
      } else {
        filteredTerms.push(term);
      }
    }
    return filteredTerms;
  }

  ensureUniqueTermsPerResult(results: ISearchResultEntry[]) {
    for (const result of results) {
      const uniqueTerms = [...new Set(result.terms)];
      result.terms = uniqueTerms;
    }
  }

  async searchBy(
    entityTypesFilter?: string[]
  ): Promise<[boolean, boolean, boolean, boolean]> {
    let searchUsers = true;
    let searchGroups = true;
    let searchOrganisations = true;
    let searchChallenges = true;

    if (entityTypesFilter && entityTypesFilter.length > 0) {
      if (!entityTypesFilter.includes(SearchEntityTypes.User))
        searchUsers = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.Group))
        searchGroups = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.Organisation))
        searchOrganisations = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.Challenge))
        searchChallenges = false;
    }

    return [searchUsers, searchGroups, searchOrganisations, searchChallenges];
  }

  async searchUsersByTerms(terms: string[], userResults: Map<number, Match>) {
    for (const term of terms) {
      const userMatches = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('user.firstName like :term')
        .orWhere('user.nameID like :term')
        .orWhere('user.lastName like :term')
        .orWhere('user.email like :term')
        .orWhere('user.country like :term')
        .orWhere('user.city like :term')
        .orWhere('profile.description like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();

      // Create results for each match
      await this.buildMatchingResults(userMatches, userResults, term);
    }
  }

  async searchGroupsByTerms(terms: string[], groupResults: Map<number, Match>) {
    for (const term of terms) {
      const groupMatches = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.profile', 'profile')
        .where('group.name like :term')
        .orWhere('profile.description like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Create results for each match
      await this.buildMatchingResults(groupMatches, groupResults, term);
    }
  }

  async searchOrganisationsByTerms(
    terms: string[],
    organisationResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const organisationMatches = await this.organisationRepository
        .createQueryBuilder('organisation')
        .leftJoinAndSelect('organisation.profile', 'profile')
        .leftJoinAndSelect('organisation.groups', 'groups')
        .where('organisation.nameID like :term')
        .orWhere('organisation.displayName like :term')
        .orWhere('profile.description like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Create results for each match
      await this.buildMatchingResults(
        organisationMatches,
        organisationResults,
        term
      );
    }
  }

  async searchChallengesByTerms(
    terms: string[],
    challengeResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const challengeMatches = await this.challengeRepository
        .createQueryBuilder('challenge')
        .leftJoinAndSelect('challenge.tagset', 'tagset')
        .leftJoinAndSelect('challenge.context', 'context')
        .leftJoinAndSelect('challenge.opportunities', 'opportunity')
        .where('challenge.nameID like :term')
        .orWhere('challenge.displayName like :term')
        .orWhere('tagset.tags like :term')
        .orWhere('context.tagline like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Create results for each match
      await this.buildMatchingResults(challengeMatches, challengeResults, term);
    }
  }

  async searchTagsets(
    tagsets: string[],
    terms: string[],
    userResults: Map<number, Match>,
    groupResults: Map<number, Match>,
    organisationResults: Map<number, Match>,
    entityTypesFilter?: string[]
  ) {
    let searchUsers = true;
    let searchGroups = true;
    let searchOrganisations = true;
    [searchUsers, searchGroups, searchOrganisations] = await this.searchBy(
      entityTypesFilter
    );

    if (searchUsers)
      await this.searchUsersByTagsets(terms, tagsets, userResults);

    if (searchGroups)
      await this.searchGroupsByTagsets(terms, tagsets, groupResults);

    if (searchOrganisations)
      await this.searchOrganisationsByTagsets(
        terms,
        tagsets,
        organisationResults
      );
  }

  async searchUsersByTagsets(
    terms: string[],
    tagsets: string[],
    userResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const userMatches = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('profile.tagsets', 'tagset')
        .where('tagset.name IN (:tagsets)', { tagsets: tagsets })
        .andWhere('find_in_set(:term, tagset.tags)')
        .setParameters({ term: `${term}` })
        .getMany();

      // Create results for each match
      await this.buildMatchingResults(userMatches, userResults, term);
    }
  }

  async searchGroupsByTagsets(
    terms: string[],
    tagsets: string[],
    groupResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const groupMatches = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.profile', 'profile')
        .leftJoinAndSelect('profile.tagsets', 'tagset')
        .where('tagset.name IN (:tagsets)', { tagsets: tagsets })
        .andWhere('find_in_set(:term, tagset.tags)')
        .setParameters({ term: `${term}` })
        .getMany();

      // Create results for each match
      await this.buildMatchingResults(groupMatches, groupResults, term);
    }
  }

  async searchOrganisationsByTagsets(
    terms: string[],
    tagsets: string[],
    organisationResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const organisationMatches = await this.organisationRepository
        .createQueryBuilder('organisation')
        .leftJoinAndSelect('organisation.profile', 'profile')
        .leftJoinAndSelect('profile.tagsets', 'tagset')
        .where('tagset.name IN (:tagsets)', { tagsets: tagsets })
        .andWhere('find_in_set(:term, tagset.tags)')
        .setParameters({ term: `${term}` })
        .getMany();

      // Create results for each match
      await this.buildMatchingResults(
        organisationMatches,
        organisationResults,
        term
      );
    }
  }

  async buildMatchingResults(
    rawMatches: any[],
    resultsMap: Map<number, Match>,
    term: string
  ) {
    for (const rawMatch of rawMatches) {
      const match = new Match();
      match.entity = rawMatch;
      match.terms.push(term);
      match.key = rawMatch.id;
      this.addMatchingResult(resultsMap, match);
    }
  }

  async buildSearchResults(
    results: Map<number, Match>
  ): Promise<ISearchResultEntry[]> {
    const searchResults: ISearchResultEntry[] = [];
    results.forEach(value => {
      const resultEntry = new SearchResultEntry();
      resultEntry.score = value.score;
      resultEntry.terms = value.terms;
      resultEntry.result = value.entity;
      searchResults.push(resultEntry);
    });

    return searchResults;
  }

  // Add a new results entry or append to an existing entry.
  addMatchingResult(resultsMap: Map<number, Match>, match: Match) {
    const existingMatch = resultsMap.get(match.key);
    if (existingMatch) {
      existingMatch.score = existingMatch.score + SCORE_INCREMENT;
      // also add the term that was matched
      if (match.terms.length != 1)
        throw new ValidationException(
          'Expected exactly one matched term',
          LogContext.SEARCH
        );
      existingMatch.terms.push(match.terms[0]);
    } else {
      match.score = SCORE_INCREMENT;
      resultsMap.set(match.key, match);
    }
  }

  validateSearchParameters(searchData: SearchInput) {
    if (searchData.terms.length > SEARCH_TERM_LIMIT)
      throw new ValidationException(
        `Maximum number of search terms is ${SEARCH_TERM_LIMIT}; supplied: ${searchData.terms.length}`,
        LogContext.SEARCH
      );
    // Check limit on tagsets that can be searched
    const tagsetNames = searchData.tagsetNames;
    if (tagsetNames && tagsetNames.length > TAGSET_NAMES_LIMIT)
      throw new ValidationException(
        `Maximum number of tagset names is ${TAGSET_NAMES_LIMIT}; supplied: ${tagsetNames.length}`,
        LogContext.SEARCH
      );
    // Check only allowed entity types supplied
    const entityTypes = searchData.typesFilter;
    if (entityTypes) {
      entityTypes.forEach(entityType => {
        if (!SEARCH_ENTITIES.includes(entityType))
          throw new ValidationException(
            `Not allowed typeFilter encountered: ${entityType}`,
            LogContext.SEARCH
          );
      });
    }
  }
}
