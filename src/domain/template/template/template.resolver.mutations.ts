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
    @Args('templateInput')
    templateInput: UpdateTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      templateInput.ID,
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
    return await this.templateService.updateTemplate(template, templateInput);
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
      `post template delete: ${template.id}`
    );
    return await this.templateService.delete(template);
  }
}
