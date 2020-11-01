import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { ActorGroupService } from './actor-group.service';
import { ActorInput } from '../actor/actor.dto';

@Resolver()
export class ActorGroupResolver {
  constructor(private actorGroupService: ActorGroupService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description:
      'Replace the set of tags in a ActorGroup with the provided tags',
  })
  async addActorOnActorGroup(
    @Args('actorGroupID') actorGroupID: number,
    @Args('actorData') actorData: ActorInput
  ): Promise<boolean> {
    const result = await this.actorGroupService.addActor(
      actorGroupID,
      actorData
    );

    return result;
  }
}
