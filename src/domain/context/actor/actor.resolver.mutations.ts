import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  DeleteActorInput,
  IActor,
  UpdateActorInput,
} from '@domain/context/actor';
import { ActorService } from './actor.service';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { UserInfo } from '@core/authentication';
import { CurrentUser } from '@common/decorators';

@Resolver()
export class ActorResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private actorService: ActorService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Deletes the specified Actor.',
  })
  async deleteActor(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteActorInput
  ): Promise<IActor> {
    const actor = await this.actorService.getActorOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      actor.authorization,
      AuthorizationPrivilege.DELETE,
      `actor delete: ${actor.name}`
    );
    return await this.actorService.deleteActor(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Updates the specified Actor.',
  })
  async updateActor(
    @CurrentUser() userInfo: UserInfo,
    @Args('actorData') actorData: UpdateActorInput
  ): Promise<IActor> {
    const actor = await this.actorService.getActorOrFail(actorData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      actor.authorization,
      AuthorizationPrivilege.DELETE,
      `actor update: ${actor.name}`
    );
    return await this.actorService.updateActor(actorData);
  }
}
