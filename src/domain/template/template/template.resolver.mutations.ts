import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TemplateService } from './template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ITemplate } from './template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UpdateTemplateInput } from './dto/template.dto.update';
import { DeleteTemplateInput } from './dto/template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovaton.flow.service';
import { UpdateInnovationFlowFromTemplateInput } from './dto/template.dto.update.innovation.flow';

@Resolver()
export class TemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationFlowService: InnovationFlowService,
    private templateService: TemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITemplate, {
    description: 'Updates the specified Template.',
  })
  async updateTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      updateData.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      template.authorization,
      AuthorizationPrivilege.UPDATE,
      `update template: ${template.id}`
    );
    return await this.templateService.updateTemplate(template, updateData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITemplate, {
    description: 'Deletes the specified Template.',
  })
  async deleteTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      deleteData.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      template.authorization,
      AuthorizationPrivilege.DELETE,
      `template delete: ${template.id}`
    );
    return await this.templateService.delete(template);
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

    return await this.templateService.updateInnovationFlowStatesFromTemplate(
      innovationFlowData
    );
  }
}
