import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { PubSubEngine } from 'graphql-subscriptions';
import { ChallengeService } from './challenge.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  DeleteChallengeInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { GraphqlGuard } from '@core/authorization';
import {
  CreateOpportunityInput,
  IOpportunity,
} from '@domain/collaboration/opportunity';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { OpportunityAuthorizationService } from '@domain/collaboration/opportunity/opportunity.service.authorization';
import { IChallenge } from './challenge.interface';
import { IUser } from '@domain/community/user/user.interface';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { AssignChallengeAdminInput } from './dto/challenge.dto.assign.admin';
import { RemoveChallengeAdminInput } from './dto/challenge.dto.remove.admin';
import { CreateChallengeOnChallengeInput } from './dto/challenge.dto.create.in.challenge';
import { OpportunityCreatedPayload } from './dto/challenge.opportunity.created.payload';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_OPPORTUNITY_CREATED } from '@common/constants';
import { ElasticsearchService } from '@services/external/elasticsearch';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    private elasticService: ElasticsearchService,
    private activityAdapter: ActivityAdapter,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private authorizationService: AuthorizationService,
    private challengeService: ChallengeService,
    @Inject(SUBSCRIPTION_OPPORTUNITY_CREATED)
    private opportunityCreatedSubscription: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Creates a new child challenge within the parent Challenge.',
  })
  @Profiling.api
  async createChildChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: CreateChallengeOnChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeData.challengeID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.CREATE,
      `challengeCreate: ${challenge.nameID}`
    );
    const childChallenge = await this.challengeService.createChildChallenge(
      challengeData,
      agentInfo
    );

    return await this.challengeAuthorizationService.applyAuthorizationPolicy(
      childChallenge,
      challenge.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Creates a new Opportunity within the parent Challenge.',
  })
  @Profiling.api
  async createOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('opportunityData') opportunityData: CreateOpportunityInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      opportunityData.challengeID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.CREATE_OPPORTUNITY,
      `opportunityCreate: ${challenge.nameID}`
    );
    const opportunity = await this.challengeService.createOpportunity(
      opportunityData,
      agentInfo
    );

    const challengeCommunityPolicy =
      await this.challengeAuthorizationService.setCommunityPolicyFlags(
        challenge
      );
    await this.opportunityAuthorizationService.applyAuthorizationPolicy(
      opportunity,
      challenge.authorization,
      challengeCommunityPolicy
    );

    this.elasticService.opportunityCreated(
      {
        id: opportunity.id,
        name: opportunity.profile.displayName,
        space: opportunity.spaceID ?? '',
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    this.activityAdapter.opportunityCreated({
      opportunity,
      triggeredBy: agentInfo.userID,
      challengeId: opportunityData.challengeID,
    });

    const opportunityCreatedEvent: OpportunityCreatedPayload = {
      eventID: `opportunity-created-${Math.round(Math.random() * 100)}`,
      challengeID: challenge.id,
      opportunity,
    };
    this.opportunityCreatedSubscription.publish(
      SubscriptionType.OPPORTUNITY_CREATED,
      opportunityCreatedEvent
    );

    return opportunity;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Updates the specified Challenge.',
  })
  @Profiling.api
  async updateChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('challengeData') challengeData: UpdateChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeData.ID,
      { relations: ['profile'] }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.UPDATE,
      `challenge update: ${challenge.nameID}`
    );
    const updatedChallenge = await this.challengeService.updateChallenge(
      challengeData
    );

    this.elasticService.challengeContentEdited(
      {
        id: challenge.id,
        name: challenge.profile.displayName,
        space: challenge.spaceID ?? '',
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return updatedChallenge;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
    description: 'Deletes the specified Challenge.',
  })
  async deleteChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.DELETE,
      `challenge delete: ${challenge.nameID}`
    );
    return await this.challengeService.deleteChallenge(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as an Challenge Admin.',
  })
  @Profiling.api
  async assignUserAsChallengeAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignChallengeAdminInput
  ): Promise<IUser> {
    const challenge = await this.challengeService.getChallengeOrFail(
      membershipData.challengeID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user challenge admin: ${challenge.nameID}`
    );
    return await this.challengeService.assignChallengeAdmin(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being an Challenge Admin.',
  })
  @Profiling.api
  async removeUserAsChallengeAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveChallengeAdminInput
  ): Promise<IUser> {
    const challenge = await this.challengeService.getChallengeOrFail(
      membershipData.challengeID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user challenge admin: ${challenge.nameID}`
    );
    return await this.challengeService.removeChallengeAdmin(membershipData);
  }
}
