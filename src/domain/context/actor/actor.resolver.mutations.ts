import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import {
  Actor,
  DeleteActorInput,
  IActor,
  UpdateActorInput,
} from '@domain/context/actor';
import { ActorService } from './actor.service';

@Resolver()
export class ActorResolverMutations {
  constructor(private actorService: ActorService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Actor, {
    description: 'Deletes the specified Actor.',
  })
  async deleteActor(
    @Args('deleteData') deleteData: DeleteActorInput
  ): Promise<IActor> {
    return await this.actorService.deleteActor(deleteData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Actor, {
    description: 'Updates the specified Actor.',
  })
  async updateActor(
    @Args('actorData') actorData: UpdateActorInput
  ): Promise<IActor> {
    return await this.actorService.updateActor(actorData);
  }
}
