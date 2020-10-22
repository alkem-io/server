import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Float, Mutation } from '@nestjs/graphql/dist';
import { Roles } from 'src/utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { ChallengeInput } from './challenge.dto';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';
import { ChallengeService } from './challenge.service';

@Resolver()
export class ChallengeResolver {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Creates a new user group for the challenge with the given id',
  })
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
  @Mutation(() => Challenge, {
    description:
      'Updates the specified Challenge with the provided data (merge)',
  })
  async updateChallenge(
    @Args({ name: 'challengeID', type: () => Float }) challengeID: number,
    @Args('challengeData') challengeData: ChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.updateChallenge(
      challengeID,
      challengeData
    );
    return challenge;
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
  async addUserToChallenge(
    @Args('userID') userID: number,
    @Args('challengeID') challengeID: number
  ): Promise<IUserGroup> {
    const group = this.challengeService.addMember(userID, challengeID);
    return group;
  }
}
