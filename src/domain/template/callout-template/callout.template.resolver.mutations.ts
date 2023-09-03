import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutTemplateService } from './callout.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ICalloutTemplate } from './callout.template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { UpdateCalloutTemplateInput } from './dto/callout.template.dto.update';
import { DeleteCalloutTemplateInput } from './dto/callout.template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class CalloutTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutTemplateService: CalloutTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutTemplate, {
    description: 'Updates the specified CalloutTemplate.',
  })
  async updateCalloutTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutTemplateInput')
    calloutTemplateInput: UpdateCalloutTemplateInput
  ): Promise<ICalloutTemplate> {
    const calloutTemplate =
      await this.calloutTemplateService.getCalloutTemplateOrFail(
        calloutTemplateInput.ID,
        {
          relations: ['profile'],
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      calloutTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callout template: ${calloutTemplate.id}`
    );
    return await this.calloutTemplateService.updateCalloutTemplate(
      calloutTemplate,
      calloutTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutTemplate, {
    description: 'Deletes the specified CalloutTemplate.',
  })
  async deleteCalloutTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCalloutTemplateInput
  ): Promise<ICalloutTemplate> {
    const calloutTemplate =
      await this.calloutTemplateService.getCalloutTemplateOrFail(
        deleteData.ID,
        {
          relations: ['profile'],
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      calloutTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `callout template delete: ${calloutTemplate.id}`
    );
    return await this.calloutTemplateService.deleteCalloutTemplate(
      calloutTemplate
    );
  }
}
