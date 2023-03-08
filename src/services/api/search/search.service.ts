import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchInput } from './dto/search.dto.input';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { User } from '@domain/community/user/user.entity';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ValidationException } from '@common/exceptions/validation.exception';
import { Organization } from '@domain/community/organization/organization.entity';
import { AgentInfo } from '@core/authentication/agent-info';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { ISearchResult } from './dto/search.result.entry.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { HubService } from '@domain/challenge/hub/hub.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { UserService } from '@domain/community/user/user.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import SearchResultBuilderService from './search.result.builder.service';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ISearchResults } from './dto/search.result.dto';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { ISearchResultBuilder } from './search.result.builder.interface';

enum SearchEntityTypes {
  USER = 'user',
  GROUP = 'group',
  ORGANIZATION = 'organization',
  HUB = 'hub',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  CARD = 'card',
}

const SEARCH_ENTITIES: string[] = [
  SearchEntityTypes.USER,
  SearchEntityTypes.GROUP,
  SearchEntityTypes.ORGANIZATION,
  SearchEntityTypes.HUB,
  SearchEntityTypes.CHALLENGE,
  SearchEntityTypes.OPPORTUNITY,
  SearchEntityTypes.CARD,
];

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;
const TERM_MINIMUM_LENGTH = 2;
const SCORE_INCREMENT = 10;
const RESULTS_LIMIT = 10;

class Match {
  key = 0;
  score = 0;
  terms: string[] = [];
  entity!: User | UserGroup | Organization | Hub | Challenge | Opportunity;
  type!: SearchResultType;
}

export class SearchService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserGroup)
    private groupRepository: Repository<UserGroup>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Aspect)
    private cardRepository: Repository<Aspect>,
    private hubService: HubService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private userGroupService: UserGroupService,
    private cardService: AspectService,
    private calloutService: CalloutService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  async search(
    searchData: SearchInput,
    agentInfo: AgentInfo
  ): Promise<ISearchResults> {
    this.validateSearchParameters(searchData);

    // Use maps to aggregate results as searching; data structure chosen for linear lookup o(1)
    const userResults: Map<number, Match> = new Map();
    const groupResults: Map<number, Match> = new Map();
    const organizationResults: Map<number, Match> = new Map();
    const hubResults: Map<number, Match> = new Map();
    const challengeResults: Map<number, Match> = new Map();
    const opportunityResults: Map<number, Match> = new Map();
    const cardResults: Map<number, Match> = new Map();

    const filteredTerms = this.validateSearchTerms(searchData.terms);

    const {
      hubIDsFilter,
      challengeIDsFilter,
      opportunityIDsFilter,
      userIDsFilter,
      cardIDsFilter,
    } = await this.getIDFilters(searchData.searchInHubFilter);

    // By default search all entity types
    const entityTypesFilter = searchData.typesFilter;
    const [
      searchUsers,
      searchGroups,
      searchOrganizations,
      searchHubs,
      searchChallenges,
      searchOpportunities,
      searchCards,
    ] = await this.searchBy(agentInfo, entityTypesFilter, hubIDsFilter);

    if (searchData.tagsetNames)
      await this.searchTagsets(
        agentInfo,
        searchData.tagsetNames,
        filteredTerms,
        userResults,
        groupResults,
        organizationResults,
        userIDsFilter,
        entityTypesFilter
      );

    if (searchUsers)
      await this.searchUsersByTerms(filteredTerms, userResults, userIDsFilter);
    if (searchGroups)
      await this.searchGroupsByTerms(filteredTerms, groupResults);
    if (searchOrganizations)
      await this.searchOrganizationsByTerms(filteredTerms, organizationResults);
    if (searchHubs)
      await this.searchHubsByTerms(filteredTerms, hubResults, agentInfo);
    if (searchChallenges)
      await this.searchChallengesByTerms(
        filteredTerms,
        challengeResults,
        agentInfo,
        challengeIDsFilter
      );
    if (searchOpportunities)
      await this.searchOpportunitiesByTerms(
        filteredTerms,
        opportunityResults,
        agentInfo,
        opportunityIDsFilter
      );

    if (searchCards)
      await this.searchCardsByTerms(
        filteredTerms,
        cardResults,
        agentInfo,
        cardIDsFilter
      );
    this.logger.verbose?.(
      `Executed search query: ${userResults.size} users results; ${groupResults.size} group results; ${organizationResults.size} organization results found; ${hubResults.size} hub results found; ${challengeResults.size} challenge results found; ${opportunityResults.size} opportunity results found; ${cardResults.size} card results found`,
      LogContext.API
    );

    const results: ISearchResults = {
      contributionResults: [],
      contributionResultsCount: cardResults.size,
      contributorResults: [],
      contributorResultsCount: userResults.size + organizationResults.size,
      journeyResults: [],
      journeyResultsCount:
        hubResults.size + challengeResults.size + opportunityResults.size,
      groupResults: [],
    };

    results.contributorResults.push(
      ...(await this.buildSearchResults(userResults))
    );
    results.contributorResults.push(
      ...(await this.buildSearchResults(organizationResults))
    );

    results.groupResults.push(...(await this.buildSearchResults(groupResults)));

    results.journeyResults.push(...(await this.buildSearchResults(hubResults)));
    results.journeyResults.push(
      ...(await this.buildSearchResults(challengeResults))
    );
    results.journeyResults.push(
      ...(await this.buildSearchResults(opportunityResults))
    );

    results.contributionResults.push(
      ...(await this.buildSearchResults(cardResults))
    );

    this.processResults(results.contributionResults, RESULTS_LIMIT);
    this.processResults(results.contributorResults, RESULTS_LIMIT);
    this.processResults(results.journeyResults, RESULTS_LIMIT);
    this.processResults(results.groupResults, RESULTS_LIMIT);
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

  private processResults(results: ISearchResult[], limit: number) {
    results.sort((a, b) => b.score - a.score);
    results.splice(limit);
    this.ensureUniqueTermsPerResult(results);
  }

  ensureUniqueTermsPerResult(results: ISearchResult[]) {
    for (const result of results) {
      const uniqueTerms = [...new Set(result.terms)];
      result.terms = uniqueTerms;
    }
  }

  async searchBy(
    agentInfo: AgentInfo,
    entityTypesFilter?: string[],
    hubIDsFilter?: string[] | undefined
  ): Promise<[boolean, boolean, boolean, boolean, boolean, boolean, boolean]> {
    let searchUsers = true;
    let searchGroups = true;
    let searchOrganizations = true;
    let searchHubs = true;
    let searchChallenges = true;
    let searchOpportunities = true;
    let searchCards = true;

    if (entityTypesFilter && entityTypesFilter.length > 0) {
      if (!entityTypesFilter.includes(SearchEntityTypes.USER))
        searchUsers = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.GROUP))
        searchGroups = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.ORGANIZATION))
        searchOrganizations = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.HUB))
        searchHubs = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.CHALLENGE))
        searchChallenges = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.OPPORTUNITY))
        searchOpportunities = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.CARD))
        searchCards = false;
    }

    if (!agentInfo.email) {
      searchUsers = false;
    }

    if (hubIDsFilter) {
      searchHubs = false;
      // If searching in an org then interested in content and users
      searchOrganizations = false;
    }

    return [
      searchUsers,
      searchGroups,
      searchOrganizations,
      searchHubs,
      searchChallenges,
      searchOpportunities,
      searchCards,
    ];
  }

  async searchUsersByTerms(
    terms: string[],
    userResults: Map<number, Match>,
    usersFilter: string[] | undefined
  ) {
    if (usersFilter && usersFilter.length === 0) {
      // no searching needed
      return;
    }
    for (const term of terms) {
      const userQuery = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('profile.location', 'location');

      // Optionally restrict to search in just one Hub
      if (usersFilter) {
        userQuery.where('user.id IN (:usersFilter)', {
          usersFilter: usersFilter,
        });
      }
      // Note that brackets are needed to nest the and
      userQuery
        .andWhere(
          new Brackets(qb => {
            qb.where('user.firstName like :term')
              .orWhere('user.nameID like :term')
              .orWhere('user.lastName like :term')
              .orWhere('user.email like :term')
              .orWhere('user.displayName like :term')
              .orWhere('location.country like :term')
              .orWhere('location.city like :term')
              .orWhere('profile.description like :term');
          })
        )
        .setParameter('term', `%${term}%`);

      const userMatches = await userQuery.getMany();

      // Create results for each match
      await this.buildMatchingResults(
        userMatches,
        userResults,
        term,
        SearchResultType.USER
      );
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
      await this.buildMatchingResults(
        groupMatches,
        groupResults,
        term,
        SearchResultType.USERGROUP
      );
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
        .leftJoinAndSelect('profile.avatar', 'avatar')
        .leftJoinAndSelect('organization.groups', 'groups')
        .leftJoinAndSelect('profile.location', 'location')
        .where('organization.nameID like :term')
        .orWhere('organization.displayName like :term')
        .orWhere('profile.description like :term')
        .orWhere('location.country like :term')
        .orWhere('location.city like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Create results for each match
      await this.buildMatchingResults(
        organizationMatches,
        organizationResults,
        term,
        SearchResultType.ORGANIZATION
      );
    }
  }

  async searchHubsByTerms(
    terms: string[],
    hubResults: Map<number, Match>,
    agentInfo: AgentInfo
  ) {
    for (const term of terms) {
      const readableHubMatches: Hub[] = [];
      const hubMatches = await this.hubRepository
        .createQueryBuilder('hub')
        .leftJoinAndSelect('hub.tagset', 'tagset')
        .leftJoinAndSelect('hub.challenges', 'challenges')
        .leftJoinAndSelect('hub.authorization', 'authorization')
        .leftJoinAndSelect('hub.context', 'context')
        .leftJoinAndSelect('hub.collaboration', 'collaboration')
        .leftJoinAndSelect('context.location', 'location')
        .where('hub.nameID like :term')
        .orWhere('hub.displayName like :term')
        .orWhere('tagset.tags like :term')
        .orWhere('context.tagline like :term')
        .orWhere('context.background like :term')
        .orWhere('context.impact like :term')
        .orWhere('context.vision like :term')
        .orWhere('context.who like :term')
        .orWhere('location.country like :term')
        .orWhere('location.city like :term')
        .setParameters({ term: `%${term}%` })
        .getMany();
      // Only show challenges that the current user has read access to
      for (const hub of hubMatches) {
        if (
          this.authorizationService.isAccessGranted(
            agentInfo,
            hub.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          readableHubMatches.push(hub);
        }
      }
      // Create results for each match
      await this.buildMatchingResults(
        readableHubMatches,
        hubResults,
        term,
        SearchResultType.HUB
      );
    }
  }

  async searchChallengesByTerms(
    terms: string[],
    challengeResults: Map<number, Match>,
    agentInfo: AgentInfo,
    challengeIDsFilter: string[] | undefined
  ) {
    if (challengeIDsFilter && challengeIDsFilter.length === 0) {
      // no searching needed
      return;
    }
    for (const term of terms) {
      const readableChallengeMatches: Challenge[] = [];
      const challengeQuery = this.challengeRepository
        .createQueryBuilder('challenge')
        .leftJoinAndSelect('challenge.tagset', 'tagset')
        .leftJoinAndSelect('challenge.opportunities', 'opportunities')
        .leftJoinAndSelect('challenge.authorization', 'authorization')
        .leftJoinAndSelect('challenge.context', 'context')
        .leftJoinAndSelect('challenge.collaboration', 'collaboration')
        .leftJoinAndSelect('context.location', 'location');

      // Optionally restrict to search in just one Hub
      if (challengeIDsFilter) {
        challengeQuery.where('challenge.id IN (:challengesFilter)', {
          challengesFilter: challengeIDsFilter,
        });
      }

      // Note that brackets are needed to nest the and
      challengeQuery
        .andWhere(
          new Brackets(qb => {
            qb.where('challenge.nameID like :term')
              .orWhere('challenge.displayName like :term')
              .orWhere('tagset.tags like :term')
              .orWhere('context.tagline like :term')
              .orWhere('context.background like :term')
              .orWhere('context.impact like :term')
              .orWhere('context.vision like :term')
              .orWhere('context.who like :term')
              .orWhere('location.country like :term')
              .orWhere('location.city like :term');
          })
        )
        .setParameters({ term: `%${term}%` });

      const challengeMatches = await challengeQuery.getMany();
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
        term,
        SearchResultType.CHALLENGE
      );
    }
  }

  async searchOpportunitiesByTerms(
    terms: string[],
    opportunityResults: Map<number, Match>,
    agentInfo: AgentInfo,
    opportunityIDsFilter: string[] | undefined
  ) {
    if (opportunityIDsFilter && opportunityIDsFilter.length === 0) {
      // no searching needed
      return;
    }
    for (const term of terms) {
      const readableOpportunityMatches: Opportunity[] = [];
      const opportunitiesQuery = this.opportunityRepository
        .createQueryBuilder('opportunity')
        .leftJoinAndSelect('opportunity.tagset', 'tagset')
        .leftJoinAndSelect('opportunity.projects', 'projects')
        .leftJoinAndSelect('opportunity.authorization', 'authorization')
        .leftJoinAndSelect('opportunity.context', 'context')
        .leftJoinAndSelect('opportunity.collaboration', 'collaboration')
        .leftJoinAndSelect('opportunity.challenge', 'challenge')
        .leftJoinAndSelect('context.location', 'location');
      // Optionally restrict to search in just one Hub
      if (opportunityIDsFilter) {
        opportunitiesQuery.where('opportunity.id IN (:opportunitiesFilter)', {
          opportunitiesFilter: opportunityIDsFilter,
        });
      }
      // Note that brackets are needed to nest the and
      opportunitiesQuery
        .andWhere(
          new Brackets(qb => {
            qb.where('opportunity.nameID like :term')
              .orWhere('opportunity.displayName like :term')
              .orWhere('tagset.tags like :term')
              .orWhere('context.tagline like :term')
              .orWhere('context.background like :term')
              .orWhere('context.impact like :term')
              .orWhere('context.vision like :term')
              .orWhere('context.who like :term')
              .orWhere('location.country like :term')
              .orWhere('location.city like :term');
          })
        )
        .setParameters({ term: `%${term}%` });

      const opportunityMatches = await opportunitiesQuery.getMany();
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
        term,
        SearchResultType.OPPORTUNITY
      );
    }
  }

  async searchCardsByTerms(
    terms: string[],
    cardResults: Map<number, Match>,
    agentInfo: AgentInfo,
    cardIDsFilter: string[] | undefined
  ) {
    if (cardIDsFilter && cardIDsFilter.length === 0) {
      // no searching needed
      return;
    }
    for (const term of terms) {
      const readableCardMatches: Aspect[] = [];
      const cardQuery = this.cardRepository
        .createQueryBuilder('aspect')
        .leftJoinAndSelect('aspect.profile', 'profile')
        .leftJoinAndSelect('profile.tagset', 'tagset')
        .leftJoinAndSelect('aspect.authorization', 'authorization');

      // Optionally restrict to search in just one Hub
      if (cardIDsFilter) {
        cardQuery.where('aspect.id IN (:cardsFilter)', {
          cardsFilter: cardIDsFilter,
        });
      }
      // Note that brackets are needed to nest the and
      cardQuery
        .andWhere(
          new Brackets(qb => {
            qb.where('aspect.nameID like :term')
              .orWhere('aspect.displayName like :term')
              .orWhere('tagset.tags like :term')
              .orWhere('profile.description like :term');
          })
        )
        .setParameters({ term: `%${term}%` });

      const cardMatches = await cardQuery.getMany();
      // Only show cards that the current user has read access to
      for (const card of cardMatches) {
        if (
          this.authorizationService.isAccessGranted(
            agentInfo,
            card.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          readableCardMatches.push(card);
        }
      }
      // Create results for each match
      await this.buildMatchingResults(
        readableCardMatches,
        cardResults,
        term,
        SearchResultType.CARD
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
    usersFilter: string[] | undefined,
    entityTypesFilter?: string[]
  ) {
    const [searchUsers, searchGroups, searchOrganizations] =
      await this.searchBy(agentInfo, entityTypesFilter);

    if (searchUsers)
      await this.searchUsersByTagsets(terms, tagsets, userResults, usersFilter);

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
    userResults: Map<number, Match>,
    userIDsFilter?: string[]
  ) {
    if (userIDsFilter && userIDsFilter.length === 0) {
      // no searching needed
      return;
    }
    for (const term of terms) {
      const userQuery = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('profile.tagsets', 'tagset')
        .where('tagset.name IN (:tagsets)', { tagsets: tagsets });

      // Optionally restrict to search in just one Hub
      if (userIDsFilter) {
        userQuery.andWhere('user.id IN (:usersFilter)');
      }

      userQuery
        .andWhere('find_in_set(:term, tagset.tags)')
        .setParameters({ term: `${term}`, usersFilter: userIDsFilter });

      const userMatches = await userQuery.getMany();

      // Create results for each match
      await this.buildMatchingResults(
        userMatches,
        userResults,
        term,
        SearchResultType.USER
      );
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
      await this.buildMatchingResults(
        groupMatches,
        groupResults,
        term,
        SearchResultType.USERGROUP
      );
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
        term,
        SearchResultType.ORGANIZATION
      );
    }
  }

  async buildMatchingResults(
    rawMatches: any[],
    resultsMap: Map<number, Match>,
    term: string,
    type: SearchResultType
  ) {
    for (const rawMatch of rawMatches) {
      const match = new Match();
      match.entity = rawMatch;
      match.terms.push(term);
      match.key = rawMatch.id;
      match.type = type;
      this.addMatchingResult(resultsMap, match);
    }
  }

  async buildSearchResults(
    results: Map<number, Match>
  ): Promise<ISearchResult[]> {
    const searchResults: ISearchResult[] = [];
    for (const result of results.values()) {
      const searchResultBase: ISearchResult = {
        score: result.score,
        terms: result.terms,
        result: result.entity,
        type: result.type,
        id: `${result.type}-${result.entity.id}`,
      };

      const searchResultBuilder: ISearchResultBuilder =
        new SearchResultBuilderService(
          searchResultBase,
          this.hubService,
          this.challengeService,
          this.opportunityService,
          this.userService,
          this.organizationService,
          this.userGroupService,
          this.cardService,
          this.calloutService,
          this.entityManager
        );
      const searchResultType = searchResultBase.type as SearchResultType;
      try {
        const searchResult = await searchResultBuilder[searchResultType](
          searchResultBase
        );
        searchResults.push(searchResult);
      } catch (error) {
        this.logger.error(
          `Unable to process search result: ${JSON.stringify(
            result
          )} - error: ${error}`,
          LogContext.SEARCH
        );
      }
    }

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

  private async getIDFilters(searchInHubID: string | undefined): Promise<{
    hubIDsFilter: string[] | undefined;
    challengeIDsFilter: string[] | undefined;
    opportunityIDsFilter: string[] | undefined;
    userIDsFilter: string[] | undefined;
    cardIDsFilter: string[] | undefined;
  }> {
    let searchInHub: IHub | undefined = undefined;
    let hubIDsFilter: string[] | undefined = undefined;
    let challengeIDsFilter: string[] | undefined = undefined;
    let opportunityIDsFilter: string[] | undefined = undefined;
    let userIDsFilter: string[] | undefined = undefined;
    let cardIDsFilter: string[] | undefined = undefined;
    if (searchInHubID) {
      searchInHub = await this.hubService.getHubOrFail(searchInHubID, {
        relations: ['collaboration'],
      });
      hubIDsFilter = [searchInHub.id];

      const challengesFilter = await this.getChallengesFilter(hubIDsFilter);
      challengeIDsFilter = challengesFilter.map(challenge => challenge.id);
      const opportunitiesFilter = await this.getOpportunitiesFilter(
        hubIDsFilter
      );
      opportunityIDsFilter = opportunitiesFilter.map(opp => opp.id);
      userIDsFilter = await this.getUsersFilter(searchInHub);
      cardIDsFilter = await this.getCardsFilter(
        searchInHub,
        challengesFilter,
        opportunitiesFilter
      );
    }
    return {
      hubIDsFilter,
      challengeIDsFilter,
      opportunityIDsFilter,
      userIDsFilter,
      cardIDsFilter,
    };
  }

  private async getChallengesFilter(
    hubFilter: string[]
  ): Promise<IChallenge[]> {
    const challengesQuery = this.challengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.collaboration', 'collaboration')
      .where('challenge.hubID IN (:hubFilter)', {
        hubFilter: hubFilter,
      });

    return await challengesQuery.getMany();
  }

  private async getOpportunitiesFilter(
    hubFilter: string[]
  ): Promise<IOpportunity[]> {
    const opportunitiesQuery = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.collaboration', 'collaboration')
      .where('opportunity.hubID IN (:hubFilter)', {
        hubFilter: hubFilter,
      });

    return await opportunitiesQuery.getMany();
  }

  private async getUsersFilter(searchInHub: IHub): Promise<string[]> {
    const usersFilter = [];
    const membersInHub = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.HUB_MEMBER,
      resourceID: searchInHub.id,
    });
    for (const user of membersInHub) {
      usersFilter.push(user.id);
    }
    const adminsInHub = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.HUB_ADMIN,
      resourceID: searchInHub.id,
    });
    for (const user of adminsInHub) {
      usersFilter.push(user.id);
    }
    return usersFilter;
  }

  private async getCardsFilter(
    hubFilter: IHub,
    challengesFilter: IChallenge[],
    opportunitiesFilter: IOpportunity[]
  ): Promise<string[]> {
    // Get all the relevant collaborations
    const collaborationFilter = [hubFilter.collaboration?.id];
    challengesFilter.forEach(c =>
      collaborationFilter.push(c.collaboration?.id)
    );
    opportunitiesFilter.forEach(c =>
      collaborationFilter.push(c.collaboration?.id)
    );

    // Get all the cards IDs in the Hub
    const cardsFilter: string[] = [];
    const cardQuery = this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.callout', 'callout')
      .leftJoinAndSelect('callout.collaboration', 'collaboration')
      .where('collaboration.id IN (:collaborationFilter)', {
        collaborationFilter: collaborationFilter,
      });

    const cardMatches = await cardQuery.getMany();
    cardMatches.forEach(match => cardsFilter.push(match.id));

    return cardsFilter;
  }
}
