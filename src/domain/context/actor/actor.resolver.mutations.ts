import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  DeleteActorInput,
  IActor,
  UpdateActorInput,
} from '@domain/context/actor';
import { ActorService } from './actor.service';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';

@Resolver()
export class ActorResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private actorService: ActorService
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Deletes the specified Actor.',
  })
  async deleteActor(
    @Args('deleteData') deleteData: DeleteActorInput
  ): Promise<IActor> {
    return await this.actorService.deleteActor(deleteData);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Updates the specified Actor.',
  })
  async updateActor(
    @Args('actorData') actorData: UpdateActorInput
  ): Promise<IActor> {
    return await this.actorService.updateActor(actorData);
  }
}
