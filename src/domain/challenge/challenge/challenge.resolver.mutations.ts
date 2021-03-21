import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Float, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';
import { ChallengeService } from './challenge.service';
import { OpportunityInput } from '@domain/challenge/opportunity/opportunity.dto.create';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Profiling } from '@src/common/decorators';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { UpdateChallengeInput } from './challenge.dto.update';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

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
  async createOpportunityOnChallenge(
    @Args({ name: 'challengeID', type: () => Float }) challengeID: number,
    @Args({ name: 'opportunityData', type: () => OpportunityInput })
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.challengeService.createOpportunity(
      challengeID,
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
  @Mutation(() => Boolean, {
    description: 'Removes the Challenge with the specified ID',
  })
  async removeChallenge(@Args('ID') challengeID: number): Promise<boolean> {
    return await this.challengeService.removeChallenge(challengeID);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Adds the specified organisation as a lead for the specified Community',
  })
  @Profiling.api
  async addChallengeLead(
    @Args('organisationID') organisationID: number,
    @Args('challengeID') challengeID: number
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
    @Args('organisationID') organisationID: number,
    @Args('challengeID') chalengeID: number
  ): Promise<boolean> {
    return await this.challengeService.removeChallengeLead(
      chalengeID,
      organisationID
    );
  }
}
