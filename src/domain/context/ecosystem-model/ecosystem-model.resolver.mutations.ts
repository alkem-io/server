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
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ActorGroupAuthorizationService } from '@domain/context/actor-group/actor-group.service.authorization';
import { IEcosystemModel } from './ecosystem-model.interface';
import { UpdateEcosystemModelInput } from './dto/ecosystem-model.dto.update';
@Resolver()
export class EcosystemModelResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
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
    const ecosystemModel =
      await this.ecosystemModelService.getEcosystemModelOrFail(
        actorGroupData.ecosystemModelID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecosystemModel.authorization,
      AuthorizationPrivilege.CREATE,
      `create actor group on ecosystem model: ${ecosystemModel.description}`
    );
    const actorGroup = await this.ecosystemModelService.createActorGroup(
      actorGroupData
    );
    return await this.actorGroupAuthorizationService.applyAuthorizationPolicy(
      actorGroup,
      ecosystemModel.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IEcosystemModel, {
    description: 'Updates the specified EcosystemModel.',
  })
  @Profiling.api
  async updateEcosystemModel(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ecosystemModelData') ecosystemModelData: UpdateEcosystemModelInput
  ): Promise<IEcosystemModel> {
    const ecosystemModel =
      await this.ecosystemModelService.getEcosystemModelOrFail(
        ecosystemModelData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      ecosystemModel.authorization,
      AuthorizationPrivilege.UPDATE,
      `ecosystem model update: ${ecosystemModel.id}`
    );
    return await this.ecosystemModelService.updateEcosystemModel(
      ecosystemModel,
      ecosystemModelData
    );
  }
}
