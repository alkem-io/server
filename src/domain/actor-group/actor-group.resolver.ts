import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { ActorGroupService } from './actor-group.service';
import { ActorInput } from '../actor/actor.dto';
import { IActor } from '../actor/actor.interface';
import { Actor } from '../actor/actor.entity';

@Resolver()
export class ActorGroupResolver {
  constructor(private actorGroupService: ActorGroupService) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Actor, {
    description: 'Create a new actor on the ActorGroup with the specified ID',
  })
  async createActor(
    @Args('actorGroupID') actorGroupID: number,
    @Args('actorData') actorData: ActorInput
  ): Promise<IActor> {
    const result = await this.actorGroupService.createActor(
      actorGroupID,
      actorData
    );

    return result;
  }
}
