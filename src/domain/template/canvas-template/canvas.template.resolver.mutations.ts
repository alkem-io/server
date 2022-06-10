import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CanvasTemplateService } from './canvas.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ICanvasTemplate } from './canvas.template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { UpdateCanvasTemplateInput } from './dto/canvas.template.dto.update';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DeleteCanvasTemplateInput } from './dto/canvas.template.dto.delete';

@Resolver()
export class CanvasTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private canvasTemplateService: CanvasTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvasTemplate, {
    description: 'Updates the specified CanvasTemplate.',
  })
  async updateCanvasTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasTemplateInput')
    canvasTemplateInput: UpdateCanvasTemplateInput
  ): Promise<ICanvasTemplate> {
    const canvasTemplate =
      await this.canvasTemplateService.getCanvasTemplateOrFail(
        canvasTemplateInput.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvasTemplate.authorization,
      AuthorizationPrivilege.UPDATE,
      `update canvas template: ${canvasTemplate.id}`
    );
    return await this.canvasTemplateService.updateCanvasTemplate(
      canvasTemplate,
      canvasTemplateInput
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvasTemplate, {
    description: 'Deletes the specified CanvasTemplate.',
  })
  async deleteCanvasTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCanvasTemplateInput
  ): Promise<ICanvasTemplate> {
    const canvasTemplate =
      await this.canvasTemplateService.getCanvasTemplateOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvasTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `canvas template delete: ${canvasTemplate.id}`
    );
    return await this.canvasTemplateService.deleteCanvasTemplate(
      canvasTemplate
    );
  }
}
