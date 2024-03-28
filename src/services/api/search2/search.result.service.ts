import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { groupBy, union, orderBy } from 'lodash';
import { Space } from '@domain/challenge/space/space.entity';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from '@services/api/search/dto/search.result.dto.entry.challenge';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IOpportunity, Opportunity } from '@domain/challenge/opportunity';
import { BaseException } from '@common/exceptions/base.exception';
import {
  AlkemioErrorStatus,
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ISearchResultOpportunity } from '@services/api/search/dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from '@services/api/search/dto/search.result.dto.entry.user';
import { IUser, User } from '@domain/community/user';
import { ISearchResultOrganization } from '@services/api/search/dto/search.result.dto.entry.organization';
import { IOrganization, Organization } from '@domain/community/organization';
import { ISearchResults } from '@services/api/search/dto/search.result.dto';
import { ISearchResultPost } from '@services/api/search/dto/search.result.dto.entry.post';
import { IPost, Post } from '@domain/collaboration/post';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { OrganizationService } from '@domain/community/organization/organization.service';

export type PostParents = {
  post: IPost;
  callout: ICallout;
  space: ISpace;
  challenge: IChallenge | undefined;
  opportunity: IOpportunity | undefined;
};

export type PostParentIDs = {
  postID: string;
  calloutID: string;
  spaceID: string;
  challengeID: string | undefined;
  opportunityID: string | undefined;
};

@Injectable()
export class SearchResultService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private organizationService: OrganizationService
  ) {}

  /**
   * Resolves search results by authorizing and enriching them with data.
   * @param rawSearchResults The raw search results from the search engine.
   * @param agentInfo The agent info of the user making the search request.
   * @param spaceId The space ID to filter the search results by.
   */
  public async resolveSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    spaceId?: string
  ): Promise<ISearchResults> {
    const groupedResults = groupBy(rawSearchResults, 'type');
    // authorize entities with requester and enrich with data
    const [spaces, challenges, opportunities, users, organizations, posts] =
      await Promise.all([
        this.getSpaceSearchResults(
          groupedResults.space ?? [],
          agentInfo,
          spaceId
        ),
        this.getChallengeSearchResults(
          groupedResults.challenge ?? [],
          agentInfo,
          spaceId
        ),
        this.getOpportunitySearchResults(
          groupedResults.opportunity ?? [],
          agentInfo,
          spaceId
        ),
        this.getUserSearchResults(
          groupedResults.user ?? [],
          agentInfo,
          spaceId
        ),
        this.getOrganizationSearchResults(
          groupedResults.organization ?? [],
          agentInfo,
          spaceId
        ),
        this.getPostSearchResults(groupedResults.post ?? [], agentInfo),
      ]);
    // todo: count - https://github.com/alkem-io/server/issues/3700
    const contributorResults = orderBy(
      [...users, ...organizations],
      'score',
      'desc'
    );
    const contributionResults = orderBy([...posts], 'score', 'desc');
    const journeyResults = orderBy(
      [...spaces, ...challenges, ...opportunities],
      'score',
      'desc'
    );
    return {
      contributorResults,
      contributorResultsCount: -1,
      contributionResults,
      contributionResultsCount: -1,
      journeyResults,
      journeyResultsCount: -1,
      groupResults: [],
      calloutResults: [],
    };
  }

  // todo: heavy copy-pasting below: must be refactored
  public async getSpaceSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    spaceId?: string
  ): Promise<ISearchResultSpace[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    if (spaceId) {
      const space = await this.entityManager.findOneByOrFail(Space, {
        id: spaceId,
      });

      return [{ ...rawSearchResults[0], space }];
    }

    const spaceIds = rawSearchResults.map(hit => hit.result.id);

    const spaces = await this.entityManager.findBy(Space, {
      id: In(spaceIds),
    });

    return spaces
      .map<ISearchResultSpace | undefined>(space => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === space.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for space: ${space.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            space.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          space: space as ISpace,
        };
      })
      .filter((space): space is ISearchResultSpace => !!space);
  }

  public async getChallengeSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    spaceId?: string
  ): Promise<ISearchResultChallenge[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const challengeIds = rawSearchResults.map(hit => hit.result.id);

    const challenges = await this.entityManager.find(Challenge, {
      where: { id: In(challengeIds), space: { id: spaceId } },
      relations: { space: true },
      select: { id: true, space: { id: true } },
    });

    return challenges
      .map<ISearchResultChallenge | undefined>(challenge => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === challenge.id
        );

        if (!rawSearchResult) {
          const error = new BaseException(
            'Unable to find raw search result for Challenge',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              challengeId: challenge.id,
              cause:
                'Challenge is not found in the return search results. Can not guess the cause',
            }
          );
          this.logger.error(error, error.stack, LogContext.SEARCH);
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            challenge.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        if (!challenge.space) {
          const error = new BaseException(
            'Unable to find parent space for challenge while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.ENTITY_NOT_INITIALIZED,
            {
              challengeId: challenge.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
          this.logger.error(error, error.stack, LogContext.SEARCH);
          return undefined;
        }

        return {
          ...rawSearchResult,
          challenge: challenge as IChallenge,
          space: challenge.space as ISpace,
        };
      })
      .filter((challenge): challenge is ISearchResultChallenge => !!challenge);
  }

  public async getOpportunitySearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    spaceId?: string
  ): Promise<ISearchResultChallenge[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const opportunityIds = rawSearchResults.map(hit => hit.result.id);

    const opportunities = await this.entityManager.find(Opportunity, {
      where: { id: In(opportunityIds), challenge: { space: { id: spaceId } } },
      relations: { challenge: { space: true } },
      select: { challenge: { id: true, space: { id: true } } },
    });

    return opportunities
      .map<ISearchResultChallenge | undefined>(opportunity => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === opportunity.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Opportunity: ${opportunity.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            opportunity.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        if (!opportunity.challenge) {
          throw new BaseException(
            'Unable to find parent challenge for opportunity while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              opportunityId: opportunity.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        if (!opportunity.challenge.space) {
          throw new BaseException(
            'Unable to find parent space for challenge while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              challengeId: opportunity.challenge.id,
              opportunityId: opportunity.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        return {
          ...rawSearchResult,
          opportunity: opportunity as IOpportunity,
          challenge: opportunity.challenge as IChallenge,
          space: opportunity.challenge.space as ISpace,
        };
      })
      .filter(
        (opportunity): opportunity is ISearchResultOpportunity => !!opportunity
      );
  }

  public async getUserSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    spaceId?: string
  ): Promise<ISearchResultUser[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const usersFromSearch = rawSearchResults.map(hit => hit.result.id);
    const usersInSpace = spaceId ? await this.getUsersInSpace(spaceId) : [];
    const userIdsUnion = union(usersFromSearch, usersInSpace);

    const users = await this.entityManager.findBy(User, {
      id: In(userIdsUnion),
    });

    return users
      .map<ISearchResultUser | undefined>(user => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === user.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for User: ${user.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }
        // no auth check - these results will only be visible to authorized users
        return {
          ...rawSearchResult,
          user: user as IUser,
        };
      })
      .filter((user): user is ISearchResultUser => !!user);
  }

  public async getOrganizationSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    spaceId?: string
  ): Promise<ISearchResultOrganization[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const orgsInSearch = rawSearchResults.map(hit => hit.result.id);
    const orgsInSpace = spaceId
      ? await this.getOrganizationsInSpace(spaceId)
      : [];
    const orgIdsUnion = union(orgsInSearch, orgsInSpace);

    const organizations = await this.entityManager.findBy(Organization, {
      id: In(orgIdsUnion),
    });

    return organizations
      .map<ISearchResultOrganization | undefined>(org => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === org.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Organization: ${org.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            org.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          organization: org as IOrganization,
        };
      })
      .filter((org): org is ISearchResultOrganization => !!org);
  }

  public async getPostSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultPost[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const postIds = rawSearchResults.map(hit => hit.result.id);

    const posts = await this.entityManager.findBy(Post, {
      id: In(postIds),
    });

    const authorizedPosts = posts.filter(post =>
      this.authorizationService.isAccessGranted(
        agentInfo,
        post.authorization,
        AuthorizationPrivilege.READ
      )
    );

    const postParents = await this.getPostParents(authorizedPosts);

    return postParents
      .map<ISearchResultPost | undefined>(postParent => {
        // for (const postParent of postParents) {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === postParent.post.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Post: ${postParent.post.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        return {
          ...rawSearchResult,
          callout: postParent.callout,
          space: postParent.space,
          challenge: postParent.challenge,
          post: postParent.post,
        };
      })
      .filter((post): post is ISearchResultPost => !!post);
  }

  private async getPostParents(posts: Post[]): Promise<PostParents[]> {
    if (!posts.length) {
      return [];
    }

    const postIdsFormatted = posts.map(({ id }) => `'${id}'`).join(',');
    const queryResult: PostParentIDs[] = await this.entityManager.connection
      .query(`
        SELECT \`post\`.\`id\` as postID, \`space\`.\`id\` as \`spaceID\`, \`challenge\`.\`id\` as \`challengeID\`, null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
        RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
        JOIN \`space\` on \`challenge\`.\`spaceID\` = \`space\`.\`id\`
        JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
        JOIN \`post\` on \`post\`.\`id\` = \`callout_contribution\`.\`postId\`
        WHERE \`post\`.\`id\` in (${postIdsFormatted}) UNION

        SELECT \`post\`.\`id\` as postID, \`space\`.\`id\` as \`spaceID\`, null as \'challengeID\', null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\`  FROM \`callout\`
        RIGHT JOIN \`space\` on \`space\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
        JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
        JOIN \`post\` on \`post\`.\`id\` = \`callout_contribution\`.\`postId\`
        WHERE \`post\`.\`id\` in (${postIdsFormatted}) UNION

        SELECT \`post\`.\`id\` as postID, \`space\`.\`id\` as \`spaceID\`, \`challenge\`.\`id\` as \`challengeID\`, \`opportunity\`.\`id\` as \`opportunityID\`, \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
        RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
        JOIN \`challenge\` on \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
        JOIN \`account\` on \`opportunity\`.\`accountId\` = \`account\`.\`id\`
        JOIN \`space\` on \`account\`.\`id\` = \`space\`.\`accountId\`
        JOIN \`callout_contribution\` on \`callout\`.\`id\` = \`callout_contribution\`.\`calloutId\`
        JOIN \`post\` on \`post\`.\`id\` = \`callout_contribution\`.\`postId\`
        WHERE \`post\`.\`id\` in (${postIdsFormatted});
      `);

    const postParents: PostParents[] = [];
    for (const result of queryResult) {
      const [callout, space, challenge, opportunity] = await Promise.all([
        this.entityManager.findOneByOrFail(Callout, { id: result.calloutID }),
        this.entityManager.findOneByOrFail(Space, { id: result.spaceID }),
        this.entityManager
          .findOneBy(Challenge, { id: result.challengeID })
          .then(x => (x === null ? undefined : x)),
        this.entityManager
          .findOneBy(Opportunity, {
            id: result.opportunityID,
          })
          .then(x => (x === null ? undefined : x)),
      ]);
      const post = posts.find(post => post.id === result.postID);

      if (!post) {
        throw new BaseException(
          'Post not found in Posts array while building search results',
          LogContext.SEARCH,
          AlkemioErrorStatus.NOT_FOUND,
          {
            postID: result.postID,
            cause:
              'Post is not found in the return search results. Cause unknown',
          }
        );
      }

      postParents.push({
        post,
        callout,
        space,
        challenge,
        opportunity,
      });
    }

    return postParents;
  }

  private async getUsersInSpace(spaceId: string): Promise<string[]> {
    const usersFilter = [];

    const membersInSpace = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: spaceId,
    });
    usersFilter.push(...membersInSpace.map(user => user.id));

    const adminsInSpace = await this.userService.usersWithCredentials({
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: spaceId,
    });
    usersFilter.push(...adminsInSpace.map(user => user.id));

    return usersFilter;
  }

  private async getOrganizationsInSpace(spaceId: string): Promise<string[]> {
    const orgsInSpace = [];

    const membersInSpace =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: spaceId,
      });
    orgsInSpace.push(...membersInSpace.map(org => org.id));

    const adminsInSpace =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: spaceId,
      });
    orgsInSpace.push(...adminsInSpace.map(org => org.id));

    const leadsInSpace =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_LEAD,
        resourceID: spaceId,
      });
    orgsInSpace.push(...leadsInSpace.map(org => org.id));

    return orgsInSpace;
  }
}
