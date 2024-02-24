import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { InnovationFlowService } from './innovaton.flow.service';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.update.selected.state';

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
  @Profiling.api
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
  @Profiling.api
  async updateInnovationFlowState(
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
}
