import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { UpdateInnovationFlowStateInput } from '../innovation-flow-state/dto';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { InnovationFlowStateAuthorizationService } from '../innovation-flow-state/innovation.flow.state.service.authorization';
import {
  RemoveDefaultCalloutTemplateOnInnovationFlowStateInput,
  SetDefaultCalloutTemplateOnInnovationFlowStateInput,
} from './dto';
import { CreateStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.create';
import { DeleteStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.delete';
import { UpdateInnovationFlowCurrentStateInput } from './dto/innovation.flow.dto.state.select';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { UpdateInnovationFlowStatesSortOrderInput } from './dto/innovation.flow.dto.update.states.sort.order';
import { IInnovationFlow } from './innovation.flow.interface';
import { InnovationFlowService } from './innovation.flow.service';

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

  @Mutation(() => IInnovationFlowState, {
    description: 'Updates the specified InnovationFlowState.',
  })
  async updateInnovationFlowState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('stateData')
    innovationFlowStateData: UpdateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const innovationFlowState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        innovationFlowStateData.innovationFlowStateID
      );
    if (!innovationFlowState.innovationFlow) {
      throw new EntityNotInitializedException(
        'InnovationFlowState does not have an associated InnovationFlow.',
        LogContext.INNOVATION_FLOW,
        { innovationFlowStateID: innovationFlowState.id }
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowState.authorization,
      AuthorizationPrivilege.UPDATE,
      `update InnovationFlowState: ${innovationFlowState.id}`
    );

    return this.innovationFlowService.updateInnovationFlowState(
      innovationFlowState.innovationFlow.id,
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

  @Mutation(() => IInnovationFlowState, {
    description: 'Set the default callout template for an InnovationFlowState.',
  })
  async setDefaultCalloutTemplateOnInnovationFlowState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('setData')
    setData: SetDefaultCalloutTemplateOnInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const flowState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        setData.flowStateID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      flowState.authorization,
      AuthorizationPrivilege.UPDATE,
      'set default callout template on innovation flow state'
    );

    return this.innovationFlowStateService.setDefaultCalloutTemplate(
      setData.flowStateID,
      setData.templateID
    );
  }

  @Mutation(() => IInnovationFlowState, {
    description:
      'Remove the default callout template from an InnovationFlowState.',
  })
  async removeDefaultCalloutTemplateOnInnovationFlowState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('removeData')
    removeData: RemoveDefaultCalloutTemplateOnInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const flowState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        removeData.flowStateID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      flowState.authorization,
      AuthorizationPrivilege.UPDATE,
      'remove default callout template on innovation flow state'
    );

    return this.innovationFlowStateService.removeDefaultCalloutTemplate(
      removeData.flowStateID
    );
  }
}
