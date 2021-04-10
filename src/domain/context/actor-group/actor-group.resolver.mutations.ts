import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

import {
  ActorGroup,
  IActorGroup,
  DeleteActorGroupInput,
} from '@domain/context/actor-group';
import { Actor, IActor, CreateActorInput } from '@domain/context/actor';

@Resolver()
export class ActorGroupResolverMutations {
  constructor(private actorGroupService: ActorGroupService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Actor, {
    description: 'Create a new actor on the ActorGroup with the specified ID',
  })
  async createActor(
    @Args('actorData') actorData: CreateActorInput
  ): Promise<IActor> {
    const result = await this.actorGroupService.createActor(actorData);

    return result;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => ActorGroup, {
    description: 'Removes the actor group with the specified ID',
  })
  async deleteActorGroup(
    @Args('deleteData') deleteData: DeleteActorGroupInput
  ): Promise<IActorGroup> {
    return await this.actorGroupService.deleteActorGroup(deleteData);
  }
}
