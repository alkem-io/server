import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { groupBy, intersection, orderBy } from 'lodash';
import { Space } from '@domain/space/space/space.entity';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISpace } from '@domain/space/space/space.interface';
import { BaseException } from '@common/exceptions/base.exception';
import {
  AlkemioErrorStatus,
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ISearchResultUser } from '@services/api/search/dto/search.result.dto.entry.user';
import { IUser, User } from '@domain/community/user';
import { ISearchResultOrganization } from '@services/api/search/dto/search.result.dto.entry.organization';
import { IOrganization, Organization } from '@domain/community/organization';
import { ISearchResults } from '@services/api/search/dto/search.result.dto';
import { ISearchResultPost } from '@services/api/search/dto/search.result.dto.entry.post';
import { Post } from '@domain/collaboration/post';
import { Callout } from '@domain/collaboration/callout';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { SpaceType } from '@common/enums/space.type';

type PostParents = {
  post: Post;
  callout: Callout;
  space: Space;
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
    const [
      spacesLevel0,
      spacesLevel1,
      spacesLevel2,
      users,
      organizations,
      posts,
    ] = await Promise.all([
      this.getSpaceSearchResults(groupedResults.space ?? [], spaceId),
      this.getSubspaceSearchResults(
        groupedResults[SpaceType.CHALLENGE] ?? [],
        agentInfo
      ),
      this.getSubspaceSearchResults(
        groupedResults[SpaceType.OPPORTUNITY] ?? [],
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
    const contributionResults = orderBy(posts, 'score', 'desc');
    const journeyResults = orderBy(
      [...spacesLevel0, ...spacesLevel1, ...spacesLevel2],
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

  public async getSubspaceSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultSpace[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const subspaceIds = rawSearchResults.map(hit => hit.result.id);

    const subspaces = await this.entityManager.find(Space, {
      where: { id: In(subspaceIds) },
      relations: { parentSpace: true },
      select: {
        id: true,
        type: true,
        parentSpace: { id: true, type: true },
      },
    });

    return subspaces
      .map<ISearchResultSpace | undefined>(subspace => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === subspace.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Subspace: ${subspace.id}`,
            undefined,
            LogContext.SEARCH
          );
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
            'Unable to find parent space for subspace while building search results',
            LogContext.SEARCH,
            AlkemioErrorStatus.NOT_FOUND,
            {
              subspaceId: subspace.id,
              level: subspace.level,
              cause: 'Relation is not loaded. Could be due to broken data',
            }
          );
          this.logger.error(error, error.stack, LogContext.SEARCH_RESULT);

          return undefined;
        }

        return {
          ...rawSearchResult,
          space: subspace as ISpace,
          parentSpace: subspace.parentSpace as ISpace,
        };
      })
      .filter((subspace): subspace is ISearchResultSpace => !!subspace);
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
          post: postParent.post,
        };
      })
      .filter((post): post is ISearchResultPost => !!post);
  }

  private async getPostParents(posts: Post[]): Promise<PostParents[]> {
    if (!posts.length) {
      return [];
    }

    const postIds = posts.map(post => post.id);

    const callouts = await this.entityManager.find(Callout, {
      where: {
        contributions: {
          post: {
            id: In(postIds),
          },
        },
      },
      relations: {
        contributions: {
          post: true,
        },
      },
      select: {
        id: true,
        contributions: {
          id: true,
          post: {
            id: true,
          },
        },
      },
    });
    const calloutIds = callouts.map(callout => callout.id);

    const spaces = await this.entityManager.find(Space, {
      where: {
        collaboration: {
          callouts: {
            id: In(calloutIds),
          },
        },
      },
      relations: {
        collaboration: {
          callouts: true,
        },
      },
      select: {
        id: true,
        type: true,
        collaboration: {
          id: true,
          callouts: {
            id: true,
          },
        },
      },
    });

    return posts
      .map(post => {
        const callout = callouts.find(callout =>
          callout?.contributions?.some(
            contribution => contribution?.post?.id === post.id
          )
        );

        if (!callout) {
          this.logger.error(
            `Unable to find Callout parent for Post: ${post.id}`,
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        const space = spaces.find(space =>
          space?.collaboration?.callouts?.some(
            callout => callout.id === callout.id
          )
        );

        if (!space) {
          this.logger.error(
            `Unable to find Space parent for Post: ${post.id}`,
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        return {
          post,
          callout,
          space,
        };
      })
      .filter((x): x is PostParents => !!x);
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
