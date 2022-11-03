import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LifecycleTemplateService } from '@domain/template/lifecycle-template/lifecycle.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ILifecycleTemplate } from '@domain/template/lifecycle-template/lifecycle.template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { UpdateLifecycleTemplateInput } from '@domain/template/lifecycle-template/dto/lifecycle.template.dto.update';
import { DeleteLifecycleTemplateInput } from '@domain/template/lifecycle-template/dto/lifecycle.template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class LifecycleTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private lifecycleTemplateService: LifecycleTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILifecycleTemplate, {
    description: 'Updates the specified LifecycleTemplate.',
  })
  async updateLifecycleTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('lifecycleTemplateInput')
    lifecycleTemplateInput: UpdateLifecycleTemplateInput
  ): Promise<ILifecycleTemplate> {
    const lifecycleTemplate =
      await this.lifecycleTemplateService.getLifecycleTemplateOrFail(
        lifecycleTemplateInput.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      lifecycleTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update lifecycle template: ${lifecycleTemplate.id}`
    );
    return await this.lifecycleTemplateService.updateLifecycleTemplate(
      lifecycleTemplate,
      lifecycleTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILifecycleTemplate, {
    description: 'Deletes the specified LifecycleTemplate.',
  })
  async deleteLifecycleTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteLifecycleTemplateInput
  ): Promise<ILifecycleTemplate> {
    const lifecycleTemplate =
      await this.lifecycleTemplateService.getLifecycleTemplateOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      lifecycleTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `lifecycle template delete: ${lifecycleTemplate.id}`
    );
    return await this.lifecycleTemplateService.deleteLifecycleTemplate(
      lifecycleTemplate
    );
  }
}
