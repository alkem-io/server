import {
  AlkemioErrorStatus,
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { BaseException } from '@common/exceptions/base.exception';
import { isDefined } from '@common/utils';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.entity';
import { Post } from '@domain/collaboration/post';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { IOrganization, Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { SearchFilterInput } from '@services/api/search/dto/inputs';
import { SearchCategory } from '@services/api/search/search.category';
import { calculateSearchCursor } from '@services/api/search/util';
import { groupBy, intersection, orderBy } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, In } from 'typeorm';
import {
  ISearchResult,
  ISearchResultCallout,
  ISearchResultCollaboraDocument,
  ISearchResultMemo,
  ISearchResultOrganization,
  ISearchResultPost,
  ISearchResultSpace,
  ISearchResults,
  ISearchResultUser,
  ISearchResultWhiteboard,
} from '../dto/results';
import { SearchResultType } from '../search.result.type';

type PostParents = {
  post: Post;
  callout: Callout;
  space: Space;
};

type MemoParents = {
  memo: Memo;
  isContribution: boolean;
  callout: Callout;
  space: Space;
};

type WhiteboardParents = {
  whiteboard: Whiteboard;
  isContribution: boolean;
  callout: Callout;
  space: Space;
};

type CollaboraDocumentParents = {
  collaboraDocument: CollaboraDocument;
  isContribution: boolean;
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
    private actorLookupService: ActorLookupService
  ) {}

  /**
   * Resolves search results by authorizing and enriching them with data.
   * @param rawSearchResults The raw search results from the search engine.
   * @param actorContext The agent info of the user making the search request.
   * @param filters Used to filter the end results.
   * @param spaceId The space ID to filter the search results by.
   * @param options.foldToCallouts When true — set by a flow-state scoped search
   *   or by the `foldCalloutResources` opt-in — matching posts/whiteboards/memos
   *   are folded up to their containing callout and merged into `calloutResults`,
   *   deduped by callout id (FR-017).
   */
  public async resolveSearchResults(
    rawSearchResults: ISearchResult[],
    actorContext: ActorContext,
    filters: SearchFilterInput[],
    spaceId?: string,
    options?: { foldToCallouts?: boolean }
  ): Promise<ISearchResults> {
    const groupedResults = groupBy(rawSearchResults, 'type') as Record<
      Partial<SearchResultType>,
      ISearchResult[]
    >;
    // authorize entities with requester and enrich with data
    const [
      spaces,
      subspaces,
      users,
      organizations,
      callouts,
      posts,
      whiteboards,
      memos,
      collaboraDocuments,
    ] = await Promise.all([
      this.getSpaceSearchResults(groupedResults.space ?? [], spaceId),
      this.getSubspaceSearchResults(
        groupedResults.subspace ?? [],
        actorContext
      ),
      this.getUserSearchResults(groupedResults.user ?? [], spaceId),
      this.getOrganizationSearchResults(
        groupedResults.organization ?? [],
        actorContext,
        spaceId
      ),
      this.getCalloutSearchResult(groupedResults.callout ?? [], actorContext),
      this.getPostSearchResults(groupedResults.post ?? [], actorContext),
      this.getWhiteboardSearchResults(
        groupedResults.whiteboard ?? [],
        actorContext
      ),
      this.getMemoSearchResults(groupedResults.memo ?? [], actorContext),
      this.getCollaboraDocumentSearchResults(
        groupedResults.collabora_document ?? [],
        actorContext
      ),
    ]);
    const filtersByCategory = groupBy(filters, 'category') as Record<
      SearchCategory,
      SearchFilterInput[]
    >;
    const actorResults = buildResults(
      filtersByCategory.contributors?.[0],
      users,
      organizations
    );
    // callout framings. When foldToCallouts widened the search to pull these
    // indices purely to fold them into callouts, the framings category is not in
    // the requested filters; in that case this bucket stays empty so the hits
    // surface only as folded callouts (and aren't dumped here unbounded).
    const framingResults = filtersByCategory.framings?.[0]
      ? buildResults(
          filtersByCategory.framings[0],
          whiteboards.filter(whiteboard => !whiteboard.isContribution),
          memos.filter(memo => !memo.isContribution),
          collaboraDocuments.filter(doc => !doc.isContribution)
        )
      : emptyResultSet();
    // contributions include posts, whiteboards, memos, and collabora documents.
    // Same guard as framings.
    const contributionResults = filtersByCategory.contributions?.[0]
      ? buildResults(
          filtersByCategory.contributions[0],
          posts,
          whiteboards.filter(whiteboard => whiteboard.isContribution),
          memos.filter(memo => memo.isContribution),
          collaboraDocuments.filter(doc => doc.isContribution)
        )
      : emptyResultSet();
    const spaceResults = buildResults(
      filtersByCategory.spaces?.[0],
      spaces,
      subspaces
    );
    const calloutResults = options?.foldToCallouts
      ? buildFoldedCalloutResults(
          filtersByCategory['collaboration-tools']?.[0],
          callouts,
          posts,
          whiteboards,
          memos,
          collaboraDocuments
        )
      : buildResults(filtersByCategory['collaboration-tools']?.[0], callouts);

    return {
      actorResults,
      contributionResults,
      framingResults,
      spaceResults,
      calloutResults,
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
    actorContext: ActorContext
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
            actorContext,
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
    actorContext: ActorContext,
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
            actorContext,
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
    actorContext: ActorContext
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
        actorContext,
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

  private async getWhiteboardSearchResults(
    rawSearchResults: ISearchResult[],
    actorContext: ActorContext
  ): Promise<ISearchResultWhiteboard[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const whiteboardIds = rawSearchResults.map(hit => hit.result.id);

    const whiteboards = await this.entityManager.findBy(Whiteboard, {
      id: In(whiteboardIds),
    });

    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized whiteboard first, then get the parents, and map the results
    const authorizedWhiteboards = whiteboards.filter(whiteboard =>
      this.authorizationService.isAccessGranted(
        actorContext,
        whiteboard.authorization,
        AuthorizationPrivilege.READ
      )
    );

    const whiteboardParents = await this.getWhiteboardParents(
      authorizedWhiteboards
    );

    return whiteboardParents
      .map<ISearchResultWhiteboard | undefined>(whiteboardParent => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === whiteboardParent.whiteboard.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            {
              message: 'Unable to find raw search result for Whiteboard',
              whiteboardId: whiteboardParent.whiteboard.id,
            },
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        return {
          ...rawSearchResult,
          isContribution: whiteboardParent.isContribution,
          callout: whiteboardParent.callout,
          space: whiteboardParent.space,
          whiteboard: whiteboardParent.whiteboard,
        };
      })
      .filter(isDefined);
  }

  private async getMemoSearchResults(
    rawSearchResults: ISearchResult[],
    actorContext: ActorContext
  ): Promise<ISearchResultMemo[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const memoIds = rawSearchResults.map(hit => hit.result.id);

    const memos = await this.entityManager.findBy(Memo, {
      id: In(memoIds),
    });

    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized memo first, then get the parents, and map the results
    const authorizedMemos = memos.filter(memo =>
      this.authorizationService.isAccessGranted(
        actorContext,
        memo.authorization,
        AuthorizationPrivilege.READ
      )
    );

    const memoParents = await this.getMemoParents(authorizedMemos);

    return memoParents
      .map<ISearchResultMemo | undefined>(memoParent => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === memoParent.memo.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            {
              message: 'Unable to find raw search result for Memo',
              memoId: memoParent.memo.id,
            },
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        return {
          ...rawSearchResult,
          isContribution: memoParent.isContribution,
          callout: memoParent.callout,
          space: memoParent.space,
          memo: memoParent.memo,
        };
      })
      .filter(isDefined);
  }

  private async getCollaboraDocumentSearchResults(
    rawSearchResults: ISearchResult[],
    actorContext: ActorContext
  ): Promise<ISearchResultCollaboraDocument[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const collaboraDocumentIds = rawSearchResults.map(hit => hit.result.id);

    const collaboraDocuments = await this.entityManager.findBy(
      CollaboraDocument,
      {
        id: In(collaboraDocumentIds),
      }
    );

    // Authorize query-time (FR-009, SC-004): never bake permission into the
    // index. Filter first, then resolve parents for the authorized set only.
    const authorizedCollaboraDocuments = collaboraDocuments.filter(doc =>
      this.authorizationService.isAccessGranted(
        actorContext,
        doc.authorization,
        AuthorizationPrivilege.READ
      )
    );

    const collaboraDocumentParents = await this.getCollaboraDocumentParents(
      authorizedCollaboraDocuments
    );

    return collaboraDocumentParents
      .map<ISearchResultCollaboraDocument | undefined>(parent => {
        const rawSearchResult = rawSearchResults.find(
          hit => hit.result.id === parent.collaboraDocument.id
        );

        if (!rawSearchResult) {
          this.logger.error(
            {
              message: 'Unable to find raw search result for CollaboraDocument',
              collaboraDocumentId: parent.collaboraDocument.id,
            },
            undefined,
            LogContext.SEARCH
          );
          return undefined;
        }

        return {
          ...rawSearchResult,
          isContribution: parent.isContribution,
          callout: parent.callout,
          space: parent.space,
          collaboraDocument: parent.collaboraDocument,
        };
      })
      .filter(isDefined);
  }

  private async getCalloutSearchResult(
    rawSearchResults: ISearchResult[],
    actorContext: ActorContext
  ): Promise<ISearchResultCallout[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const calloutIds = rawSearchResults.map(hit => hit.result.id);

    const callouts = await this.entityManager.find(Callout, {
      where: {
        id: In(calloutIds),
        calloutsSet: { type: CalloutsSetType.COLLABORATION },
      },
      relations: {
        calloutsSet: true,
        framing: {
          whiteboard: true,
        },
        contributions: {
          post: true,
          whiteboard: true,
        },
      },
      select: {
        id: true,
        nameID: true,
        // createdDate is the relevance tiebreak when folding results (FR-019)
        createdDate: true,
        framing: {
          id: true,
          type: true,
          whiteboard: {
            id: true,
          },
        },
        contributions: {
          id: true,
          post: {
            id: true,
          },
          whiteboard: {
            id: true,
          },
        },
        calloutsSet: {
          id: true,
          type: true,
        },
      },
    });
    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized post first, then get the parents, and map the results
    const authorizedCallouts = callouts.filter(callout =>
      this.authorizationService.isAccessGranted(
        actorContext,
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
            {
              message: 'Unable to find raw search result for Callout',
              calloutId: parent.callout.id,
            },
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
      .filter(isDefined);
  }

  private async getCalloutParents(
    callouts: Callout[]
  ): Promise<CalloutParents[]> {
    const calloutIds = callouts.map(callout => callout.id);

    const parentSpaces = await this.entityManager.find(Space, {
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
            callouts: {
              framing: {
                whiteboard: true,
                memo: true,
              },
              contributions: {
                post: true,
                whiteboard: true,
                memo: true,
              },
            },
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
              framing: {
                id: true,
                whiteboard: {
                  id: true,
                },
                memo: {
                  id: true,
                },
              },
              contributions: {
                id: true,
                post: {
                  id: true,
                },
                whiteboard: {
                  id: true,
                },
                memo: {
                  id: true,
                },
              },
            },
          },
        },
      },
    });

    return callouts
      .map(callout => {
        const space = parentSpaces.find(space =>
          space?.collaboration?.calloutsSet?.callouts?.some(
            spaceCallout => spaceCallout.id === callout.id
          )
        );

        if (!space) {
          this.logger.error(
            {
              message: 'Unable to find Space parent for Callout',
              calloutId: callout.id,
            },
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
      .filter(isDefined);
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
        calloutsSet: { type: CalloutsSetType.COLLABORATION },
      },
      relations: {
        contributions: {
          post: true,
        },
        calloutsSet: true,
      },
      select: {
        id: true,
        // createdDate is the relevance tiebreak when folding results (FR-019)
        createdDate: true,
        settings: {
          visibility: true,
        },
        contributions: {
          id: true,
          post: {
            id: true,
          },
        },
        calloutsSet: {
          id: true,
          type: true,
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
            callouts: {
              contributions: {
                post: true,
              },
            },
          },
        },
      },
      select: {
        id: true,
        level: true,
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
            allowMembersToCreateCallouts: true,
            allowMembersToCreateSubspaces: true,
            inheritMembershipRights: true,
            allowMembersToVideoCall: true,
            allowGuestContributions: true,
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
            id: true,
            callouts: {
              id: true,
              contributions: {
                id: true,
                post: {
                  id: true,
                },
              },
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
      .filter((x): x is PostParents => !!x)
      .filter(
        postParent =>
          postParent.callout?.settings?.visibility !== CalloutVisibility.DRAFT
      );
  }

  private async getMemoParents(memos: Memo[]): Promise<MemoParents[]> {
    if (!memos.length) {
      return [];
    }

    const memoIds = memos.map(memo => memo.id);

    const callouts = await this.entityManager.find(Callout, {
      where: [
        {
          contributions: {
            memo: {
              id: In(memoIds),
            },
          },
          calloutsSet: { type: CalloutsSetType.COLLABORATION },
        },
        {
          framing: {
            memo: {
              id: In(memoIds),
            },
          },
          calloutsSet: { type: CalloutsSetType.COLLABORATION },
        },
      ],
      relations: {
        framing: {
          memo: true,
        },
        contributions: {
          memo: true,
        },
        calloutsSet: true,
      },
      select: {
        id: true,
        // createdDate is the relevance tiebreak when folding results (FR-019)
        createdDate: true,
        settings: {
          visibility: true,
        },
        framing: {
          id: true,
          memo: {
            id: true,
          },
        },
        contributions: {
          id: true,
          memo: {
            id: true,
          },
        },
        calloutsSet: {
          id: true,
          type: true,
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
            callouts: {
              framing: {
                memo: true,
              },
              contributions: {
                memo: true,
              },
            },
          },
        },
      },
      select: {
        id: true,
        level: true,
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
            allowMembersToCreateCallouts: true,
            allowMembersToCreateSubspaces: true,
            inheritMembershipRights: true,
            allowMembersToVideoCall: true,
            allowGuestContributions: true,
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
            id: true,
            callouts: {
              id: true,
              framing: {
                id: true,
                memo: {
                  id: true,
                },
              },
              contributions: {
                id: true,
                memo: {
                  id: true,
                },
              },
            },
          },
        },
      },
    });

    return memos
      .map(memo => {
        let isContribution = false;
        let callout = callouts.find(
          callout => callout?.framing?.memo?.id === memo.id
        );

        if (!callout) {
          isContribution = true;
          callout = callouts.find(callout =>
            callout?.contributions?.some(
              contribution => contribution?.memo?.id === memo.id
            )
          );
        }

        if (!callout) {
          this.logger.error(
            {
              message: 'Unable to find Callout parent for Memo',
              memoId: memo.id,
            },
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        const space = spaces.find(space =>
          space?.collaboration?.calloutsSet?.callouts?.some(
            spaceCallout => spaceCallout.id === callout?.id
          )
        );

        if (!space) {
          this.logger.error(
            {
              message: 'Unable to find Space parent for Memo',
              memoId: memo.id,
            },
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        return {
          memo,
          isContribution,
          callout,
          space,
        };
      })
      .filter((x): x is MemoParents => !!x)
      .filter(
        memoParent =>
          memoParent.callout?.settings?.visibility !== CalloutVisibility.DRAFT
      );
  }

  private async getCollaboraDocumentParents(
    collaboraDocuments: CollaboraDocument[]
  ): Promise<CollaboraDocumentParents[]> {
    if (!collaboraDocuments.length) {
      return [];
    }

    const collaboraDocumentIds = collaboraDocuments.map(doc => doc.id);

    const callouts = await this.entityManager.find(Callout, {
      where: [
        {
          contributions: {
            collaboraDocument: {
              id: In(collaboraDocumentIds),
            },
          },
          calloutsSet: { type: CalloutsSetType.COLLABORATION },
        },
        {
          framing: {
            collaboraDocument: {
              id: In(collaboraDocumentIds),
            },
          },
          calloutsSet: { type: CalloutsSetType.COLLABORATION },
        },
      ],
      relations: {
        framing: {
          collaboraDocument: true,
        },
        contributions: {
          collaboraDocument: true,
        },
        calloutsSet: true,
      },
      select: {
        id: true,
        // createdDate is the relevance tiebreak when folding results (FR-019)
        createdDate: true,
        settings: {
          visibility: true,
        },
        framing: {
          id: true,
          collaboraDocument: {
            id: true,
          },
        },
        contributions: {
          id: true,
          collaboraDocument: {
            id: true,
          },
        },
        calloutsSet: {
          id: true,
          type: true,
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
            callouts: {
              framing: {
                collaboraDocument: true,
              },
              contributions: {
                collaboraDocument: true,
              },
            },
          },
        },
      },
      select: {
        id: true,
        level: true,
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
            allowMembersToCreateCallouts: true,
            allowMembersToCreateSubspaces: true,
            inheritMembershipRights: true,
            allowMembersToVideoCall: true,
            allowGuestContributions: true,
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
            id: true,
            callouts: {
              id: true,
              framing: {
                id: true,
                collaboraDocument: {
                  id: true,
                },
              },
              contributions: {
                id: true,
                collaboraDocument: {
                  id: true,
                },
              },
            },
          },
        },
      },
    });

    return collaboraDocuments
      .map(collaboraDocument => {
        let isContribution = false;
        let callout = callouts.find(
          callout =>
            callout?.framing?.collaboraDocument?.id === collaboraDocument.id
        );

        if (!callout) {
          isContribution = true;
          callout = callouts.find(callout =>
            callout?.contributions?.some(
              contribution =>
                contribution?.collaboraDocument?.id === collaboraDocument.id
            )
          );
        }

        if (!callout) {
          this.logger.error(
            {
              message: 'Unable to find Callout parent for CollaboraDocument',
              collaboraDocumentId: collaboraDocument.id,
            },
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        const space = spaces.find(space =>
          space?.collaboration?.calloutsSet?.callouts?.some(
            spaceCallout => spaceCallout.id === callout?.id
          )
        );

        if (!space) {
          this.logger.error(
            {
              message: 'Unable to find Space parent for CollaboraDocument',
              collaboraDocumentId: collaboraDocument.id,
            },
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        return {
          collaboraDocument,
          isContribution,
          callout,
          space,
        };
      })
      .filter((x): x is CollaboraDocumentParents => !!x)
      .filter(
        parent =>
          parent.callout?.settings?.visibility !== CalloutVisibility.DRAFT
      );
  }

  private async getWhiteboardParents(
    whiteboards: Whiteboard[]
  ): Promise<WhiteboardParents[]> {
    if (!whiteboards.length) {
      return [];
    }

    const whiteboardIds = whiteboards.map(wb => wb.id);

    const callouts = await this.entityManager.find(Callout, {
      where: [
        {
          contributions: {
            whiteboard: {
              id: In(whiteboardIds),
            },
          },
          calloutsSet: { type: CalloutsSetType.COLLABORATION },
        },
        {
          framing: {
            whiteboard: {
              id: In(whiteboardIds),
            },
          },
          calloutsSet: { type: CalloutsSetType.COLLABORATION },
        },
      ],
      relations: {
        framing: {
          whiteboard: true,
        },
        contributions: {
          whiteboard: true,
        },
        calloutsSet: true,
      },
      select: {
        id: true,
        // createdDate is the relevance tiebreak when folding results (FR-019)
        createdDate: true,
        settings: {
          visibility: true,
        },
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
        },
        calloutsSet: {
          id: true,
          type: true,
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
            callouts: {
              framing: {
                whiteboard: true,
              },
              contributions: {
                whiteboard: true,
              },
            },
          },
        },
      },
      select: {
        id: true,
        level: true,
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
            allowMembersToCreateCallouts: true,
            allowMembersToCreateSubspaces: true,
            inheritMembershipRights: true,
            allowMembersToVideoCall: true,
            allowGuestContributions: true,
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
            id: true,
            callouts: {
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
              },
            },
          },
        },
      },
    });

    return whiteboards
      .map(whiteboard => {
        let isContribution = false;
        let callout = callouts.find(
          callout => callout?.framing?.whiteboard?.id === whiteboard.id
        );

        if (!callout) {
          isContribution = true;
          callout = callouts.find(callout =>
            callout?.contributions?.some(
              contribution => contribution?.whiteboard?.id === whiteboard.id
            )
          );
        }

        if (!callout) {
          this.logger.error(
            {
              message: 'Unable to find Callout parent for Whiteboard',
              whiteboardId: whiteboard.id,
            },
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        const space = spaces.find(space =>
          space?.collaboration?.calloutsSet?.callouts?.some(
            spaceCallout => spaceCallout.id === callout?.id
          )
        );

        if (!space) {
          this.logger.error(
            {
              message: 'Unable to find Space parent for Whiteboard',
              whiteboardId: whiteboard.id,
            },
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        return {
          whiteboard,
          isContribution,
          callout,
          space,
        };
      })
      .filter((x): x is WhiteboardParents => !!x)
      .filter(
        whiteboardParent =>
          whiteboardParent.callout?.settings?.visibility !==
          CalloutVisibility.DRAFT
      );
  }

  private async getUsersInSpace(spaceId: string): Promise<string[]> {
    const memberIds = await this.actorLookupService.getActorIDsWithCredential(
      { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceId },
      [ActorType.USER]
    );
    const adminIds = await this.actorLookupService.getActorIDsWithCredential(
      { type: AuthorizationCredential.SPACE_ADMIN, resourceID: spaceId },
      [ActorType.USER]
    );

    return [...memberIds, ...adminIds];
  }

  private async getOrganizationsInSpace(spaceId: string): Promise<string[]> {
    const memberIds = await this.actorLookupService.getActorIDsWithCredential(
      { type: AuthorizationCredential.SPACE_MEMBER, resourceID: spaceId },
      [ActorType.ORGANIZATION]
    );
    const adminIds = await this.actorLookupService.getActorIDsWithCredential(
      { type: AuthorizationCredential.SPACE_ADMIN, resourceID: spaceId },
      [ActorType.ORGANIZATION]
    );
    const leadIds = await this.actorLookupService.getActorIDsWithCredential(
      { type: AuthorizationCredential.SPACE_LEAD, resourceID: spaceId },
      [ActorType.ORGANIZATION]
    );

    return [...memberIds, ...adminIds, ...leadIds];
  }
}

// a fresh, well-formed empty result set for categories that were not requested.
// Returns a new object (and new results array) each call so buckets stay
// independent and no downstream mutation can leak across them.
const emptyResultSet = (): {
  results: ISearchResult[];
  cursor?: string;
  total: number;
} => ({ results: [], cursor: undefined, total: -1 });

const buildResults = (
  filter?: SearchFilterInput,
  ...results: ISearchResult[][] | ISearchResult[]
) => {
  // todo: total - https://github.com/alkem-io/server/issues/3700
  const total = -1;

  if (results.length === 0) {
    return { results: [], cursor: undefined, total };
  }
  const flatResults = results.flat(1);
  const resultsRanked = orderBy(
    flatResults,
    ['score', 'result.id'],
    ['desc', 'desc']
  );
  // limit the results to the top N
  // more results are expected as an attempt to ensure the requested size after authorization
  const rankedAndLimited = resultsRanked.slice(0, filter?.size);

  const cursor = calculateSearchCursor(rankedAndLimited);

  return { results: rankedAndLimited, cursor, total };
};

// search results that carry a containing callout (and its space): the direct
// callout hits plus the post/whiteboard/memo hits that fold up to a callout.
type FoldableSearchResult = ISearchResult & {
  callout: ISearchResultCallout['callout'];
  space: ISearchResultCallout['space'];
};

/**
 * Folds matching callouts and the containing callouts of matching
 * posts/whiteboards/memos into a single callout-level list, deduped by callout
 * id (FR-017). Each callout appears at most once regardless of how many of its
 * children matched; the representative keeps the highest score among its
 * matches. Ordered by relevance (score desc), then callout `createdDate` desc as
 * the tiebreak (FR-019). The returned results carry the callout id as their
 * `result.id` so the keyset cursor (`score::calloutId`) pages correctly.
 */
const buildFoldedCalloutResults = (
  filter: SearchFilterInput | undefined,
  callouts: ISearchResultCallout[],
  posts: ISearchResultPost[],
  whiteboards: ISearchResultWhiteboard[],
  memos: ISearchResultMemo[],
  collaboraDocuments: ISearchResultCollaboraDocument[]
): { results: ISearchResult[]; cursor?: string; total: number } => {
  // todo: total - https://github.com/alkem-io/server/issues/3700
  const total = -1;

  const foldable: FoldableSearchResult[] = [
    ...callouts,
    ...posts,
    ...whiteboards,
    ...memos,
    ...collaboraDocuments,
  ];

  if (foldable.length === 0) {
    return { results: [], cursor: undefined, total };
  }

  // dedupe by callout id, keeping the highest-scored representative
  const byCalloutId = new Map<string, ISearchResultCallout>();

  for (const hit of foldable) {
    const callout = hit.callout;
    if (!callout?.id) {
      continue;
    }
    const existing = byCalloutId.get(callout.id);
    if (existing && existing.score >= hit.score) {
      continue;
    }
    // re-key the result to the containing callout so the cursor pages on callout id
    byCalloutId.set(callout.id, {
      id: callout.id,
      score: hit.score,
      terms: hit.terms,
      type: SearchResultType.CALLOUT,
      result: { id: callout.id },
      callout,
      space: hit.space,
    });
  }

  const foldedResults = Array.from(byCalloutId.values());

  // relevance first, then recency (newest createdDate) as the tiebreak (FR-019)
  const resultsRanked = orderBy(
    foldedResults,
    ['score', callout => callout.callout?.createdDate?.getTime?.() ?? 0],
    ['desc', 'desc']
  );

  const rankedAndLimited = resultsRanked.slice(0, filter?.size);

  const cursor = calculateSearchCursor(rankedAndLimited);

  return { results: rankedAndLimited, cursor, total };
};
