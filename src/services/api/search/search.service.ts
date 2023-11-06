import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchInput } from './dto/search.dto.input';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
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
import { Space } from '@domain/challenge/space/space.entity';
import { ISearchResult } from './dto/search.result.entry.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { SpaceService } from '@domain/challenge/space/space.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { UserService } from '@domain/community/user/user.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import SearchResultBuilderService from './search.result.builder.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { Post } from '@domain/collaboration/post/post.entity';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ISearchResults } from './dto/search.result.dto';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { ISearchResultBuilder } from './search.result.builder.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutType } from '@common/enums/callout.type';

enum SearchEntityTypes {
  USER = 'user',
  GROUP = 'group',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  POST = 'post',
}

const SEARCH_ENTITIES: string[] = [
  SearchEntityTypes.USER,
  SearchEntityTypes.GROUP,
  SearchEntityTypes.ORGANIZATION,
  SearchEntityTypes.SPACE,
  SearchEntityTypes.CHALLENGE,
  SearchEntityTypes.OPPORTUNITY,
  SearchEntityTypes.POST,
];

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;
const TERM_MINIMUM_LENGTH = 2;
const SCORE_INCREMENT = 10;
const RESULTS_LIMIT = 8;

class Match {
  key = 0;
  score = 0;
  terms: string[] = [];
  entity!:
    | User
    | UserGroup
    | Organization
    | Space
    | Challenge
    | Opportunity
    | Post;
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
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(CalloutContribution)
    private contributionRepository: Repository<CalloutContribution>,
    private spaceService: SpaceService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private userGroupService: UserGroupService,
    private postService: PostService,
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
    const spaceResults: Map<number, Match> = new Map();
    const challengeResults: Map<number, Match> = new Map();
    const opportunityResults: Map<number, Match> = new Map();
    const postResults: Map<number, Match> = new Map();

    const filteredTerms = this.validateSearchTerms(searchData.terms);

    const {
      spaceIDsFilter,
      challengeIDsFilter,
      opportunityIDsFilter,
      userIDsFilter,
      organizationIDsFilter,
      postIDsFilter,
    } = await this.getIDFilters(searchData.searchInSpaceFilter);

    // By default search all entity types
    const entityTypesFilter = searchData.typesFilter;
    const [
      searchUsers,
      searchGroups,
      searchOrganizations,
      searchSpaces,
      searchChallenges,
      searchOpportunities,
      searchPosts,
    ] = await this.searchBy(agentInfo, entityTypesFilter, spaceIDsFilter);

    if (searchData.tagsetNames)
      await this.searchTagsets(
        agentInfo,
        searchData.tagsetNames,
        filteredTerms,
        userResults,
        groupResults,
        organizationResults,
        postResults,
        postIDsFilter,
        userIDsFilter,
        entityTypesFilter
      );
    if (searchUsers)
      await this.searchUsersByTerms(filteredTerms, userResults, userIDsFilter);
    if (searchGroups)
      await this.searchGroupsByTerms(filteredTerms, groupResults);
    if (searchOrganizations)
      await this.searchOrganizationsByTerms(
        filteredTerms,
        organizationResults,
        organizationIDsFilter
      );
    if (searchSpaces)
      await this.searchSpacesByTerms(filteredTerms, spaceResults, agentInfo);

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

    if (searchPosts)
      await this.searchPostsByTerms(
        filteredTerms,
        postResults,
        agentInfo,
        postIDsFilter
      );

    const results: ISearchResults = {
      contributionResults: [],
      contributionResultsCount: postResults.size,
      contributorResults: [],
      contributorResultsCount: userResults.size + organizationResults.size,
      journeyResults: [],
      journeyResultsCount:
        spaceResults.size + challengeResults.size + opportunityResults.size,
      groupResults: [],
    };

    results.contributorResults.push(
      ...(await this.buildSearchResults(userResults))
    );
    results.contributorResults.push(
      ...(await this.buildSearchResults(organizationResults))
    );

    results.groupResults.push(...(await this.buildSearchResults(groupResults)));

    results.journeyResults.push(
      ...(await this.buildSearchResults(spaceResults))
    );
    results.journeyResults.push(
      ...(await this.buildSearchResults(challengeResults))
    );
    results.journeyResults.push(
      ...(await this.buildSearchResults(opportunityResults))
    );

    results.contributionResults.push(
      ...(await this.buildSearchResults(postResults))
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
    spaceIDsFilter?: string[] | undefined
  ): Promise<[boolean, boolean, boolean, boolean, boolean, boolean, boolean]> {
    let searchUsers = true;
    let searchGroups = true;
    let searchOrganizations = true;
    let searchSpaces = true;
    let searchChallenges = true;
    let searchOpportunities = true;
    let searchPosts = true;

    if (entityTypesFilter && entityTypesFilter.length > 0) {
      if (!entityTypesFilter.includes(SearchEntityTypes.USER))
        searchUsers = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.GROUP))
        searchGroups = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.ORGANIZATION))
        searchOrganizations = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.SPACE))
        searchSpaces = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.CHALLENGE))
        searchChallenges = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.OPPORTUNITY))
        searchOpportunities = false;
      if (!entityTypesFilter.includes(SearchEntityTypes.POST))
        searchPosts = false;
    }

    if (!agentInfo.email) {
      searchUsers = false;
    }

    if (spaceIDsFilter) {
      searchSpaces = false;
    }

    return [
      searchUsers,
      searchGroups,
      searchOrganizations,
      searchSpaces,
      searchChallenges,
      searchOpportunities,
      searchPosts,
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

      // Optionally restrict to search in just one Space
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
              .orWhere('location.country like :term')
              .orWhere('location.city like :term')
              .orWhere('profile.displayName like :term')
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
        SearchResultType.USER,
        SCORE_INCREMENT
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
        SearchResultType.USERGROUP,
        SCORE_INCREMENT
      );
    }
  }

  async searchOrganizationsByTerms(
    terms: string[],
    organizationResults: Map<number, Match>,
    organizationsFilter: string[] | undefined
  ) {
    for (const term of terms) {
      const organizationQuery = await this.organizationRepository
        .createQueryBuilder('organization')
        .leftJoinAndSelect('organization.profile', 'profile')
        .leftJoinAndSelect('organization.groups', 'groups')
        .leftJoinAndSelect('profile.location', 'location');

      // Optionally restrict to search in just one Space
      if (organizationsFilter) {
        organizationQuery.where('organization.id IN (:organizationsFilter)', {
          organizationsFilter: organizationsFilter,
        });
      }
      // Note that brackets are needed to nest the and
      organizationQuery
        .andWhere(
          new Brackets(qb => {
            qb.where('organization.nameID like :term')
              .orWhere('profile.displayName like :term')
              .orWhere('profile.description like :term')
              .orWhere('location.country like :term')
              .orWhere('location.city like :term');
          })
        )
        .setParameters({ term: `%${term}%` });
      // Create results for each match
      const organizationMatches = await organizationQuery.getMany();
      await this.buildMatchingResults(
        organizationMatches,
        organizationResults,
        term,
        SearchResultType.ORGANIZATION,
        SCORE_INCREMENT
      );
    }
  }

  async searchSpacesByTerms(
    terms: string[],
    spaceResults: Map<number, Match>,
    agentInfo: AgentInfo
  ) {
    for (const term of terms) {
      const spaces = await this.spaceRepository.find({
        relations: {
          context: true,
          collaboration: true,
          profile: {
            location: true,
            tagsets: true,
          },
          license: true,
        },
      });

      const lowerCasedTerm = term.toLowerCase();
      const filteredSpaceMatches = spaces.filter(space => {
        return (
          space.nameID.toLowerCase().includes(lowerCasedTerm) ||
          space.profile.displayName.toLowerCase().includes(lowerCasedTerm) ||
          space.profile.tagline.toLowerCase().includes(lowerCasedTerm) ||
          space.profile.description.toLowerCase().includes(lowerCasedTerm) ||
          space.profile.tagsets?.some(tagset =>
            tagset.tags.map(tag => tag.toLowerCase()).includes(lowerCasedTerm)
          ) ||
          space.context?.impact?.toLowerCase().includes(lowerCasedTerm) ||
          space.context?.vision?.toLowerCase().includes(lowerCasedTerm) ||
          space.context?.who?.toLowerCase().includes(lowerCasedTerm) ||
          space.profile.location?.country
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          space.profile.location?.city.toLowerCase().includes(lowerCasedTerm)
        );
      });

      // Filter the spaces + score them
      for (const space of filteredSpaceMatches) {
        if (
          space.license &&
          space.license.visibility !== SpaceVisibility.ARCHIVED
        ) {
          // Score depends on various factors, hardcoded for now
          const score_increment = this.getScoreIncrementSpace(space, agentInfo);

          await this.buildMatchingResult(
            space,
            spaceResults,
            term,
            SearchResultType.SPACE,
            score_increment
          );
        }
      }
    }
  }

  // Determine the score increment based on whether the user has read access or not
  private getScoreIncrementSpace(space: ISpace, agentInfo: AgentInfo): number {
    switch (space.license?.visibility) {
      case SpaceVisibility.ACTIVE:
        return this.getScoreIncrementReadAccess(space.authorization, agentInfo);
      case SpaceVisibility.DEMO:
        return SCORE_INCREMENT / 2;
      case SpaceVisibility.ARCHIVED:
        return 0;
    }
    return SCORE_INCREMENT;
  }

  // Determine the score increment based on whether the user has read access or not
  private getScoreIncrementReadAccess(
    authorization: IAuthorizationPolicy | undefined,
    agentInfo: AgentInfo
  ): number {
    if (
      this.authorizationService.isAccessGranted(
        agentInfo,
        authorization,
        AuthorizationPrivilege.READ
      )
    ) {
      return SCORE_INCREMENT;
    }
    return SCORE_INCREMENT / 2;
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
      // First part: Retrieve data using TypeORM
      const challenges = await this.challengeRepository.find({
        where: challengeIDsFilter ? { id: In(challengeIDsFilter) } : undefined,
        relations: {
          context: true,
          collaboration: true,
          profile: {
            location: true,
            tagsets: true,
          },
          parentSpace: {
            license: true,
          },
        },
      });
      const lowerCasedTerm = term.toLowerCase();
      // Second part: Filter the results in TypeScript
      const filteredChallengeMatches = challenges.filter(challenge => {
        return (
          challenge.nameID.toLowerCase().includes(lowerCasedTerm) ||
          challenge.profile.displayName
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          challenge.profile.tagline.toLowerCase().includes(lowerCasedTerm) ||
          challenge.profile.description
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          challenge.profile.tagsets?.some(tagset =>
            tagset.tags.map(tag => tag.toLowerCase()).includes(lowerCasedTerm)
          ) ||
          challenge.context?.impact?.toLowerCase().includes(lowerCasedTerm) ||
          challenge.context?.vision?.toLowerCase().includes(lowerCasedTerm) ||
          challenge.context?.who?.toLowerCase().includes(lowerCasedTerm) ||
          challenge.profile.location?.country
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          challenge.profile.location?.city
            .toLowerCase()
            .includes(lowerCasedTerm)
        );
      });

      // Only show challenges that the current user has read access to
      for (const challenge of filteredChallengeMatches) {
        if (
          challenge.parentSpace?.license?.visibility !==
            SpaceVisibility.ARCHIVED &&
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
        SearchResultType.CHALLENGE,
        SCORE_INCREMENT
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
      // First part: Retrieve data using TypeORM
      const opportunities = await this.opportunityRepository.find({
        where: opportunityIDsFilter
          ? { id: In(opportunityIDsFilter) }
          : undefined,
        relations: {
          context: true,
          collaboration: true,
          challenge: {
            parentSpace: {
              license: true,
            },
          },
          profile: {
            location: true,
            tagsets: true,
          },
        },
      });

      const lowerCasedTerm = term.toLowerCase();
      // Second part: Filter the results in TypeScript
      const filteredOpportunityMatches = opportunities.filter(opportunity => {
        return (
          opportunity.nameID.toLowerCase().includes(lowerCasedTerm) ||
          opportunity.profile.displayName
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          opportunity.profile.tagline.toLowerCase().includes(lowerCasedTerm) ||
          opportunity.profile.description
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          opportunity.profile.tagsets?.some(tagset =>
            tagset.tags.map(tag => tag.toLowerCase()).includes(lowerCasedTerm)
          ) ||
          opportunity.context?.impact?.toLowerCase().includes(lowerCasedTerm) ||
          opportunity.context?.vision?.toLowerCase().includes(lowerCasedTerm) ||
          opportunity.context?.who?.toLowerCase().includes(lowerCasedTerm) ||
          opportunity.profile.location?.country
            .toLowerCase()
            .includes(lowerCasedTerm) ||
          opportunity.profile.location?.city
            .toLowerCase()
            .includes(lowerCasedTerm)
        );
      });
      // Only show challenges that the current user has read access to
      for (const opportunity of filteredOpportunityMatches) {
        if (
          opportunity.challenge?.parentSpace?.license?.visibility !==
            SpaceVisibility.ARCHIVED &&
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
        SearchResultType.OPPORTUNITY,
        SCORE_INCREMENT
      );
    }
  }

  async searchPostsByTerms(
    terms: string[],
    postResults: Map<number, Match>,
    agentInfo: AgentInfo,
    postIDsFilter: string[] | undefined
  ) {
    if (postIDsFilter && postIDsFilter.length === 0) {
      // no searching needed
      return;
    }
    for (const term of terms) {
      const readablePostMatches: Post[] = [];
      const postQuery = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.profile', 'profile')
        .leftJoinAndSelect('post.authorization', 'authorization');

      // Optionally restrict to search in just one Space
      if (postIDsFilter) {
        postQuery.where('post.id IN (:postsFilter)', {
          postsFilter: postIDsFilter,
        });
      }
      // Note that brackets are needed to nest the and
      postQuery
        .andWhere(
          new Brackets(qb => {
            qb.where('post.nameID like :term')
              .orWhere('profile.displayName like :term')
              .orWhere('profile.description like :term');
          })
        )
        .setParameters({ term: `%${term}%` });

      const postMatches = await postQuery.getMany();
      // Only show posts that the current user has read access to
      for (const post of postMatches) {
        if (
          this.authorizationService.isAccessGranted(
            agentInfo,
            post.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          readablePostMatches.push(post);
        }
      }
      // Create results for each match
      await this.buildMatchingResults(
        readablePostMatches,
        postResults,
        term,
        SearchResultType.POST,
        SCORE_INCREMENT
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
    postResults: Map<number, Match>,
    postIDsFilter: string[] | undefined,
    usersFilter: string[] | undefined,
    entityTypesFilter?: string[]
  ) {
    const [searchUsers, searchGroups, searchOrganizations, searchPosts] =
      await this.searchBy(agentInfo, entityTypesFilter);

    if (searchUsers) {
      await this.searchUsersByTagsets(terms, tagsets, userResults, usersFilter);
    }

    if (searchGroups) {
      await this.searchGroupsByTagsets(terms, tagsets, groupResults);
    }

    if (searchOrganizations) {
      await this.searchOrganizationsByTagsets(
        terms,
        tagsets,
        organizationResults
      );
    }

    if (searchPosts) {
      await this.searchPostsByTagsets(terms, postResults, postIDsFilter);
    }
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

      // Optionally restrict to search in just one Space
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
        SearchResultType.USER,
        SCORE_INCREMENT
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
        SearchResultType.USERGROUP,
        SCORE_INCREMENT
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
        SearchResultType.ORGANIZATION,
        SCORE_INCREMENT
      );
    }
  }

  async searchPostsByTagsets(
    terms: string[],
    postResults: Map<number, Match>,
    postIDsFilter: string[] = []
  ) {
    for (const term of terms) {
      const query = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.profile', 'profile')
        .leftJoinAndSelect('profile.tagsets', 'tagset')
        .where('find_in_set(:term, tagset.tags)')
        .setParameters({ term: `${term}` });

      if (postIDsFilter.length) {
        query
          .andWhere('post.id in (:postIDsFilter)')
          .setParameter('postIDsFilter', postIDsFilter.toString());
      }

      const postMatches = await query.getMany();

      // Create results for each match
      await this.buildMatchingResults(
        postMatches,
        postResults,
        term,
        SearchResultType.POST,
        SCORE_INCREMENT
      );
    }
  }

  async buildMatchingResults(
    rawMatches: any[],
    resultsMap: Map<number, Match>,
    term: string,
    type: SearchResultType,
    score: number
  ) {
    for (const rawMatch of rawMatches) {
      this.buildMatchingResult(rawMatch, resultsMap, term, type, score);
    }
  }

  async buildMatchingResult(
    rawMatch: any,
    resultsMap: Map<number, Match>,
    term: string,
    type: SearchResultType,
    score: number
  ) {
    const match = new Match();
    match.entity = rawMatch;
    match.terms.push(term);
    match.key = rawMatch.id;
    match.type = type;
    match.score = score;
    this.addMatchingResult(resultsMap, match);
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
          this.spaceService,
          this.challengeService,
          this.opportunityService,
          this.userService,
          this.organizationService,
          this.userGroupService,
          this.postService,
          this.calloutService,
          this.entityManager
        );
      const searchResultType = searchResultBase.type as SearchResultType;
      try {
        const searchResult = await searchResultBuilder[searchResultType](
          searchResultBase
        );
        searchResults.push(searchResult);
      } catch (error: any) {
        this.logger.error(
          `Unable to process search result: ${JSON.stringify(
            result
          )} - error: ${error}`,
          error?.stack,
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
      // Increment the score with the match being added
      existingMatch.score = existingMatch.score + match.score;
      // also add the term that was matched
      if (match.terms.length != 1)
        throw new ValidationException(
          'Expected exactly one matched term',
          LogContext.SEARCH
        );
      existingMatch.terms.push(match.terms[0]);
    } else {
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

  private async getIDFilters(searchInSpaceID: string | undefined): Promise<{
    spaceIDsFilter: string[] | undefined;
    challengeIDsFilter: string[] | undefined;
    opportunityIDsFilter: string[] | undefined;
    userIDsFilter: string[] | undefined;
    organizationIDsFilter: string[] | undefined;
    postIDsFilter: string[] | undefined;
  }> {
    let searchInSpace: ISpace | undefined = undefined;
    let spaceIDsFilter: string[] | undefined = undefined;
    let challengeIDsFilter: string[] | undefined = undefined;
    let opportunityIDsFilter: string[] | undefined = undefined;
    let userIDsFilter: string[] | undefined = undefined;
    let organizationIDsFilter: string[] | undefined = undefined;
    let postIDsFilter: string[] | undefined = undefined;
    if (searchInSpaceID) {
      searchInSpace = await this.spaceService.getSpaceOrFail(searchInSpaceID, {
        relations: { collaboration: true },
      });
      spaceIDsFilter = [searchInSpace.id];

      const challengesFilter = await this.getChallengesFilter(spaceIDsFilter);
      challengeIDsFilter = challengesFilter.map(challenge => challenge.id);
      const opportunitiesFilter = await this.getOpportunitiesFilter(
        spaceIDsFilter
      );
      opportunityIDsFilter = opportunitiesFilter.map(opp => opp.id);
      userIDsFilter = await this.getUsersFilter(searchInSpace);
      organizationIDsFilter = await this.getOrganizationsFilter(searchInSpace);
      postIDsFilter = await this.getPostsFilter(
        searchInSpace,
        challengesFilter,
        opportunitiesFilter
      );
    }
    return {
      spaceIDsFilter,
      challengeIDsFilter,
      opportunityIDsFilter,
      userIDsFilter,
      organizationIDsFilter,
      postIDsFilter,
    };
  }

  private async getChallengesFilter(
    spaceFilter: string[]
  ): Promise<IChallenge[]> {
    const challengesQuery = this.challengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.collaboration', 'collaboration')
      .where('challenge.spaceID IN (:spaceFilter)', {
        spaceFilter: spaceFilter,
      });

    return await challengesQuery.getMany();
  }

  private async getOpportunitiesFilter(
    spaceFilter: string[]
  ): Promise<IOpportunity[]> {
    const opportunitiesQuery = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.collaboration', 'collaboration')
      .where('opportunity.spaceID IN (:spaceFilter)', {
        spaceFilter: spaceFilter,
      });

    return await opportunitiesQuery.getMany();
  }

  private async getUsersFilter(searchInSpace: ISpace): Promise<string[]> {
    const usersFilter = [];
    const membersInSpace = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: searchInSpace.id,
    });
    for (const user of membersInSpace) {
      usersFilter.push(user.id);
    }
    const adminsInSpace = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: searchInSpace.id,
    });
    for (const user of adminsInSpace) {
      usersFilter.push(user.id);
    }
    return usersFilter;
  }

  private async getOrganizationsFilter(
    searchInSpace: ISpace
  ): Promise<string[]> {
    const organizationsFilter = [];
    const membersInSpace =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: searchInSpace.id,
      });
    for (const org of membersInSpace) {
      organizationsFilter.push(org.id);
    }
    const adminsInSpace =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: searchInSpace.id,
      });
    for (const org of adminsInSpace) {
      organizationsFilter.push(org.id);
    }
    const leadsInSpace =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_HOST,
        resourceID: searchInSpace.id,
      });
    for (const org of leadsInSpace) {
      organizationsFilter.push(org.id);
    }
    return organizationsFilter;
  }

  private async getPostsFilter(
    spaceFilter: ISpace,
    challengesFilter: IChallenge[],
    opportunitiesFilter: IOpportunity[]
  ): Promise<string[]> {
    // Get all the relevant collaborations
    const collaborationFilter = [spaceFilter.collaboration?.id];
    challengesFilter.forEach(c =>
      collaborationFilter.push(c.collaboration?.id)
    );
    opportunitiesFilter.forEach(c =>
      collaborationFilter.push(c.collaboration?.id)
    );

    // Get all the posts IDs in the Space
    const contributionsQuery = this.contributionRepository
      .createQueryBuilder('callout_contribution')
      .leftJoinAndSelect('callout_contribution.callout', 'callout')
      .leftJoinAndSelect('callout_contribution.post', 'post')
      .leftJoinAndSelect('callout.collaboration', 'collaboration')
      .where('callout.type IN (:postCalloutTypes)', {
        postCalloutTypes: [CalloutType.POST_COLLECTION],
      })
      .andWhere('collaboration.id IN (:collaborationFilter)', {
        collaborationFilter: collaborationFilter,
      });

    const contributionMatches = await contributionsQuery.getMany();
    const postMatches: string[] = [];
    contributionMatches.forEach(x => {
      if (x.post) return postMatches.push(x.post.id);
    });

    return postMatches;
  }
}
