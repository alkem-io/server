import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplatesSetService } from './templates.set.service';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication/agent-info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CreateAspectTemplateOnTemplatesSetInput } from './dto/aspect.template.dto.create.on.templates.set';
import { DeleteAspectTemplateOnTemplateSetInput } from './dto/aspect.template.dto.delete.on.template.set';
import { UpdateAspectTemplateOnTemplatesSetInput } from './dto/aspect.template.dto.update.on.templates.set';

@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templatesSetService: TemplatesSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspectTemplate, {
    description: 'Creates a new AspectTemplate on the specified TemplatesSet.',
  })
  async createAspectTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectTemplateInput')
    aspectTemplateInput: CreateAspectTemplateOnTemplatesSetInput
  ): Promise<IAspectTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      aspectTemplateInput.templatesSetID,
      {
        relations: ['aspectTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create aspect template: ${templatesSet.id}`
    );
    return await this.templatesSetService.createAspectTemplate(
      templatesSet,
      aspectTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspectTemplate, {
    description:
      'Updates the specified AspectTemplate on the specified TemplatesSet.',
  })
  async updateAspectTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectTemplateInput')
    aspectTemplateInput: UpdateAspectTemplateOnTemplatesSetInput
  ): Promise<IAspectTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      aspectTemplateInput.templatesSetID,
      {
        relations: ['aspectTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.UPDATE,
      `templates set update aspect template: ${templatesSet.id}`
    );
    return await this.templatesSetService.updateAspectTemplate(
      templatesSet,
      aspectTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspectTemplate, {
    description:
      'Deletes the specified AspectTemplate in the specified TemplatesSet.',
  })
  async deleteAspectTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAspectTemplateOnTemplateSetInput
  ): Promise<IAspectTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      deleteData.templatesSetID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.DELETE,
      `aspect template delete: ${templatesSet.id}`
    );
    return await this.templatesSetService.deleteAspectTemplate(
      templatesSet,
      deleteData
    );
  }
}
