import { UserService } from '@domain/community/user/user.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ISearchResultBuilder } from './search.result.builder.interface';
import { SpaceService } from '@domain/challenge/space/space.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { ISearchResultBase } from './dto/search.result.dto.entry.base.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultSpace } from './dto/search.result.dto.entry.space';
import { ISearchResultChallenge } from './dto/search.result.dto.entry.challenge';
import { ISearchResultOpportunity } from './dto/search.result.dto.entry.opportunity';
import { ISearchResultUser } from './dto/search.result.dto.entry.user';
import { ISearchResultOrganization } from './dto/search.result.dto.entry.organization';
import { ISearchResult } from './dto/search.result.entry.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ISearchResultUserGroup } from './dto/search.result.dto.entry.user.group';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { PostService } from '@domain/collaboration/post/post.service';
import { ISearchResultPost } from './dto/search.result.dto.entry.post';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ICallout } from '@domain/collaboration/callout';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { EntityManager } from 'typeorm';

export type PostParents = {
  callout: ICallout;
  space: ISpace;
  challenge: IChallenge | undefined;
  opportunity: IOpportunity | undefined;
};

export type PostParentIDs = {
  calloutID: string;
  spaceID: string;
  challengeID: string | undefined;
  opportunityID: string | undefined;
};

export default class SearchResultBuilderService
  implements ISearchResultBuilder
{
  constructor(
    private readonly searchResultBase: ISearchResultBase,
    private readonly spaceService: SpaceService,
    private readonly challengeService: ChallengeService,
    private readonly opportunityService: OpportunityService,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
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

  async [SearchResultType.CHALLENGE](rawSearchResult: ISearchResult) {
    const challenge = await this.challengeService.getChallengeOrFail(
      rawSearchResult.result.id
    );
    const space = await this.spaceService.getSpaceOrFail(
      this.challengeService.getSpaceID(challenge)
    );
    const searchResultChallenge: ISearchResultChallenge = {
      ...this.searchResultBase,
      challenge,
      space,
    };
    return searchResultChallenge;
  }

  async [SearchResultType.OPPORTUNITY](rawSearchResult: ISearchResult) {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      rawSearchResult.result.id,
      {
        relations: ['challenge'],
      }
    );
    const space = await this.spaceService.getSpaceOrFail(
      this.opportunityService.getSpaceID(opportunity)
    );
    if (!opportunity.challenge) {
      throw new RelationshipNotFoundException(
        `Unable to find challenge for ${opportunity.nameID}`,
        LogContext.SEARCH
      );
    }
    const challenge = await this.challengeService.getChallengeOrFail(
      opportunity.challenge.id
    );
    const searchResultOpportunity: ISearchResultOpportunity = {
      ...this.searchResultBase,
      opportunity,
      space,
      challenge,
    };
    return searchResultOpportunity;
  }

  async [SearchResultType.USER](rawSearchResult: ISearchResult) {
    const user = await this.userService.getUserOrFail(
      rawSearchResult.result.id
    );
    const searchResultUser: ISearchResultUser = {
      ...this.searchResultBase,
      user,
    };
    return searchResultUser;
  }

  async [SearchResultType.ORGANIZATION](rawSearchResult: ISearchResult) {
    const organization = await this.organizationService.getOrganizationOrFail(
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
    const [queryResult]: PostParentIDs[] =
      await this.entityManager.connection.query(
        `
      SELECT \`space\`.\`id\` as \`spaceID\`, \`challenge\`.\`id\` as \`challengeID\`, null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`space\` on \`challenge\`.\`spaceID\` = \`space\`.\`id\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`id\` = '${postId}' UNION

      SELECT \`space\`.\`id\` as \`spaceID\`, null as \'challengeID\', null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\`  FROM \`callout\`
      RIGHT JOIN \`space\` on \`space\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`id\` = '${postId}' UNION

      SELECT  \`space\`.\`id\` as \`spaceID\`, \`challenge\`.\`id\` as \`challengeID\`, \`opportunity\`.\`id\` as \`opportunityID\`, \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`challenge\` on \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      JOIN \`space\` on \`opportunity\`.\`spaceID\` = \`space\`.\`id\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`id\` = '${postId}';
      `
      );

    let challenge: IChallenge | undefined = undefined;
    let opportunity: IOpportunity | undefined = undefined;

    if (!queryResult) {
      throw new EntityNotFoundException(
        `Unable to find parents for post with ID: ${postId}`,
        LogContext.SEARCH
      );
    }

    const callout = await this.calloutService.getCalloutOrFail(
      queryResult.calloutID
    );
    const space = await this.spaceService.getSpaceOrFail(queryResult.spaceID);

    if (queryResult.challengeID)
      challenge = await this.challengeService.getChallengeOrFail(
        queryResult.challengeID
      );
    if (queryResult.opportunityID)
      opportunity = await this.opportunityService.getOpportunityOrFail(
        queryResult.opportunityID
      );

    return { challenge, opportunity, callout, space };
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
}
