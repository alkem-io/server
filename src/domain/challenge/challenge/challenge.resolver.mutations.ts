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
} from '@domain/challenge/challenge';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { RemoveEntityInput } from '@domain/common/entity.dto.remove';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService
  ) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Opportunity, {
    description:
      'Creates a new Opportunity for the challenge with the given id',
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
    description:
      'Updates the specified Challenge with the provided data (merge)',
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
    description: 'Removes the Challenge with the specified ID',
  })
  async removeChallenge(
    @Args('removeData') removeData: RemoveEntityInput
  ): Promise<IChallenge> {
    return await this.challengeService.removeChallenge(removeData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Adds the specified organisation as a lead for the specified Community',
  })
  @Profiling.api
  async addChallengeLead(
    @Args('organisationID') organisationID: string,
    @Args('challengeID') challengeID: string
  ): Promise<boolean> {
    return await this.challengeService.addChallengeLead(
      challengeID,
      organisationID
    );
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Remove the specified organisation as a lead for the specified Challenge',
  })
  @Profiling.api
  async removeChallengeLead(
    @Args('organisationID') organisationID: string,
    @Args('challengeID') chalengeID: string
  ): Promise<boolean> {
    return await this.challengeService.removeChallengeLead(
      chalengeID,
      organisationID
    );
  }
}
