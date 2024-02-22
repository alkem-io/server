import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardTemplateService } from './whiteboard.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IWhiteboardTemplate } from './whiteboard.template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';
import { UpdateWhiteboardTemplateInput } from './dto/whiteboard.template.dto.update';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DeleteWhiteboardTemplateInput } from './dto/whiteboard.template.dto.delete';

@Resolver()
export class WhiteboardTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardTemplate, {
    description: 'Updates the specified WhiteboardTemplate.',
  })
  async updateWhiteboardTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardTemplateInput')
    whiteboardTemplateInput: UpdateWhiteboardTemplateInput
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate =
      await this.whiteboardTemplateService.getWhiteboardTemplateOrFail(
        whiteboardTemplateInput.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update whiteboard template: ${whiteboardTemplate.id}`
    );
    return await this.whiteboardTemplateService.updateWhiteboardTemplate(
      whiteboardTemplate,
      whiteboardTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardTemplate, {
    description: 'Deletes the specified WhiteboardTemplate.',
  })
  async deleteWhiteboardTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteWhiteboardTemplateInput
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate =
      await this.whiteboardTemplateService.getWhiteboardTemplateOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `whiteboard template delete: ${whiteboardTemplate.id}`
    );
    return await this.whiteboardTemplateService.deleteWhiteboardTemplate(
      whiteboardTemplate
    );
  }
}
