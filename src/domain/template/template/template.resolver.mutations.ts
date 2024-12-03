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
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions/validation.exception';
import { template } from 'lodash';

@Resolver()
export class TemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
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
    description: 'Updates the specified Template.',
  })
  async updateCollaborationTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateCollaborationTemplateInput
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
  /*
  updateCOllaborationTemplate{
    update privilege on the template
    read privilege on the source

    check that it is collab template
    delete all the callouts on the template
    repla
    clone callouts from the source collaboration

    logic in template updateCollaborationFromTemplate
  }
    */

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
    const usedInTemplateDefault =
      await this.templateService.isTemplateInUseInTemplateDefault(template.id);
    if (usedInTemplateDefault) {
      throw new ValidationException(
        `Template is in use in TemplateDefault: ${template.id}`,
        LogContext.TEMPLATES
      );
    }

    return await this.templateService.delete(template);
  }
}
