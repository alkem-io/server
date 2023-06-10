import { UserService } from '@domain/community/user/user.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ISearchResultBuilder } from './search.result.builder.interface';
import { HubService } from '@domain/challenge/hub/hub.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { ISearchResultBase } from './dto/search.result.dto.entry.base.interface';
import { SearchResultType } from '@common/enums/search.result.type';
import { ISearchResultHub } from './dto/search.result.dto.entry.hub';
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
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ICallout } from '@domain/collaboration/callout';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { EntityManager } from 'typeorm';

export type PostParents = {
  callout: ICallout;
  hub: IHub;
  challenge: IChallenge | undefined;
  opportunity: IOpportunity | undefined;
};

export type PostParentIDs = {
  calloutID: string;
  hubID: string;
  challengeID: string | undefined;
  opportunityID: string | undefined;
};

export default class SearchResultBuilderService
  implements ISearchResultBuilder
{
  constructor(
    private readonly searchResultBase: ISearchResultBase,
    private readonly hubService: HubService,
    private readonly challengeService: ChallengeService,
    private readonly opportunityService: OpportunityService,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly userGroupService: UserGroupService,
    private readonly postService: PostService,
    private readonly calloutService: CalloutService,
    private readonly entityManager: EntityManager
  ) {}

  async [SearchResultType.HUB](rawSearchResult: ISearchResult) {
    const hub = await this.hubService.getHubOrFail(rawSearchResult.result.id);
    const searchResultHub: ISearchResultHub = {
      ...this.searchResultBase,
      hub: hub,
    };
    return searchResultHub;
  }

  async [SearchResultType.CHALLENGE](rawSearchResult: ISearchResult) {
    const challenge = await this.challengeService.getChallengeOrFail(
      rawSearchResult.result.id
    );
    const hub = await this.hubService.getHubOrFail(
      this.challengeService.getHubID(challenge)
    );
    const searchResultChallenge: ISearchResultChallenge = {
      ...this.searchResultBase,
      challenge,
      hub,
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
    const hub = await this.hubService.getHubOrFail(
      this.opportunityService.getHubID(opportunity)
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
      hub,
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
      SELECT \`hub\`.\`id\` as \`hubID\`, \`challenge\`.\`id\` as \`challengeID\`, null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
      RIGHT JOIN \`challenge\` on \`challenge\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`hub\` on \`challenge\`.\`hubID\` = \`hub\`.\`id\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`id\` = '${postId}' UNION

      SELECT \`hub\`.\`id\` as \`hubID\`, null as \'challengeID\', null as \'opportunityID\', \`callout\`.\`id\` as \`calloutID\`  FROM \`callout\`
      RIGHT JOIN \`hub\` on \`hub\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`post\` on \`callout\`.\`id\` = \`post\`.\`calloutId\`
      WHERE \`post\`.\`id\` = '${postId}' UNION

      SELECT  \`hub\`.\`id\` as \`hubID\`, \`challenge\`.\`id\` as \`challengeID\`, \`opportunity\`.\`id\` as \`opportunityID\`, \`callout\`.\`id\` as \`calloutID\` FROM \`callout\`
      RIGHT JOIN \`opportunity\` on \`opportunity\`.\`collaborationId\` = \`callout\`.\`collaborationId\`
      JOIN \`challenge\` on \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      JOIN \`hub\` on \`opportunity\`.\`hubID\` = \`hub\`.\`id\`
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
    const hub = await this.hubService.getHubOrFail(queryResult.hubID);

    if (queryResult.challengeID)
      challenge = await this.challengeService.getChallengeOrFail(
        queryResult.challengeID
      );
    if (queryResult.opportunityID)
      opportunity = await this.opportunityService.getOpportunityOrFail(
        queryResult.opportunityID
      );

    return { challenge, opportunity, callout, hub };
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
