import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { GraphqlGuard } from '@core/authorization';

import {
  IActorGroup,
  DeleteActorGroupInput,
} from '@domain/context/actor-group';
import { IActor, CreateActorInput } from '@domain/context/actor';
import { AuthorizationPrivilege } from '@common/enums';
import { UserInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { CurrentUser } from '@common/decorators';

@Resolver()
export class ActorGroupResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private actorGroupService: ActorGroupService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Creates a new Actor in the specified ActorGroup.',
  })
  async createActor(
    @CurrentUser() userInfo: UserInfo,
    @Args('actorData') actorData: CreateActorInput
  ): Promise<IActor> {
    const actorGroup = await this.actorGroupService.getActorGroupOrFail(
      actorData.actorGroupID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      actorGroup.authorization,
      AuthorizationPrivilege.CREATE,
      `create actor on actor group: ${actorGroup.name}`
    );
    return await this.actorGroupService.createActor(actorData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActorGroup, {
    description:
      'Deletes the specified Actor Group, including contained Actors.',
  })
  async deleteActorGroup(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = await this.actorGroupService.getActorGroupOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      actorGroup.authorization,
      AuthorizationPrivilege.DELETE,
      `delete actor group: ${actorGroup.name}`
    );
    return await this.actorGroupService.deleteActorGroup(deleteData);
  }
}
