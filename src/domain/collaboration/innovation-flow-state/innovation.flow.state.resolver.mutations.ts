import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InstrumentResolver } from '@src/apm/decorators';
import { InnovationFlowStateService } from './innovation.flow.state.service';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';

@InstrumentResolver()
@Resolver()
export class InnovationFlowStateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationFlowStateService: InnovationFlowStateService
  ) {}

  @Mutation(() => IInnovationFlowState, {
    description: 'Updates the specified InnovationFlowState.',
  })
  async updateInnovationFlowSingleState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowStateData')
    innovationFlowStateData: UpdateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const innovationFlowState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        innovationFlowStateData.innovationFlowStateID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowState.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationFlow update specified state: ${innovationFlowState.id}`
    );

    return await this.innovationFlowStateService.update(
      innovationFlowState,
      innovationFlowStateData
    );
  }
}
