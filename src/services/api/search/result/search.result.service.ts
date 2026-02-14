import {
  AlkemioErrorStatus,
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { BaseException } from '@common/exceptions/base.exception';
import { isDefined } from '@common/utils';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { calloutFramings } from '@domain/collaboration/callout-framing/callout.framing.schema';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { calloutsSets } from '@domain/collaboration/callouts-set/callouts.set.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { Post } from '@domain/collaboration/post';
import { posts } from '@domain/collaboration/post/post.schema';
import { Memo } from '@domain/common/memo/memo.entity';
import { memos } from '@domain/common/memo/memo.schema';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { whiteboards } from '@domain/common/whiteboard/whiteboard.schema';
import { IOrganization } from '@domain/community/organization';
import { organizations } from '@domain/community/organization/organization.schema';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { users } from '@domain/community/user/user.schema';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Space } from '@domain/space/space/space.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { spaces } from '@domain/space/space/space.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SearchFilterInput } from '@services/api/search/dto/inputs';
import { SearchCategory } from '@services/api/search/search.category';
import { calculateSearchCursor } from '@services/api/search/util';
import { eq, inArray, sql } from 'drizzle-orm';
import { groupBy, intersection, orderBy } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  ISearchResult,
  ISearchResultCallout,
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

type CalloutParents = {
  callout: Callout;
  space: Space;
};

@Injectable()
export class SearchResultService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private authorizationService: AuthorizationService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService
  ) {}

  /**
   * Resolves search results by authorizing and enriching them with data.
   * @param rawSearchResults The raw search results from the search engine.
   * @param agentInfo The agent info of the user making the search request.
   * @param filters Used to filter the end results.
   * @param spaceId The space ID to filter the search results by.
   */
  public async resolveSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo,
    filters: SearchFilterInput[],
    spaceId?: string
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
    ] = await Promise.all([
      this.getSpaceSearchResults(groupedResults.space ?? [], spaceId),
      this.getSubspaceSearchResults(groupedResults.subspace ?? [], agentInfo),
      this.getUserSearchResults(groupedResults.user ?? [], spaceId),
      this.getOrganizationSearchResults(
        groupedResults.organization ?? [],
        agentInfo,
        spaceId
      ),
      this.getCalloutSearchResult(groupedResults.callout ?? [], agentInfo),
      this.getPostSearchResults(groupedResults.post ?? [], agentInfo),
      this.getWhiteboardSearchResults(
        groupedResults.whiteboard ?? [],
        agentInfo
      ),
      this.getMemoSearchResults(groupedResults.memo ?? [], agentInfo),
    ]);
    const filtersByCategory = groupBy(filters, 'category') as Record<
      SearchCategory,
      SearchFilterInput[]
    >;
    const contributorResults = buildResults(
      filtersByCategory.contributors?.[0],
      users,
      organizations
    );
    // callout framings:
    const framingResults = buildResults(
      filtersByCategory.framings?.[0],
      whiteboards.filter(whiteboard => !whiteboard.isContribution),
      memos.filter(memo => !memo.isContribution)
    );
    // contributions include posts, whiteboards, and memos
    const contributionResults = buildResults(
      filtersByCategory.contributions?.[0],
      posts,
      whiteboards.filter(whiteboard => whiteboard.isContribution),
      memos.filter(memo => memo.isContribution)
    );
    const spaceResults = buildResults(
      filtersByCategory.spaces?.[0],
      spaces,
      subspaces
    );
    const calloutResults = buildResults(
      filtersByCategory['collaboration-tools']?.[0],
      callouts
    );

    return {
      contributorResults,
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
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.id, spaceId),
      });

      if (!space) {
        return [];
      }

      return [{ ...rawSearchResults[0], space: space as unknown as ISpace }];
    }

    const spaceIds = rawSearchResults.map(hit => hit.result.id);

    const loadedSpaces = await this.db.query.spaces.findMany({
      where: inArray(spaces.id, spaceIds),
    });

    return (loadedSpaces as unknown as Space[])
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

    const subspaces = (await this.db.query.spaces.findMany({
      where: inArray(spaces.id, subspaceIds),
      with: { parentSpace: true, authorization: true },
    })) as unknown as Space[];

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

    const loadedUsers = (await this.db.query.users.findMany({
      where: inArray(users.id, userIdsIntersection),
    })) as unknown as User[];

    return loadedUsers
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

    const loadedOrganizations = (await this.db.query.organizations.findMany({
      where: inArray(organizations.id, orgIdsIntersection),
      with: { authorization: true },
    })) as unknown as IOrganization[];

    return loadedOrganizations
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

    const loadedPosts = (await this.db.query.posts.findMany({
      where: inArray(posts.id, postIds),
      with: { authorization: true },
    })) as unknown as Post[];

    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized post first, then get the parents, and map the results
    const authorizedPosts = loadedPosts.filter(post =>
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

  private async getWhiteboardSearchResults(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultWhiteboard[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const whiteboardIds = rawSearchResults.map(hit => hit.result.id);

    const loadedWhiteboards = (await this.db.query.whiteboards.findMany({
      where: inArray(whiteboards.id, whiteboardIds),
      with: { authorization: true },
    })) as unknown as Whiteboard[];

    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized whiteboard first, then get the parents, and map the results
    const authorizedWhiteboards = loadedWhiteboards.filter(whiteboard =>
      this.authorizationService.isAccessGranted(
        agentInfo,
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
    agentInfo: AgentInfo
  ): Promise<ISearchResultMemo[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const memoIds = rawSearchResults.map(hit => hit.result.id);

    const loadedMemos = (await this.db.query.memos.findMany({
      where: inArray(memos.id, memoIds),
      with: { authorization: true },
    })) as unknown as Memo[];

    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized memo first, then get the parents, and map the results
    const authorizedMemos = loadedMemos.filter(memo =>
      this.authorizationService.isAccessGranted(
        agentInfo,
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

  private async getCalloutSearchResult(
    rawSearchResults: ISearchResult[],
    agentInfo: AgentInfo
  ): Promise<ISearchResultCallout[]> {
    if (rawSearchResults.length === 0) {
      return [];
    }

    const calloutIds = rawSearchResults.map(hit => hit.result.id);

    const loadedCallouts = (await this.db.query.callouts.findMany({
      where: inArray(callouts.id, calloutIds),
      with: {
        authorization: true,
        calloutsSet: true,
        framing: true,
        contributions: {
          with: {
            post: true,
          },
        },
      },
    })) as unknown as Callout[];
    // Filter to only collaboration callouts-set type
    const filteredCallouts = loadedCallouts.filter(
      c => c.calloutsSet?.type === CalloutsSetType.COLLABORATION
    );
    // usually the authorization is last but here it might be more expensive than usual
    // find the authorized post first, then get the parents, and map the results
    const authorizedCallouts = filteredCallouts.filter(callout =>
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
    calloutEntities: Callout[]
  ): Promise<CalloutParents[]> {
    const calloutIds = calloutEntities.map(callout => callout.id);

    if (calloutIds.length === 0) {
      return [];
    }

    // Find spaces that own these callouts via collaboration -> calloutsSet -> callout chain
    const spaceCalloutRows = await this.db
      .select({
        spaceId: spaces.id,
        calloutId: callouts.id,
      })
      .from(spaces)
      .innerJoin(collaborations, eq(spaces.collaborationId, collaborations.id))
      .innerJoin(calloutsSets, eq(collaborations.calloutsSetId, calloutsSets.id))
      .innerJoin(callouts, eq(callouts.calloutsSetId, calloutsSets.id))
      .where(inArray(callouts.id, calloutIds));

    // Load full space data for found space IDs
    const spaceIdsFound = [...new Set(spaceCalloutRows.map(r => r.spaceId))];
    const parentSpaces = spaceIdsFound.length > 0
      ? (await this.db.query.spaces.findMany({
          where: inArray(spaces.id, spaceIdsFound),
        })) as unknown as Space[]
      : [];

    return calloutEntities
      .map(callout => {
        const row = spaceCalloutRows.find(r => r.calloutId === callout.id);
        const space = row ? parentSpaces.find(s => s.id === row.spaceId) : undefined;

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

  private async getPostParents(postEntities: Post[]): Promise<PostParents[]> {
    if (!postEntities.length) {
      return [];
    }

    const postIds = postEntities.map(post => post.id);

    // Find callout -> post mappings with space via join chain
    const rows = await this.db
      .select({
        postId: calloutContributions.postId,
        calloutId: callouts.id,
        calloutSettings: callouts.settings,
        calloutsSetType: calloutsSets.type,
        spaceId: spaces.id,
      })
      .from(calloutContributions)
      .innerJoin(callouts, eq(calloutContributions.calloutId, callouts.id))
      .innerJoin(calloutsSets, eq(callouts.calloutsSetId, calloutsSets.id))
      .innerJoin(collaborations, eq(calloutsSets.id, collaborations.calloutsSetId))
      .innerJoin(spaces, eq(spaces.collaborationId, collaborations.id))
      .where(inArray(calloutContributions.postId, postIds));

    // Filter to collaboration callouts-set type
    const collabRows = rows.filter(r => r.calloutsSetType === CalloutsSetType.COLLABORATION);

    // Load full space + callout data
    const spaceIdsFound = [...new Set(collabRows.map(r => r.spaceId))];
    const calloutIdsFound = [...new Set(collabRows.map(r => r.calloutId))];

    const [loadedSpaces, loadedCallouts] = await Promise.all([
      spaceIdsFound.length > 0
        ? this.db.query.spaces.findMany({ where: inArray(spaces.id, spaceIdsFound) })
        : [],
      calloutIdsFound.length > 0
        ? this.db.query.callouts.findMany({ where: inArray(callouts.id, calloutIdsFound) })
        : [],
    ]);

    return postEntities
      .map(post => {
        const row = collabRows.find(r => r.postId === post.id);

        if (!row) {
          this.logger.error(
            `Unable to find Callout parent for Post: ${post.id}`,
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        const callout = loadedCallouts.find(c => c.id === row.calloutId);
        const space = loadedSpaces.find(s => s.id === row.spaceId);

        if (!callout || !space) {
          this.logger.error(
            `Unable to find Space parent for Post: ${post.id}`,
            undefined,
            LogContext.SEARCH_EXTRACT
          );
          return undefined;
        }

        return {
          post,
          callout: callout as unknown as Callout,
          space: space as unknown as Space,
        };
      })
      .filter((x): x is PostParents => !!x)
      .filter(
        postParent =>
          (postParent.callout?.settings as any)?.visibility !== CalloutVisibility.DRAFT
      );
  }

  private async getMemoParents(memoEntities: Memo[]): Promise<MemoParents[]> {
    if (!memoEntities.length) {
      return [];
    }

    const memoIds = memoEntities.map(memo => memo.id);

    // Find memos as contributions: contribution.memoId -> callout -> space
    const contributionRows = await this.db
      .select({
        memoId: calloutContributions.memoId,
        calloutId: callouts.id,
        calloutsSetType: calloutsSets.type,
        spaceId: spaces.id,
      })
      .from(calloutContributions)
      .innerJoin(callouts, eq(calloutContributions.calloutId, callouts.id))
      .innerJoin(calloutsSets, eq(callouts.calloutsSetId, calloutsSets.id))
      .innerJoin(collaborations, eq(calloutsSets.id, collaborations.calloutsSetId))
      .innerJoin(spaces, eq(spaces.collaborationId, collaborations.id))
      .where(inArray(calloutContributions.memoId, memoIds));

    // Find memos as framing: framing.memoId -> callout -> space
    const framingRows = await this.db
      .select({
        memoId: calloutFramings.memoId,
        calloutId: callouts.id,
        calloutsSetType: calloutsSets.type,
        spaceId: spaces.id,
      })
      .from(calloutFramings)
      .innerJoin(callouts, eq(callouts.framingId, calloutFramings.id))
      .innerJoin(calloutsSets, eq(callouts.calloutsSetId, calloutsSets.id))
      .innerJoin(collaborations, eq(calloutsSets.id, collaborations.calloutsSetId))
      .innerJoin(spaces, eq(spaces.collaborationId, collaborations.id))
      .where(inArray(calloutFramings.memoId, memoIds));

    // Filter to collaboration type
    const collabContributionRows = contributionRows.filter(r => r.calloutsSetType === CalloutsSetType.COLLABORATION);
    const collabFramingRows = framingRows.filter(r => r.calloutsSetType === CalloutsSetType.COLLABORATION);

    // Load full entities
    const allCalloutIds = [...new Set([...collabContributionRows.map(r => r.calloutId), ...collabFramingRows.map(r => r.calloutId)])];
    const allSpaceIds = [...new Set([...collabContributionRows.map(r => r.spaceId), ...collabFramingRows.map(r => r.spaceId)])];

    const [loadedCallouts, loadedSpaces] = await Promise.all([
      allCalloutIds.length > 0
        ? this.db.query.callouts.findMany({ where: inArray(callouts.id, allCalloutIds) })
        : [],
      allSpaceIds.length > 0
        ? this.db.query.spaces.findMany({ where: inArray(spaces.id, allSpaceIds) })
        : [],
    ]);

    return memoEntities
      .map(memo => {
        let isContribution = false;

        // Check framing first
        let row = collabFramingRows.find(r => r.memoId === memo.id);

        if (!row) {
          isContribution = true;
          row = collabContributionRows.find(r => r.memoId === memo.id);
        }

        if (!row) {
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

        const callout = loadedCallouts.find(c => c.id === row!.calloutId);
        const space = loadedSpaces.find(s => s.id === row!.spaceId);

        if (!callout || !space) {
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
          callout: callout as unknown as Callout,
          space: space as unknown as Space,
        };
      })
      .filter((x): x is MemoParents => !!x)
      .filter(
        memoParent =>
          (memoParent.callout?.settings as any)?.visibility !== CalloutVisibility.DRAFT
      );
  }

  private async getWhiteboardParents(
    whiteboardEntities: Whiteboard[]
  ): Promise<WhiteboardParents[]> {
    if (!whiteboardEntities.length) {
      return [];
    }

    const whiteboardIds = whiteboardEntities.map(wb => wb.id);

    // Find whiteboards as contributions: contribution.whiteboardId -> callout -> space
    const contributionRows = await this.db
      .select({
        whiteboardId: calloutContributions.whiteboardId,
        calloutId: callouts.id,
        calloutsSetType: calloutsSets.type,
        spaceId: spaces.id,
      })
      .from(calloutContributions)
      .innerJoin(callouts, eq(calloutContributions.calloutId, callouts.id))
      .innerJoin(calloutsSets, eq(callouts.calloutsSetId, calloutsSets.id))
      .innerJoin(collaborations, eq(calloutsSets.id, collaborations.calloutsSetId))
      .innerJoin(spaces, eq(spaces.collaborationId, collaborations.id))
      .where(inArray(calloutContributions.whiteboardId, whiteboardIds));

    // Find whiteboards as framing: framing.whiteboardId -> callout -> space
    const framingRows = await this.db
      .select({
        whiteboardId: calloutFramings.whiteboardId,
        calloutId: callouts.id,
        calloutsSetType: calloutsSets.type,
        spaceId: spaces.id,
      })
      .from(calloutFramings)
      .innerJoin(callouts, eq(callouts.framingId, calloutFramings.id))
      .innerJoin(calloutsSets, eq(callouts.calloutsSetId, calloutsSets.id))
      .innerJoin(collaborations, eq(calloutsSets.id, collaborations.calloutsSetId))
      .innerJoin(spaces, eq(spaces.collaborationId, collaborations.id))
      .where(inArray(calloutFramings.whiteboardId, whiteboardIds));

    // Filter to collaboration type
    const collabContributionRows = contributionRows.filter(r => r.calloutsSetType === CalloutsSetType.COLLABORATION);
    const collabFramingRows = framingRows.filter(r => r.calloutsSetType === CalloutsSetType.COLLABORATION);

    // Load full entities
    const allCalloutIds = [...new Set([...collabContributionRows.map(r => r.calloutId), ...collabFramingRows.map(r => r.calloutId)])];
    const allSpaceIds = [...new Set([...collabContributionRows.map(r => r.spaceId), ...collabFramingRows.map(r => r.spaceId)])];

    const [loadedCallouts, loadedSpaces] = await Promise.all([
      allCalloutIds.length > 0
        ? this.db.query.callouts.findMany({ where: inArray(callouts.id, allCalloutIds) })
        : [],
      allSpaceIds.length > 0
        ? this.db.query.spaces.findMany({ where: inArray(spaces.id, allSpaceIds) })
        : [],
    ]);

    return whiteboardEntities
      .map(whiteboard => {
        let isContribution = false;

        // Check framing first
        let row = collabFramingRows.find(r => r.whiteboardId === whiteboard.id);

        if (!row) {
          isContribution = true;
          row = collabContributionRows.find(r => r.whiteboardId === whiteboard.id);
        }

        if (!row) {
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

        const callout = loadedCallouts.find(c => c.id === row!.calloutId);
        const space = loadedSpaces.find(s => s.id === row!.spaceId);

        if (!callout || !space) {
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
          callout: callout as unknown as Callout,
          space: space as unknown as Space,
        };
      })
      .filter((x): x is WhiteboardParents => !!x)
      .filter(
        whiteboardParent =>
          (whiteboardParent.callout?.settings as any)?.visibility !==
          CalloutVisibility.DRAFT
      );
  }

  private async getUsersInSpace(spaceId: string): Promise<string[]> {
    const usersFilter = [];

    const membersInSpace = await this.userLookupService.usersWithCredential({
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: spaceId,
    });
    usersFilter.push(...membersInSpace.map(user => user.id));

    const adminsInSpace = await this.userLookupService.usersWithCredential({
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
