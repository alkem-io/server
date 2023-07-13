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
import { UpdateInnovationFlowLifecycleTemplateInput } from './dto/innovation.flow.dto.update.lifecycle.template';
import { InnovationFlowEvent } from './dto/innovation.flow.dto.event';
import { InnovationFlowLifecycleOptionsProviderOpportunity } from './innovation.flow.lifecycle.options.provider.opportunity';
import { InnovationFlowLifecycleOptionsProviderChallenge } from './innovation.flow.lifecycle.options.provider.challenge';
import { AdminInnovationFlowSynchronizeStatesInput } from './dto/innovation.flow.dto.admin.synchronize.states';
import { ITagset } from '@domain/common/tagset/tagset.interface';

@Resolver()
export class InnovationFlowResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationFlowService: InnovationFlowService,
    private opportunityLifecycleOptionsProvider: InnovationFlowLifecycleOptionsProviderOpportunity,
    private challengeLifecycleOptionsProvider: InnovationFlowLifecycleOptionsProviderChallenge
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
    description: 'Updates the template for the specified Innovation Flow.',
  })
  @Profiling.api
  async updateInnovationFlowLifecycleTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowData')
    innovationFlowData: UpdateInnovationFlowLifecycleTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE_INNOVATION_FLOW,
      `innovation flow template update: ${innovationFlow.id}`
    );
    return await this.innovationFlowService.updateInnovationFlowTemplate(
      innovationFlowData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlow, {
    description: 'Trigger an event on the InnovationFlow for an Opportunity.',
  })
  async eventOnOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowEventData')
    innovationFlowEventData: InnovationFlowEvent
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowEventData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on opportunity innovation flow: ${innovationFlow.id}`
    );
    return await this.opportunityLifecycleOptionsProvider.eventOnOpportunity(
      innovationFlowEventData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlow, {
    description: 'Trigger an event on the InnovationFlow for a Challenge.',
  })
  async eventOnChallenge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowEventData')
    innovationFlowEventData: InnovationFlowEvent
  ): Promise<IInnovationFlow> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowEventData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on challenge innovation flow: ${innovationFlow.id}`
    );
    return await this.challengeLifecycleOptionsProvider.eventOnChallenge(
      innovationFlowEventData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITagset, {
    description:
      'Updates the States tagset to be synchronized with the Lifecycle states.',
  })
  @Profiling.api
  async adminInnovationFlowSynchronizeStates(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowData')
    innovationFlowData: AdminInnovationFlowSynchronizeStatesInput
  ): Promise<ITagset> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowData.innovationFlowID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlow.authorization,
      AuthorizationPrivilege.UPDATE_INNOVATION_FLOW,
      `innovation flow admin synchronize states: ${innovationFlow.id}`
    );
    return await this.innovationFlowService.updateStatesTagsetTemplateToMatchLifecycle(
      innovationFlowData.innovationFlowID
    );
  }
}
