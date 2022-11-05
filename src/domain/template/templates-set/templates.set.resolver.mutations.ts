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
import { CreateLifecycleTemplateOnTemplatesSetInput } from './dto/lifecycle.template.dto.create.on.templates.set';
import { ILifecycleTemplate } from '../lifecycle-template/lifecycle.template.interface';
import { LifecycleTemplateAuthorizationService } from '../lifecycle-template/lifecycle.template.service.authorization';
import { LifecycleTemplateService } from '../lifecycle-template/lifecycle.template.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { DeleteLifecycleTemplateInput } from './dto/lifecycle.template.dto.delete.on.templates.set';

@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templatesSetService: TemplatesSetService,
    private lifecycleTemplateService: LifecycleTemplateService,
    private aspectTemplateAuthorizationService: AspectTemplateAuthorizationService,
    private canvasTemplateAuthorizationService: CanvasTemplateAuthorizationService,
    private lifecycleTemplateAuthorizationService: LifecycleTemplateAuthorizationService,
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILifecycleTemplate, {
    description:
      'Creates a new LifecycleTemplate on the specified TemplatesSet.',
  })
  async createLifecycleTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('lifecycleTemplateInput')
    lifecycleTemplateInput: CreateLifecycleTemplateOnTemplatesSetInput
  ): Promise<ILifecycleTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      lifecycleTemplateInput.templatesSetID,
      {
        relations: ['lifecycleTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create lifecycle template: ${templatesSet.id}`
    );
    const lifecycleTemplate =
      await this.templatesSetService.createInnovationFlowTemplate(
        templatesSet,
        lifecycleTemplateInput
      );
    await this.lifecycleTemplateAuthorizationService.applyAuthorizationPolicy(
      lifecycleTemplate,
      templatesSet.authorization
    );
    return lifecycleTemplate;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILifecycleTemplate, {
    description: 'Deletes the specified LifecycleTemplate.',
  })
  async deleteLifecycleTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteLifecycleTemplateInput
  ): Promise<ILifecycleTemplate> {
    const innovationFlowTemplate =
      await this.lifecycleTemplateService.getLifecycleTemplateOrFail(
        deleteData.ID,
        {
          relations: ['templatesSet'],
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `lifecycle template delete: ${innovationFlowTemplate.id}`
    );
    const templatesSet = innovationFlowTemplate.templatesSet;
    if (!templatesSet) {
      throw new RelationshipNotFoundException(
        `Unable to load TemplatesSet for innovation flow template: ${innovationFlowTemplate.id}`,
        LogContext.TEMPLATES
      );
    }
    return await this.templatesSetService.deleteInnovationFlowTemplate(
      innovationFlowTemplate,
      templatesSet
    );
  }
}
