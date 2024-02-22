import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { UpdateInnovationFlowTemplateInput } from './dto/innovation.flow.template.dto.update';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { InnovationFlowTemplateService } from './innovation.flow.template.service';

@Resolver()
export class InnovationFlowTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlowTemplate, {
    description: 'Updates the specified InnovationFlowTemplate.',
  })
  async updateInnovationFlowTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowTemplateInput')
    innovationFlowTemplateInput: UpdateInnovationFlowTemplateInput
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplate =
      await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
        innovationFlowTemplateInput.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update innovationFlow template: ${innovationFlowTemplate.id}`
    );
    return await this.innovationFlowTemplateService.updateInnovationFlowTemplate(
      innovationFlowTemplate,
      innovationFlowTemplateInput
    );
  }
}
