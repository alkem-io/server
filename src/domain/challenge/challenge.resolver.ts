import { Inject } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Float, Mutation } from '@nestjs/graphql/dist';
import { UserGroup } from '../user-group/user-group.entity';
import { ChallengeService } from './challenge.service';

@Resolver()
export class ChallengeResolver {
  constructor(
    @Inject(ChallengeService) private challengeService: ChallengeService
  ) {}

  ///// Mutations /////
  @Mutation(() => UserGroup, {
    description: 'Creates a new user group for the challenge with the given id',
  })
  async createGroupOnChallenge(
    @Args({ name: 'challengeID', type: () => Float }) challengeID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<UserGroup> {
    const group = await this.challengeService.createGroup(
      challengeID,
      groupName
    );
    return group;
  }
}
