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
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators';

@Resolver()
export class ActorResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private actorService: ActorService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Deletes the specified Actor.',
  })
  async deleteActor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteActorInput
  ): Promise<IActor> {
    const actor = await this.actorService.getActorOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('actorData') actorData: UpdateActorInput
  ): Promise<IActor> {
    const actor = await this.actorService.getActorOrFail(actorData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      actor.authorization,
      AuthorizationPrivilege.DELETE,
      `actor update: ${actor.name}`
    );
    return await this.actorService.updateActor(actorData);
  }
}
