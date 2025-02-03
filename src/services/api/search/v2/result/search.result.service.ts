import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { groupBy, intersection, orderBy } from 'lodash';
import { Space } from '@domain/space/space/space.entity';
import {
  ISearchResult,
  ISearchResultCallout,
  ISearchResultSpace,
} from '../../dto';
import { ISpace } from '@domain/space/space/space.interface';
import { BaseException } from '@common/exceptions/base.exception';
import {
  AlkemioErrorStatus,
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization, Organization } from '@domain/community/organization';
import { Post } from '@domain/collaboration/post';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  ISearchResults,
  ISearchResultOrganization,
  ISearchResultUser,
  ISearchResultPost,
} from '../../dto';
import { SearchEntityTypes } from '@services/api/search/search.entity.types';
import { User } from '@domain/community/user/user.entity';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { CalloutsSetType } from '@common/enums/callouts.set.type';

type PostParents = {
  post: Post;
  callout: Callout;
  space: Space;
};

type CalloutParents = {
  callout: Callout;
  space: Space;
};

@Injectable()
export class SearchResultService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private authorizationService: AuthorizationService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService
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
    const groupedResults = groupBy(rawSearchResults, 'type') as Record<
      Partial<SearchEntityTypes>,
      ISearchResult[]
    >;
    // authorize entities with requester and enrich with data
    const [
      spaces,
      subspaces,
      users,
      organizations,
      posts,
      callouts,
      calloutsOfWhiteboards,
    ] = await Promise.all([
      this.getSpaceSearchResults(groupedResults.space ?? [], spaceId),
      this.getSubspaceSearchResults(groupedResults.subspace ?? [], agentInfo),
      this.getUserSearchResults(groupedResults.user ?? [], spaceId),
      this.getOrganizationSearchResults(
        groupedResults.organization ?? [],
        agentInfo,
        spaceId
      ),
      this.getPostSearchResults(groupedResults.post ?? [], agentInfo),
      this.getCalloutSearchResult(groupedResults.callout ?? [], agentInfo),
      this.getWhiteboardSearchResult(
        groupedResults.whiteboard ?? [],
        agentInfo
      ),
    ]);
    // todo: count - https://github.com/alkem-io/server/issues/3700
    const contributorResults = orderBy(
      [...users, ...organizations],
      'score',
      'desc'
    );
    const contributionResults = orderBy(posts, 'score', 'desc');
    const journeyResults = orderBy([...spaces, ...subspaces], 'score', 'desc');
    const calloutResults = orderBy(
      [...callouts, ...calloutsOfWhiteboards],
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
      calloutResults,
      calloutResultsCount: -1,
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
      where: {
        id: In(subspaceIds),
      },
      relations: { parentSpace: true },
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
  // the method returns Callouts until the proper search result is returned
  private async getWhiteboardSearchResult(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultCallout[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const whiteboardIds = rawSearchResults.map(hit => hit.result.id);

    const callouts = await this.entityManager.find(Callout, {
      where: [
        {
          framing: {
            whiteboard: {
              id: In(whiteboardIds),
            },
          },
        },
        {
          contributions: {
            whiteboard: {
              id: In(whiteboardIds),
            },
          },
        },
      ],
      relations: {
        framing: { whiteboard: true },
        contributions: { whiteboard: true },
      },
      select: {
        id: true,
        framing: {
          id: true,
          whiteboard: {
            id: true,
          },
        },
        contributions: {
          id: true,
          whiteboard: {
            id: true,
          },
          post: { id: true },
        },
      },
    });
    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized post first, then get the parents, and map the results
    const authorizedCallouts = callouts.filter(callout =>
      this.authorizationService.isAccessGranted(
        agentInfo,
        callout.authorization,
        AuthorizationPrivilege.READ
      )
    );

    const parents = await this.getCalloutParents(authorizedCallouts);

    return parents
      .map<ISearchResultCallout | undefined>(parent => {
        const rawSearchResult = rawSearchResults.find(
          hit =>
            hit.result.id === parent.callout.framing.whiteboard?.id ||
            parent.callout.contributions?.some(
              contribution => hit.result.id === contribution.whiteboard?.id
            )
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Whiteboard: ${parent.callout.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        return {
          ...rawSearchResult,
          // todo remove when whiteboard is a separate search result
          // patch this so it displays the search result as a callout
          type: SearchEntityTypes.CALLOUT,
          callout: parent.callout,
          space: parent.space,
        };
      })
      .filter((callout): callout is ISearchResultCallout => !!callout);
  }

  private async getCalloutSearchResult(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultCallout[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const calloutIds = rawSearchResults.map(hit => hit.result.id);

    const callouts = await this.entityManager.findBy(Callout, {
      id: In(calloutIds),
    });
    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized post first, then get the parents, and map the results
    const authorizedCallouts = callouts.filter(callout =>
      this.authorizationService.isAccessGranted(
        agentInfo,
        callout.authorization,
        AuthorizationPrivilege.READ
      )
    );

    const parents = await this.getCalloutParents(authorizedCallouts);

    return parents
      .map<ISearchResultCallout | undefined>(parent => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === parent.callout.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            `Unable to find raw search result for Callout: ${parent.callout.id}`,
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        return {
          ...rawSearchResult,
          callout: parent.callout,
          space: parent.space,
        };
      })
      .filter((callout): callout is ISearchResultCallout => !!callout);
  }

  private async filterCalloutsBySetType(
    callouts: ICallout[],
    setType: CalloutsSetType
  ): Promise<ICallout[]> {
    const calloutIds = callouts.map(callout => callout.id);
    const calloutsWithSet = await this.entityManager.find(Callout, {
      where: {
        id: In(calloutIds),
      },
      select: {
        id: true,
        nameID: true,
        type: true,
        calloutsSet: {
          id: true,
          type: true,
        },
      },
      relations: {
        calloutsSet: true,
      },
    });
    const calloutsInSetType = calloutsWithSet.filter(
      c => c.calloutsSet?.type === setType
    );
    return calloutsInSetType;
  }

  private async getCalloutParents(
    callouts: Callout[]
  ): Promise<CalloutParents[]> {
    const spaceCallouts = await this.filterCalloutsBySetType(
      callouts,
      CalloutsSetType.COLLABORATION
    );
    const spaceCalloutIds = spaceCallouts.map(callout => callout.id);

    const parentSpaces = await this.entityManager.find(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              id: In(spaceCalloutIds),
            },
          },
        },
      },
      relations: {
        collaboration: {
          calloutsSet: {
            callouts: true,
          },
        },
      },
      select: {
        id: true,
        level: true,
        collaboration: {
          id: true,
          calloutsSet: {
            id: true,
            callouts: {
              id: true,
            },
          },
        },
      },
    });

    return spaceCallouts
      .map(callout => {
        const space = parentSpaces.find(space =>
          space?.collaboration?.calloutsSet?.callouts?.some(
            spaceCallout => spaceCallout.id === callout.id
          )
        );

        if (!space) {
          this.logger.error(
            `Unable to find Space parent for Callout: ${callout.id}`,
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        return {
          callout,
          space,
        };
      })
      .filter((x): x is CalloutParents => !!x);
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
          calloutsSet: {
            callouts: {
              id: In(calloutIds),
            },
          },
        },
      },
      relations: {
        collaboration: {
          calloutsSet: {
            callouts: true,
          },
        },
      },
      select: {
        id: true,
        type: true,
        level: true,
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
            allowMembersToCreateCallouts: true,
            allowMembersToCreateSubspaces: true,
            inheritMembershipRights: true,
          },
          membership: {
            allowSubspaceAdminsToInviteMembers: true,
            policy: true,
          },
          privacy: { allowPlatformSupportAsAdmin: true, mode: true },
        },
        visibility: true,
        collaboration: {
          id: true,
          calloutsSet: {
            callouts: {
              id: true,
            },
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
          space?.collaboration?.calloutsSet?.callouts?.some(
            spaceCallout => spaceCallout.id === callout.id
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

    const membersInSpace = await this.userLookupService.usersWithCredentials({
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: spaceId,
    });
    usersFilter.push(...membersInSpace.map(user => user.id));

    const adminsInSpace = await this.userLookupService.usersWithCredentials({
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: spaceId,
    });
    usersFilter.push(...adminsInSpace.map(user => user.id));

    return usersFilter;
  }

  private async getOrganizationsInSpace(spaceId: string): Promise<string[]> {
    const orgsInSpace = [];

    const membersInSpace =
      await this.organizationLookupService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: spaceId,
      });
    orgsInSpace.push(...membersInSpace.map(org => org.id));

    const adminsInSpace =
      await this.organizationLookupService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: spaceId,
      });
    orgsInSpace.push(...adminsInSpace.map(org => org.id));

    const leadsInSpace =
      await this.organizationLookupService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_LEAD,
        resourceID: spaceId,
      });
    orgsInSpace.push(...leadsInSpace.map(org => org.id));

    return orgsInSpace;
  }
}
