import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';

import {
  IActorGroup,
  DeleteActorGroupInput,
} from '@domain/context/actor-group';
import { IActor, CreateActorInput } from '@domain/context/actor';
import { AuthorizationRoleGlobal } from '@common/enums';

@Resolver()
export class ActorGroupResolverMutations {
  constructor(private actorGroupService: ActorGroupService) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Creates a new Actor in the specified ActorGroup.',
  })
  async createActor(
    @Args('actorData') actorData: CreateActorInput
  ): Promise<IActor> {
    const result = await this.actorGroupService.createActor(actorData);

    return result;
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IActorGroup, {
    description:
      'Deletes the specified Actor Group, including contained Actors.',
  })
  async deleteActorGroup(
    @Args('deleteData') deleteData: DeleteActorGroupInput
  ): Promise<IActorGroup> {
    return await this.actorGroupService.deleteActorGroup(deleteData);
  }
}
