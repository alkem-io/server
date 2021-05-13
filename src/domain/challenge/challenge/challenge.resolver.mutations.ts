import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { ChallengeService } from './challenge.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';

import {
  UpdateChallengeInput,
  IChallenge,
  Challenge,
  DeleteChallengeInput,
  ChallengeEventInput,
  AssignChallengeLeadInput,
  RemoveChallengeLeadInput,
} from '@domain/challenge/challenge';
import { ChallengeLifecycleOptionsProvider } from './challenge.lifecycle.options.provider';
import { GraphqlGuard, AuthorizationRolesGlobal } from '@core/authorization';
import { CreateChallengeInput } from './challenge.dto.create';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService,
    @Inject(ChallengeLifecycleOptionsProvider)
    private challengeLifecycleOptionsProvider: ChallengeLifecycleOptionsProvider
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Challenge, {
    description: 'Creates a new child challenge within the parent Challenge.',
  })
  @Profiling.api
  async createChildChallenge(
    @Args('challengeData') challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    return await this.challengeService.createChildChallenge(challengeData);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
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
  @UseGuards(GraphqlGuard)
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
  @UseGuards(GraphqlGuard)
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
  @UseGuards(GraphqlGuard)
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
  @UseGuards(GraphqlGuard)
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
