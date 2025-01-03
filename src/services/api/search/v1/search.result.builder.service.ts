import { ISearchResultBuilder } from './search.result.builder.interface';
import { SpaceService } from '@domain/space/space/space.service';
import { ISearchResultBase } from '@services/api/search/dto/search.result.dto.entry.base.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultSpace } from '@services/api/search/dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from '@services/api/search/dto/search.result.dto.entry.challenge';
import { ISearchResultOpportunity } from '@services/api/search/dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from '@services/api/search/dto/search.result.dto.entry.user';
import { ISearchResultOrganization } from '@services/api/search/dto/search.result.dto.entry.organization';
import { ISearchResult } from '@services/api/search/dto/search.result.entry.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ISearchResultUserGroup } from '@services/api/search/dto/search.result.dto.entry.user.group';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { PostService } from '@domain/collaboration/post/post.service';
import { ISearchResultPost } from '@services/api/search/dto/search.result.dto.entry.post';
import { ISpace } from '@domain/space/space/space.interface';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { EntityManager } from 'typeorm';
import { ISearchResultCallout } from '@services/api/search/dto/search.result.dto.entry.callout';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

export type PostParents = {
  callout: ICallout;
  space: ISpace;
  subspace: ISpace | undefined;
  subsubspace: ISpace | undefined;
};

export default class SearchResultBuilderService
  implements ISearchResultBuilder
{
  constructor(
    private readonly searchResultBase: ISearchResultBase,
    private readonly spaceService: SpaceService,
    private readonly userLookupService: UserLookupService,
    private readonly organizationLookupService: OrganizationLookupService,
    private readonly userGroupService: UserGroupService,
    private readonly postService: PostService,
    private readonly calloutService: CalloutService,
    private readonly entityManager: EntityManager
  ) {}
  async [SearchResultType.SPACE](rawSearchResult: ISearchResult) {
    const space = await this.spaceService.getSpaceOrFail(
      rawSearchResult.result.id
    );
    const searchResultSpace: ISearchResultSpace = {
      ...this.searchResultBase,
      space: space,
    };
    return searchResultSpace;
  }

  async [SearchResultType.SUBSPACE](rawSearchResult: ISearchResult) {
    return this[SearchResultType.SPACE](rawSearchResult);
  }

  async [SearchResultType.CHALLENGE](rawSearchResult: ISearchResult) {
    const subspace = await this.spaceService.getSpaceOrFail(
      rawSearchResult.result.id
    );
    const levelZeroSpace = await this.spaceService.getSpaceOrFail(
      subspace.levelZeroSpaceID
    );
    const searchResultChallenge: ISearchResultChallenge = {
      ...this.searchResultBase,
      subspace: subspace,
      space: levelZeroSpace,
    };
    return searchResultChallenge;
  }

  async [SearchResultType.OPPORTUNITY](rawSearchResult: ISearchResult) {
    const subsubspace = await this.spaceService.getSpaceOrFail(
      rawSearchResult.result.id,
      {
        relations: {
          parentSpace: true,
        },
      }
    );
    if (!subsubspace.parentSpace) {
      throw new RelationshipNotFoundException(
        `Unable to find parentSpace for ${subsubspace.nameID}`,
        LogContext.SEARCH
      );
    }
    const levelZeroSpace = await this.spaceService.getSpaceOrFail(
      subsubspace.levelZeroSpaceID
    );
    if (!subsubspace.parentSpace) {
      throw new RelationshipNotFoundException(
        `Unable to find parent subspace for ${subsubspace.id}`,
        LogContext.SEARCH
      );
    }
    const subspace = await this.spaceService.getSpaceOrFail(
      subsubspace.parentSpace.id
    );
    const searchResultOpportunity: ISearchResultOpportunity = {
      ...this.searchResultBase,
      subsubspace,
      space: levelZeroSpace,
      subspace,
    };
    return searchResultOpportunity;
  }

  async [SearchResultType.USER](rawSearchResult: ISearchResult) {
    const user = await this.userLookupService.getUserOrFail(
      rawSearchResult.result.id
    );
    const searchResultUser: ISearchResultUser = {
      ...this.searchResultBase,
      user,
    };
    return searchResultUser;
  }

  async [SearchResultType.ORGANIZATION](rawSearchResult: ISearchResult) {
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(
        rawSearchResult.result.id
      );
    const searchResultOrganization: ISearchResultOrganization = {
      ...this.searchResultBase,
      organization,
    };
    return searchResultOrganization;
  }

  async [SearchResultType.USERGROUP](rawSearchResult: ISearchResult) {
    const userGroup = await this.userGroupService.getUserGroupOrFail(
      rawSearchResult.result.id
    );
    const searchResultUserGroup: ISearchResultUserGroup = {
      ...this.searchResultBase,
      userGroup,
    };
    return searchResultUserGroup;
  }

  private async getPostParents(postId: string): Promise<PostParents> {
    const callout = await this.entityManager.findOne(Callout, {
      where: {
        contributions: {
          post: {
            id: postId,
          },
        },
      },
      relations: {},
    });

    if (!callout) {
      throw new EntityNotFoundException(
        `Unable to find callout for post with ID: ${postId}`,
        LogContext.SEARCH
      );
    }

    const spaceLoaded = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          calloutsSet: {
            callouts: {
              id: callout.id,
            },
          },
        },
      },
      relations: {
        parentSpace: true,
        collaboration: {
          calloutsSet: {
            callouts: true,
          },
        },
      },
    });

    if (!spaceLoaded) {
      throw new EntityNotFoundException(
        `Unable to find parents for post with ID: ${postId}`,
        LogContext.SEARCH
      );
    }

    const levelZeroSpace = await this.spaceService.getSpaceOrFail(
      spaceLoaded.levelZeroSpaceID
    );
    let subspace: ISpace | undefined = undefined;
    let subsubspace: ISpace | undefined = undefined;

    switch (spaceLoaded?.level) {
      case SpaceLevel.CHALLENGE: {
        subspace = spaceLoaded;
        break;
      }
      case SpaceLevel.OPPORTUNITY: {
        subspace = spaceLoaded.parentSpace;
        subsubspace = spaceLoaded;
        break;
      }
    }

    return { subspace, subsubspace, callout, space: levelZeroSpace };
  }

  async [SearchResultType.POST](rawSearchResult: ISearchResult) {
    const post = await this.postService.getPostOrFail(
      rawSearchResult.result.id
    );
    const postParents: PostParents = await this.getPostParents(
      rawSearchResult.result.id
    );
    const searchResultPost: ISearchResultPost = {
      ...this.searchResultBase,
      ...postParents,
      post,
    };
    return searchResultPost;
  }

  async [SearchResultType.CALLOUT](rawSearchResult: ISearchResult) {
    const callout = await this.calloutService.getCalloutOrFail(
      rawSearchResult.result.id
    );
    const searchResultCallout: ISearchResultCallout = {
      ...this.searchResultBase,
      callout,
      space: {} as ISpace,
    };
    return searchResultCallout;
  }

  async [SearchResultType.WHITEBOARD](
    _rawSearchResult: ISearchResult
  ): Promise<ISearchResultCallout> {
    throw new Error('Method not implemented.');
  }
}
