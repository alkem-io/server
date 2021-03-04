import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authorization/graphql.guard';
import { Roles } from '@utils/authorization/roles.decorator';
import { ActorInput } from '@domain/actor/actor.dto';
import { Actor } from '@domain/actor/actor.entity';
import { IActor } from '@domain/actor/actor.interface';
import { ActorGroupService } from '@domain/actor-group/actor-group.service';
import { AuthorisationRoles } from '@utils/authorization/authorization.roles';

@Resolver()
export class ActorGroupResolver {
  constructor(private actorGroupService: ActorGroupService) {}

  @Roles(AuthorisationRoles.EcoverseAdmins)
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

  @Roles(AuthorisationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the actor group with the specified ID',
  })
  async removeActorGroup(@Args('ID') actorGroupID: number): Promise<boolean> {
    return await this.actorGroupService.removeActorGroup(actorGroupID);
  }
}
