import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { ChallengeService } from './challenge.service';
import { Profiling } from '@src/common/decorators';
import {
  IOpportunity,
  Opportunity,
  CreateOpportunityInput,
} from '@domain/challenge/opportunity';
import {
  UpdateChallengeInput,
  IChallenge,
  Challenge,
  DeleteChallengeInput,
  ChallengeEventInput,
} from '@domain/challenge/challenge';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { AssignChallengeLeadInput } from './challenge.dto.assign.lead';
import { RemoveChallengeLeadInput } from './challenge.dto.remove.lead';
import { ChallengeLifecycleOptionsProvider } from './challenge.lifecycle.options.provider';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService,
    @Inject(ChallengeLifecycleOptionsProvider)
    private challengeLifecycleOptionsProvider: ChallengeLifecycleOptionsProvider
  ) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Opportunity, {
    description: 'Creates a new Opportunity within the parent Challenge.',
  })
  @Profiling.api
  async createOpportunity(
    @Args('opportunityData') opportunityData: CreateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.challengeService.createOpportunity(
      opportunityData
    );
    return opportunity;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Challenge, {
    description: 'Updates the specified Challenge.',
  })
  @Profiling.api
  async updateChallenge(
    @Args('challengeData') challengeData: UpdateChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.updateChallenge(
      challengeData
    );
    return challenge;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Challenge, {
    description: 'Deletes the specified Challenge.',
  })
  async deleteChallenge(
    @Args('deleteData') deleteData: DeleteChallengeInput
  ): Promise<IChallenge> {
    return await this.challengeService.deleteChallenge(deleteData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Challenge, {
    description: 'Assigns an organisation as a lead for the Challenge.',
  })
  @Profiling.api
  async assignChallengeLead(
    @Args('assignInput') assignData: AssignChallengeLeadInput
  ): Promise<IChallenge> {
    return await this.challengeService.assignChallengeLead(assignData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Challenge, {
    description: 'Remove an organisation as a lead for the Challenge.',
  })
  @Profiling.api
  async removeChallengeLead(
    @Args('removeData') removeData: RemoveChallengeLeadInput
  ): Promise<IChallenge> {
    return await this.challengeService.removeChallengeLead(removeData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins, AuthorizationRoles.GlobalAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Challenge, {
    description: 'Trigger an event on the Challenge.',
  })
  async eventOnChallenge(
    @Args('challengeEventData')
    challengeEventData: ChallengeEventInput
  ): Promise<IChallenge> {
    return await this.challengeLifecycleOptionsProvider.eventOnChallenge(
      challengeEventData
    );
  }
}
