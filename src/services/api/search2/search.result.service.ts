import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { groupBy, intersection, orderBy } from 'lodash';
import { Space } from '@domain/space/space/space.entity';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from '@services/api/search/dto/search.result.dto.entry.challenge';
import { ISpace } from '@domain/space/space/space.interface';
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
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { SpaceLevel } from '@common/enums/space.level';

export type PostParents = {
  post: IPost;
  callout: ICallout;
  space: ISpace;
  subspace: ISpace | undefined;
  subsubspace: ISpace | undefined;
};

export type PostParentIDs = {
  postID: string;
  calloutID: string;
  spaceID: string;
  subspaceID: string | undefined;
  subsubspaceID: string | undefined;
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
    const [spaces, subspaces, subsubspaces, users, organizations, posts] =
      await Promise.all([
        this.getSpaceSearchResults(
          groupedResults.space ?? [],
          agentInfo,
          spaceId
        ),
        this.getChallengeSearchResults(
          groupedResults.challenge ?? [],
          agentInfo
        ),
        this.getOpportunitySearchResults(
          groupedResults.opportunity ?? [],
          agentInfo
        ),
        this.getUserSearchResults(groupedResults.user ?? [], spaceId),
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
      [...spaces, ...subspaces, ...subsubspaces],
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

        // no authorization check - all spaces must be visible
        // context, profile and others are readable by all

        return {
          ...rawSearchResult,
          space: space as ISpace,
        };
      })
      .filter((space): space is ISearchResultSpace => !!space);
  }

  public async getChallengeSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultChallenge[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const subspaceIds = rawSearchResults.map(hit => hit.result.id);

    const subspaces = await this.entityManager.find(Space, {
      where: { id: In(subspaceIds), level: SpaceLevel.CHALLENGE },
      relations: { parentSpace: true },
      select: { id: true, parentSpace: { id: true } },
    });

    return subspaces
      .map<ISearchResultChallenge | undefined>(subspace => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === subspace.id
        );

        if (!rawSearchResult) {
          const error = new BaseException(
            'Unable to find raw search result for Challenge',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              challengeId: subspace.id,
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
            subspace.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        if (!subspace.parentSpace) {
          const error = new BaseException(
            'Unable to find parent space for challenge while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.ENTITY_NOT_INITIALIZED,
            {
              challengeId: subspace.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
          this.logger.error(error, error.stack, LogContext.SEARCH);
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            subspace.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          subspace: subspace as ISpace,
          space: subspace.parentSpace as ISpace,
        };
      })
      .filter((challenge): challenge is ISearchResultChallenge => !!challenge);
  }

  public async getOpportunitySearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultChallenge[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const subsubspaceIds = rawSearchResults.map(hit => hit.result.id);

    const subsubspaces = await this.entityManager.find(Space, {
      where: {
        id: In(subsubspaceIds),
        level: SpaceLevel.OPPORTUNITY,
      },
      relations: { parentSpace: { parentSpace: true } },
      select: { parentSpace: { id: true, parentSpace: { id: true } } },
    });

    return subsubspaces
      .map<ISearchResultChallenge | undefined>(subsubspace => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === subsubspace.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Opportunity: ${subsubspace.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            subsubspace.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        if (!subsubspace.parentSpace) {
          throw new BaseException(
            'Unable to find parent challenge for opportunity while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              opportunityId: subsubspace.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        if (!subsubspace.parentSpace.parentSpace) {
          throw new BaseException(
            'Unable to find parent space for challenge while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              challengeId: subsubspace.parentSpace.id,
              opportunityId: subsubspace.id,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
        }

        if (
          !this.authorizationService.isAccessGranted(
            agentInfo,
            subsubspace.authorization,
            AuthorizationPrivilege.READ
          )
        ) {
          return undefined;
        }

        return {
          ...rawSearchResult,
          opportunity: subsubspace as ISpace,
          subspace: subsubspace.parentSpace as ISpace,
          space: subsubspace.parentSpace.parentSpace as ISpace,
        };
      })
      .filter(
        (opportunity): opportunity is ISearchResultOpportunity => !!opportunity
      );
  }

  public async getUserSearchResults(
    rawSearchResults: ISearchResult[],
    spaceId?: string
  ): Promise<ISearchResultUser[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const usersFromSearch = rawSearchResults.map(hit => hit.result.id);
    const usersInSpace = spaceId ? await this.getUsersInSpace(spaceId) : [];
    const userIdsIntersection = spaceId
      ? intersection(usersFromSearch, usersInSpace)
      : usersFromSearch;

    const users = await this.entityManager.findBy(User, {
      id: In(userIdsIntersection),
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
    const orgIdsIntersection = spaceId
      ? intersection(orgsInSearch, orgsInSpace)
      : orgsInSearch;

    const organizations = await this.entityManager.findBy(Organization, {
      id: In(orgIdsIntersection),
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
    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized post first, then get the parents, and map the results
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
          subspace: postParent.subspace,
          post: postParent.post,
        };
      })
      .filter((post): post is ISearchResultPost => !!post);
  }

  private async getPostParents(posts: Post[]): Promise<PostParents[]> {
    const postParents: PostParents[] = [];
    if (!posts.length) {
      return postParents;
    }
    for (const post of posts) {
      const callout = await this.entityManager.findOne(Callout, {
        where: {
          contributions: {
            post: {
              id: post.id,
            },
          },
        },
      });
      if (!callout) {
        throw new RelationshipNotFoundException(
          `Unable to find callout for post: ${post.id}`,
          LogContext.SEARCH
        );
      }
      const space = await this.entityManager.findOne(Space, {
        where: {
          collaboration: {
            callouts: {
              id: callout.id,
            },
          },
        },
        relations: {
          parentSpace: {
            parentSpace: true,
          },
        },
      });
      if (!space) {
        throw new RelationshipNotFoundException(
          `Unable to find space parents for callout${callout.id}`,
          LogContext.SEARCH
        );
      }

      postParents.push({
        post,
        callout,
        space,
        subspace: space.parentSpace,
        subsubspace: space.parentSpace?.parentSpace,
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
