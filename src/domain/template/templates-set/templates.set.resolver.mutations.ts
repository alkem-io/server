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
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';
import { CreateCanvasTemplateOnTemplatesSetInput } from './dto/canvas.template.dto.create.on.templates.set';
import { AspectTemplateAuthorizationService } from '../aspect-template/aspect.template.service.authorization';
import { CanvasTemplateAuthorizationService } from '../canvas-template/canvas.template.service.authorization';

@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templatesSetService: TemplatesSetService,
    private aspectTemplateAuthorizationService: AspectTemplateAuthorizationService,
    private canvasTemplateAuthorizationService: CanvasTemplateAuthorizationService,
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
    const aspectTemplate = await this.templatesSetService.createAspectTemplate(
      templatesSet,
      aspectTemplateInput
    );
    await this.aspectTemplateAuthorizationService.applyAuthorizationPolicy(
      aspectTemplate,
      templatesSet.authorization
    );
    return aspectTemplate;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvasTemplate, {
    description: 'Creates a new CanvasTemplate on the specified TemplatesSet.',
  })
  async createCanvasTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasTemplateInput')
    canvasTemplateInput: CreateCanvasTemplateOnTemplatesSetInput
  ): Promise<ICanvasTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      canvasTemplateInput.templatesSetID,
      {
        relations: ['canvasTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create canvas template: ${templatesSet.id}`
    );
    const canvasTemplate = await this.templatesSetService.createCanvasTemplate(
      templatesSet,
      canvasTemplateInput
    );
    await this.canvasTemplateAuthorizationService.applyAuthorizationPolicy(
      canvasTemplate,
      templatesSet.authorization
    );
    return canvasTemplate;
  }
}
