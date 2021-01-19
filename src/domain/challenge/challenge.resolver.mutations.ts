import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Float, Mutation } from '@nestjs/graphql';
import { Roles } from '@utils/decorators/roles.decorator';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '@domain/user-group/user-group.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { ChallengeInput } from './challenge.dto';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';
import { ChallengeService } from './challenge.service';
import { OpportunityInput } from '@domain/opportunity/opportunity.dto';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { IOpportunity } from '@domain/opportunity/opportunity.interface';
import { UpdateChallengeInput } from './update.challenge.dto';

@Resolver()
export class ChallengeResolverMutations {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService
  ) {}

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Creates a new user group for the challenge with the given id',
  })
  @Profiling.api
  async createGroupOnChallenge(
    @Args({ name: 'challengeID', type: () => Float }) challengeID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.challengeService.createGroup(
      challengeID,
      groupName
    );
    return group;
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
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

  @Roles(RestrictedGroupNames.EcoverseAdmins)
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

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the Challenge with the specified ID',
  })
  async removeChallenge(@Args('ID') challengeID: number): Promise<boolean> {
    return await this.challengeService.removeChallenge(challengeID);
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier as a member of the specified challenge',
  })
  @Profiling.api
  async addUserToChallenge(
    @Args('userID') userID: number,
    @Args('challengeID') challengeID: number
  ): Promise<IUserGroup> {
    const group = await this.challengeService.addMember(userID, challengeID);
    return group;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier as a member of the specified opportunity',
  })
  @Profiling.api
  async addUserToOpportunity(
    @Args('userID') userID: number,
    @Args('opportunityID') opportunityID: number
  ): Promise<IUserGroup> {
    const group = await this.challengeService.addUserToOpportunity(
      userID,
      opportunityID
    );
    return group;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Adds the specified organisation as a lead for the specified challenge',
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

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Remove the specified organisation as a lead for the specified challenge',
  })
  @Profiling.api
  async removeChallengeLead(
    @Args('organisationID') organisationID: number,
    @Args('challengeID') challengeID: number
  ): Promise<boolean> {
    return await this.challengeService.removeChallengeLead(
      challengeID,
      organisationID
    );
  }
}
