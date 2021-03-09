import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ActorInput } from '@domain/context/actor/actor.dto';
import { Actor } from '@domain/context/actor/actor.entity';
import { IActor } from '@domain/context/actor/actor.interface';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver()
export class ActorGroupResolver {
  constructor(private actorGroupService: ActorGroupService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
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

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the actor group with the specified ID',
  })
  async removeActorGroup(@Args('ID') actorGroupID: number): Promise<boolean> {
    return await this.actorGroupService.removeActorGroup(actorGroupID);
  }
}
