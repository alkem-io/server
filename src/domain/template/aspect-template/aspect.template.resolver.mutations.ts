import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AspectTemplateService } from './aspect.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IAspectTemplate } from './aspect.template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { UpdateAspectTemplateInput } from './dto/aspect.template.dto.update';
import { DeleteAspectTemplateInput } from './dto/aspect.template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class AspectTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private aspectTemplateService: AspectTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspectTemplate, {
    description: 'Updates the specified AspectTemplate.',
  })
  async updateAspectTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectTemplateInput')
    aspectTemplateInput: UpdateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate =
      await this.aspectTemplateService.getAspectTemplateOrFail(
        aspectTemplateInput.ID,
        {
          relations: ['templateInfo'],
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspectTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update aspect template: ${aspectTemplate.id}`
    );
    return await this.aspectTemplateService.updateAspectTemplate(
      aspectTemplate,
      aspectTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspectTemplate, {
    description: 'Deletes the specified AspectTemplate.',
  })
  async deleteAspectTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate =
      await this.aspectTemplateService.getAspectTemplateOrFail(deleteData.ID, {
        relations: ['templateInfo'],
      });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspectTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `aspect template delete: ${aspectTemplate.id}`
    );
    return await this.aspectTemplateService.deleteAspectTemplate(
      aspectTemplate
    );
  }
}
