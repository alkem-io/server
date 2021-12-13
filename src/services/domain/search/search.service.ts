import { Inject, LoggerService, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchInput } from './search-input.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { User } from '@domain/community/user/user.entity';
import { SearchResultEntry } from './search-result-entry.dto';
import { ISearchResultEntry } from './search-result-entry.interface';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions/validation.exception';
import { Organization } from '@domain/community/organization/organization.entity';
import { AgentInfo } from '@core/authentication/agent-info';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { AuthorizationService } from '@core/authorization/authorization.service';

enum SearchEntityTypes {
  USER = 'user',
  GROUP = 'group',
  ORGANIZATION = 'organization',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

const SEARCH_ENTITIES: string[] = [
  SearchEntityTypes.USER,
  SearchEntityTypes.GROUP,
  SearchEntityTypes.ORGANIZATION,
  SearchEntityTypes.CHALLENGE,
  SearchEntityTypes.OPPORTUNITY,
];

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;
const TERM_MINIMUM_LENGTH = 2;
const SCORE_INCREMENT = 10;

class Match {
  key = 0;
  score = 0;
  terms: string[] = [];
  entity: User | UserGroup | Organization | Challenge | Opportunity | undefined;
}

export class SearchService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async search(
    searchData: SearchInput,
    agentInfo: AgentInfo
  ): Promise<ISearchResultEntry[]> {
    this.validateSearchParameters(searchData);

    // Use maps to aggregate results as searching; data structure chosen for linear lookup o(1)
    const userResults: Map<number, Match> = new Map();
    const groupResults: Map<number, Match> = new Map();
    const organizationResults: Map<number, Match> = new Map();
    const challengeResults: Map<number, Match> = new Map();
    const opportunityResults: Map<number, Match> = new Map();

    const filteredTerms = this.validateSearchTerms(searchData.terms);

    // By default search all entity types
    const entityTypesFilter = searchData.typesFilter;
    const [
      searchUsers,
      searchGroups,
      searchOrganizations,
      searchChallenges,
      searchOpportunities,
    ] = await this.searchBy(agentInfo, entityTypesFilter);

    // Only support certain features for now
    if (searchData.challengesFilter)
      throw new NotImplementedException(
        'Filtering by challenges not yet implemented',
        LogContext.SEARCH
      );
    if (searchData.tagsetNames)
      await this.searchTagsets(
        agentInfo,
        searchData.tagsetNames,
        filteredTerms,
        userResults,
        groupResults,
        organizationResults,
        entityTypesFilter
      );

    if (searchUsers) await this.searchUsersByTerms(filteredTerms, userResults);
    if (searchGroups)
      await this.searchGroupsByTerms(filteredTerms, groupResults);
    if (searchOrganizations)
      await this.searchOrganizationsByTerms(filteredTerms, organizationResults);
    if (searchChallenges)
      await this.searchChallengesByTerms(
        filteredTerms,
        challengeResults,
        agentInfo
      );
    if (searchOpportunities)
      await this.searchOpportunitiesByTerms(
        filteredTerms,
        opportunityResults,
        agentInfo
      );
    this.logger.verbose?.(
      `Executed search query: ${userResults.size} users results; ${groupResults.size} group results; ${organizationResults.size} organization results found; ${challengeResults.size} challenge results found; ${opportunityResults.size} opportunity results found`,
      LogContext.API
    );

    const results: ISearchResultEntry[] = [];
    if (searchUsers) {
      results.push(...(await this.buildSearchResults(userResults)));
    }
    results.push(...(await this.buildSearchResults(groupResults)));
    results.push(...(await this.buildSearchResults(organizationResults)));
    results.push(...(await this.buildSearchResults(challengeResults)));
    results.push(...(await this.buildSearchResults(opportunityResults)));
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
    agentInfo: AgentInfo,
    entityTypesFilter?: string[]
  ): Promise<[boolean, boolean, boolean, boolean, boolean]> {
    let searchUsers = true;
    let searchGroups = true;
    let searchOrganizations = true;
    let searchChallenges = true;
    let searchOpportunities = true;

    if (entityTypesFilter && entityTypesFilter.length > 0) {
      if (
        !entityTypesFilter.includes(SearchEntityTypes.USER) ||
        !agentInfo.email
      )
        searchUsers = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.GROUP))
        searchGroups = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.ORGANIZATION))
        searchOrganizations = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.CHALLENGE))
        searchChallenges = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.OPPORTUNITY))
        searchOpportunities = false;
    }

    return [
      searchUsers,
      searchGroups,
      searchOrganizations,
      searchChallenges,
      searchOpportunities,
    ];
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

  async searchOrganizationsByTerms(
    terms: string[],
    organizationResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const organizationMatches = await this.organizationRepository
        .createQueryBuilder('organization')
        .leftJoinAndSelect('organization.profile', 'profile')
        .leftJoinAndSelect('organization.groups', 'groups')
        .where('organization.nameID like :term')
        .orWhere('organization.displayName like :term')
        .orWhere('profile.description like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Create results for each match
      await this.buildMatchingResults(
        organizationMatches,
        organizationResults,
        term
      );
    }
  }

  async searchChallengesByTerms(
    terms: string[],
    challengeResults: Map<number, Match>,
    agentInfo: AgentInfo
  ) {
    for (const term of terms) {
      const readableChallengeMatches: Opportunity[] = [];
      const challengeMatches = await this.challengeRepository
        .createQueryBuilder('challenge')
        .leftJoinAndSelect('challenge.tagset', 'tagset')
        .leftJoinAndSelect('challenge.opportunities', 'opportunities')
        .leftJoinAndSelect('challenge.authorization', 'authorization')
        .leftJoinAndSelect('challenge.context', 'context')
        .where('challenge.nameID like :term')
        .orWhere('challenge.displayName like :term')
        .orWhere('tagset.tags like :term')
        .orWhere('context.tagline like :term')
        .orWhere('context.background like :term')
        .orWhere('context.impact like :term')
        .orWhere('context.vision like :term')
        .orWhere('context.who like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Only show challenges that the current user has read access to
      for (const challenge of challengeMatches) {
        if (
          this.authorizationService.isAccessGranted(
            agentInfo,
            challenge.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          readableChallengeMatches.push(challenge);
        }
      }
      // Create results for each match
      await this.buildMatchingResults(
        readableChallengeMatches,
        challengeResults,
        term
      );
    }
  }

  async searchOpportunitiesByTerms(
    terms: string[],
    opportunityResults: Map<number, Match>,
    agentInfo: AgentInfo
  ) {
    for (const term of terms) {
      const readableOpportunityMatches: Opportunity[] = [];
      const opportunityMatches = await this.opportunityRepository
        .createQueryBuilder('opportunity')
        .leftJoinAndSelect('opportunity.tagset', 'tagset')
        .leftJoinAndSelect('opportunity.projects', 'projects')
        .leftJoinAndSelect('opportunity.authorization', 'authorization')
        .leftJoinAndSelect('opportunity.context', 'context')
        .leftJoinAndSelect('opportunity.challenge', 'challenge')
        .where('opportunity.nameID like :term')
        .orWhere('opportunity.displayName like :term')
        .orWhere('tagset.tags like :term')
        .orWhere('context.tagline like :term')
        .orWhere('context.background like :term')
        .orWhere('context.impact like :term')
        .orWhere('context.vision like :term')
        .orWhere('context.who like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Only show challenges that the current user has read access to
      for (const opportunity of opportunityMatches) {
        if (
          this.authorizationService.isAccessGranted(
            agentInfo,
            opportunity.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          readableOpportunityMatches.push(opportunity);
        }
      }
      // Create results for each match
      await this.buildMatchingResults(
        readableOpportunityMatches,
        opportunityResults,
        term
      );
    }
  }

  async searchTagsets(
    agentInfo: AgentInfo,
    tagsets: string[],
    terms: string[],
    userResults: Map<number, Match>,
    groupResults: Map<number, Match>,
    organizationResults: Map<number, Match>,
    entityTypesFilter?: string[]
  ) {
    const [searchUsers, searchGroups, searchOrganizations] =
      await this.searchBy(agentInfo, entityTypesFilter);

    if (searchUsers)
      await this.searchUsersByTagsets(terms, tagsets, userResults);

    if (searchGroups)
      await this.searchGroupsByTagsets(terms, tagsets, groupResults);

    if (searchOrganizations)
      await this.searchOrganizationsByTagsets(
        terms,
        tagsets,
        organizationResults
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

  async searchOrganizationsByTagsets(
    terms: string[],
    tagsets: string[],
    organizationResults: Map<number, Match>
  ) {
    for (const term of terms) {
      const organizationMatches = await this.organizationRepository
        .createQueryBuilder('organization')
        .leftJoinAndSelect('organization.profile', 'profile')
        .leftJoinAndSelect('organization.groups', 'groups')
        .leftJoinAndSelect('profile.tagsets', 'tagset')
        .where('tagset.name IN (:tagsets)', { tagsets: tagsets })
        .andWhere('find_in_set(:term, tagset.tags)')
        .setParameters({ term: `${term}` })
        .getMany();

      // Create results for each match
      await this.buildMatchingResults(
        organizationMatches,
        organizationResults,
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
