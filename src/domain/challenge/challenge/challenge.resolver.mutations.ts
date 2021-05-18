import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { ChallengeService } from './challenge.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';

import {
  UpdateChallengeInput,
  IChallenge,
  DeleteChallengeInput,
  ChallengeEventInput,
  AssignChallengeLeadInput,
  RemoveChallengeLeadInput,
  Challenge,
} from '@domain/challenge/challenge';
import { GraphqlGuard, AuthorizationRolesGlobal } from '@core/authorization';
import { CreateChallengeInput } from './challenge.dto.create';
import { BaseChallengeLifecycleOptionsProvider } from '../base-challenge/base.challenge.lifecycle.options.provider';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    private challengeService: ChallengeService,
    private challengeLifecycleOptionsProvider: BaseChallengeLifecycleOptionsProvider,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IChallenge, {
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
  @Mutation(() => IChallenge, {
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
  @Mutation(() => IChallenge, {
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
  @Mutation(() => IChallenge, {
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
  @Mutation(() => IChallenge, {
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
  @Mutation(() => IChallenge, {
    description: 'Trigger an event on the Challenge.',
  })
  async eventOnChallenge(
    @Args('challengeEventData')
    challengeEventData: ChallengeEventInput
  ): Promise<IChallenge> {
    return await this.challengeLifecycleOptionsProvider.eventOnBaseChallenge({
      eventName: challengeEventData.eventName,
      ID: challengeEventData.ID,
      repository: this.challengeRepository,
    });
  }
}
