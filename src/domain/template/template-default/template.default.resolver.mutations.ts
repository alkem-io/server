import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UpdateTemplateDefaultTemplateInput } from './dto/template.default.dto.update';
import { ITemplateDefault } from './template.default.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateDefaultService } from './template.default.service';

@Resolver()
export class TemplatesDefaultResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templatesDefaultService: TemplateDefaultService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITemplateDefault, {
    description: 'Updates the specified SpaceDefaults.',
  })
  async updateTemplateDefault(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateDefaultData')
    templateDefaultData: UpdateTemplateDefaultTemplateInput
  ): Promise<ITemplateDefault> {
    const templateDefault =
      await this.templatesDefaultService.getTemplateDefaultOrFail(
        templateDefaultData.templateDefaultID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templateDefault.authorization,
      AuthorizationPrivilege.UPDATE,
      `update templateDefault of type ${templateDefault.type}: ${templateDefault.id}`
    );

    return this.templatesDefaultService.updateTemplateDefaultTemplate(
      templateDefault,
      templateDefaultData
    );
  }
}
