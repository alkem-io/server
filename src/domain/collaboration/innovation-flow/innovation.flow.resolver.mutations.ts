import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { InnovationFlowService } from './innovation.flow.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowCurrentStateInput } from './dto/innovation.flow.dto.state.select';
import { InstrumentResolver } from '@src/apm/decorators';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { CreateStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.create';
import { InnovationFlowStateAuthorizationService } from '../innovation-flow-state/innovation.flow.state.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { UpdateInnovationFlowStatesSortOrderInput } from './dto/innovation.flow.dto.update.states.sort.order';
import { DeleteStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.delete';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';

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
    @Args('stateData') stateData: CreateStateOnInnovationFlowInput
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
      this.innovationFlowStateAuthorizationService.applyAuthorizationPolicy(
        state,
        innovationFlow.authorization
      );
    await this.authorizationPolicyService.save(authorization);

    return await this.innovationFlowStateService.getInnovationFlowStateOrFail(
      state.id
    );
  }

  @Mutation(() => IInnovationFlowState, {
    description: 'Delete a  State on the InnovationFlow.',
  })
  async deleteStateOnInnovationFlow(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('stateData') stateData: DeleteStateOnInnovationFlowInput
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
      AuthorizationPrivilege.DELETE,
      `delete state on InnovationFlow: ${innovationFlow.id}`
    );

    return await this.innovationFlowService.deleteStateOnInnovationFlow(
      innovationFlow,
      stateData
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
  async updateInnovationFlowCurrentState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowStateData')
    innovationFlowStateData: UpdateInnovationFlowCurrentStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowStateData.innovationFlowID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateInnovationFlow currentState: ${innovationFlow.id}`
    );

    return await this.innovationFlowService.updateCurrentState(
      innovationFlowStateData
    );
  }

  @Mutation(() => [IInnovationFlowState], {
    description:
      'Update the sortOrder field of the supplied InnovationFlowStates to increase as per the order that they are provided in.',
  })
  async updateInnovationFlowStatesSortOrder(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('sortOrderData')
    sortOrderData: UpdateInnovationFlowStatesSortOrderInput
  ): Promise<IInnovationFlowState[]> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        sortOrderData.innovationFlowID,
        {
          relations: {
            states: true,
          },
        }
      );

    if (sortOrderData.stateIDs.length === 0) {
      throw new ValidationException(
        'No state IDs provided for sort order update.',
        LogContext.INNOVATION_FLOW,
        { innovationFlowID: innovationFlow.id }
      );
    }
    if (sortOrderData.stateIDs.length !== innovationFlow.states.length) {
      throw new ValidationException(
        'The number of states provided for sorting does not match the number of states of the Innovation Flow.',
        LogContext.INNOVATION_FLOW,
        { innovationFlowID: innovationFlow.id }
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `update states sort order on innovation flow: ${innovationFlow.id}`
    );

    return this.innovationFlowService.updateStatesSortOrder(
      innovationFlow.id,
      sortOrderData
    );
  }
}
