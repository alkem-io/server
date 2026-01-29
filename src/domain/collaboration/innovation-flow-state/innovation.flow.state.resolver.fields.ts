import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ITemplate } from '@domain/template/template/template.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { InnovationFlowStateService } from './innovation.flow.state.service';

@Resolver(() => IInnovationFlowState)
export class InnovationFlowStateResolverFields {
  constructor(
    private readonly innovationFlowStateService: InnovationFlowStateService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('defaultCalloutTemplate', () => ITemplate, {
    nullable: true,
    description:
      'Default callout template applied to this flow state (nullable, optional).',
  })
  async defaultCalloutTemplate(
    @Parent() flowState: InnovationFlowState
  ): Promise<ITemplate | null> {
    return this.innovationFlowStateService.getDefaultCalloutTemplate(
      flowState.id
    );
  }
}
