import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { EcosystemModelService } from './ecosystem-model.service';
import {
  CreateActorGroupInput,
  IActorGroup,
} from '@domain/context/actor-group';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';
import { ActorGroupAuthorizationService } from '../actor-group/actor-group.service.authorization';
@Resolver()
export class EcosystemModelResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private actorGroupAuthorizationService: ActorGroupAuthorizationService,
    private ecosystemModelService: EcosystemModelService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IActorGroup, {
    description: 'Create a new Actor Group on the EcosystemModel.',
  })
  @Profiling.api
  async createActorGroup(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('actorGroupData') actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const ecosystemModel = await this.ecosystemModelService.getEcosystemModelOrFail(
      actorGroupData.ecosystemModelID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      ecosystemModel.authorization,
      AuthorizationPrivilege.CREATE,
      `create actor group on ecosystem model: ${ecosystemModel.description}`
    );
    const actorGroup = await this.ecosystemModelService.createActorGroup(
      actorGroupData
    );
    return await this.actorGroupAuthorizationService.applyAuthorizationRules(
      actorGroup,
      ecosystemModel.authorization
    );
  }
}
