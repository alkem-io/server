import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { ChallengeService } from './challenge.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
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
import { AssignChallengeLeadInput } from './challenge.dto.assign.lead';
import { RemoveChallengeLeadInput } from './challenge.dto.remove.lead';
import { ChallengeLifecycleOptionsProvider } from './challenge.lifecycle.options.provider';
import { AuthorizationRolesGlobal } from '@core/authorization/authorization.roles.global';
import { AuthorizationRulesGuard } from '@core/authorization/authorization.rules.guard';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService,
    @Inject(ChallengeLifecycleOptionsProvider)
    private challengeLifecycleOptionsProvider: ChallengeLifecycleOptionsProvider
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Challenge, {
    description: 'Deletes the specified Challenge.',
  })
  async deleteChallenge(
    @Args('deleteData') deleteData: DeleteChallengeInput
  ): Promise<IChallenge> {
    return await this.challengeService.deleteChallenge(deleteData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Challenge, {
    description: 'Assigns an organisation as a lead for the Challenge.',
  })
  @Profiling.api
  async assignChallengeLead(
    @Args('assignInput') assignData: AssignChallengeLeadInput
  ): Promise<IChallenge> {
    return await this.challengeService.assignChallengeLead(assignData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Challenge, {
    description: 'Remove an organisation as a lead for the Challenge.',
  })
  @Profiling.api
  async removeChallengeLead(
    @Args('removeData') removeData: RemoveChallengeLeadInput
  ): Promise<IChallenge> {
    return await this.challengeService.removeChallengeLead(removeData);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
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
