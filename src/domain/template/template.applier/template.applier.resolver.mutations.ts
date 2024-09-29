import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovaton.flow.service';
import { UpdateInnovationFlowFromTemplateInput } from './dto/template.dto.update.innovation.flow';
import { TemplateApplierService } from './template.applier.service';

@Resolver()
export class TemplateApplierResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationFlowService: InnovationFlowService,
    private templateApplierService: TemplateApplierService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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

    return await this.templateApplierService.updateInnovationFlowStatesFromTemplate(
      innovationFlowData
    );
  }
}
