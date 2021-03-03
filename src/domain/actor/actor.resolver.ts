import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { ActorInput } from './actor.dto';
import { Actor } from './actor.entity';
import { IActor } from './actor.interface';
import { ActorService } from './actor.service';

@Resolver()
export class ActorResolver {
  constructor(private actorService: ActorService) {}

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the actor  with the specified ID',
  })
  async removeActor(@Args('ID') actorID: number): Promise<boolean> {
    return await this.actorService.removeActor(actorID);
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Actor, {
    description:
      'Updates the actor with the specified ID with the supplied data',
  })
  async updateActor(
    @Args('ID') actorID: number,
    @Args('actorData') actorData: ActorInput
  ): Promise<IActor> {
    return await this.actorService.updateActor(actorID, actorData);
  }
}
