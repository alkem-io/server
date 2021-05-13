import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';

import {
  ActorGroup,
  IActorGroup,
  DeleteActorGroupInput,
} from '@domain/context/actor-group';
import { Actor, IActor, CreateActorInput } from '@domain/context/actor';

@Resolver()
export class ActorGroupResolverMutations {
  constructor(private actorGroupService: ActorGroupService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Actor, {
    description: 'Creates a new Actor in the specified ActorGroup.',
  })
  async createActor(
    @Args('actorData') actorData: CreateActorInput
  ): Promise<IActor> {
    const result = await this.actorGroupService.createActor(actorData);

    return result;
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => ActorGroup, {
    description:
      'Deletes the specified Actor Group, including contained Actors.',
  })
  async deleteActorGroup(
    @Args('deleteData') deleteData: DeleteActorGroupInput
  ): Promise<IActorGroup> {
    return await this.actorGroupService.deleteActorGroup(deleteData);
  }
}
