import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { InnovationFlowService } from './innovation.flow.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.state.select';
import { InstrumentResolver } from '@src/apm/decorators';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { CreateStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.create';
import { InnovationFlowStateAuthorizationService } from '../innovation-flow-state/innovation.flow.state.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';

@InstrumentResolver()
@Resolver()
export class InnovationFlowResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private innovationFlowService: InnovationFlowService,
    private innovationFlowStateService: InnovationFlowStateService,
    private innovationFlowStateAuthorizationService: InnovationFlowStateAuthorizationService
  ) {}

  @Mutation(() => IInnovationFlowState, {
    description: 'Create a new State on the InnovationFlow.',
  })
  async createStateOnInnovationFlow(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('stateDate') stateData: CreateStateOnInnovationFlowInput
  ): Promise<IInnovationFlowState> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        stateData.innovationFlowID,
        {
          relations: {
            states: true,
          },
        }
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.CREATE,
      `create state on InnovationFlow: ${innovationFlow.id}`
    );

    const state = await this.innovationFlowService.createStateOnInnovationFlow(
      innovationFlow,
      stateData
    );

    const authorization =
      await this.innovationFlowStateAuthorizationService.applyAuthorizationPolicy(
        state,
        innovationFlow.authorization
      );
    await this.authorizationPolicyService.save(authorization);

    return await this.innovationFlowStateService.getInnovationFlowStateOrFail(
      state.id
    );
  }

  @Mutation(() => IInnovationFlow, {
    description: 'Updates the InnovationFlow.',
  })
  async updateInnovationFlow(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowData')
    innovationFlowData: UpdateInnovationFlowInput
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

    return await this.innovationFlowService.updateInnovationFlow(
      innovationFlowData
    );
  }

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
    this.authorizationService.grantAccessOrFail(
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
