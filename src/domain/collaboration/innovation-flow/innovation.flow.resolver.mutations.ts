import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { InnovationFlowService } from './innovaton.flow.service';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.update.selected.state';
import { UpdateInnovationFlowFromTemplateInput } from './dto/innovation.flow.dto.update.from.template';
import { UpdateInnovationFlowSingleStateInput } from './dto/innovation.flow.dto.update.single.state';

@Resolver()
export class InnovationFlowResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationFlowService: InnovationFlowService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlow, {
    description: 'Updates the InnovationFlow.',
  })
  async updateInnovationFlow(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowData') innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationFlow: ${innovationFlow.id}`
    );

    return await this.innovationFlowService.update(innovationFlowData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlow, {
    description: 'Updates the InnovationFlow.',
  })
  async updateInnovationFlowSelectedState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowStateData')
    innovationFlowStateData: UpdateInnovationFlowSelectedStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowStateData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationFlow selectedState: ${innovationFlow.id}`
    );

    return await this.innovationFlowService.updateSelectedState(
      innovationFlowStateData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlow, {
    description:
      'Updates the InnovationFlow states from the specified template.',
  })
  async updateInnovationFlowStatesFromTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowData')
    innovationFlowData: UpdateInnovationFlowFromTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationFlow from template: ${innovationFlow.id}`
    );

    return await this.innovationFlowService.updateStatesFromTemplate(
      innovationFlowData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlow, {
    description: 'Updates the specified InnovationFlowState.',
  })
  async updateInnovationFlowSingleState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowStateData')
    innovationFlowStateData: UpdateInnovationFlowSingleStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowStateData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationFlow update specified state: ${innovationFlow.id}`
    );

    return await this.innovationFlowService.updateSingleState(
      innovationFlowStateData
    );
  }
}
