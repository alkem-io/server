import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { GraphqlGuard } from '@core/authorization';

import {
  IActorGroup,
  DeleteActorGroupInput,
} from '@domain/context/actor-group';
import { IActor } from '@domain/context/actor/actor.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CurrentUser } from '@common/decorators';
import { ActorService } from '../actor/actor.service';
import { CreateActorInput } from '@domain/context/actor/actor.dto.create';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class ActorGroupResolverMutations {
  constructor(
    private actorService: ActorService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private actorGroupService: ActorGroupService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActor, {
    description: 'Creates a new Actor in the specified ActorGroup.',
  })
  async createActor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('actorData') actorData: CreateActorInput
  ): Promise<IActor> {
    const actorGroup = await this.actorGroupService.getActorGroupOrFail(
      actorData.actorGroupID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      actorGroup.authorization,
      AuthorizationPrivilege.CREATE,
      `create actor on actor group: ${actorGroup.name}`
    );
    const actor = await this.actorGroupService.createActor(actorData);
    actor.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        actor.authorization,
        actorGroup.authorization
      );
    return await this.actorService.saveActor(actor);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActorGroup, {
    description:
      'Deletes the specified Actor Group, including contained Actors.',
  })
  async deleteActorGroup(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = await this.actorGroupService.getActorGroupOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      actorGroup.authorization,
      AuthorizationPrivilege.DELETE,
      `delete actor group: ${actorGroup.name}`
    );
    return await this.actorGroupService.deleteActorGroup(deleteData);
  }
}
