import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplatesSetService } from './templates.set.service';
import { IPostTemplate } from '../post-template/post.template.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication/agent-info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { PostTemplateAuthorizationService } from '../post-template/post.template.service.authorization';
import { WhiteboardTemplateAuthorizationService } from '../whiteboard-template/whiteboard.template.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { InnovationFlowTemplateService } from '../innovation-flow-template/innovation.flow.template.service';
import { InnovationFlowTemplateAuthorizationService } from '../innovation-flow-template/innovation.flow.template.service.authorization';
import { CreateWhiteboardTemplateOnTemplatesSetInput } from './dto/whiteboard.template.dto.create.on.templates.set';
import { IInnovationFlowTemplate } from '../innovation-flow-template/innovation.flow.template.interface';
import { DeleteInnovationFlowTemplateInput } from './dto/innovation.flow.template.dto.delete.on.templates.set';
import { CreateInnovationFlowTemplateOnTemplatesSetInput } from './dto/innovation.flow.template.dto.create.on.templates.set';
import { CreatePostTemplateOnTemplatesSetInput } from './dto/post.template.dto.create.on.templates.set';

@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templatesSetService: TemplatesSetService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private postTemplateAuthorizationService: PostTemplateAuthorizationService,
    private whiteboardTemplateAuthorizationService: WhiteboardTemplateAuthorizationService,
    private innovationFlowTemplateAuthorizationService: InnovationFlowTemplateAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPostTemplate, {
    description: 'Creates a new PostTemplate on the specified TemplatesSet.',
  })
  async createPostTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('postTemplateInput')
    postTemplateInput: CreatePostTemplateOnTemplatesSetInput
  ): Promise<IPostTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      postTemplateInput.templatesSetID,
      {
        relations: ['postTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create post template: ${templatesSet.id}`
    );
    const postTemplate = await this.templatesSetService.createPostTemplate(
      templatesSet,
      postTemplateInput
    );
    await this.postTemplateAuthorizationService.applyAuthorizationPolicy(
      postTemplate,
      templatesSet.authorization
    );
    return postTemplate;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardTemplate, {
    description:
      'Creates a new WhiteboardTemplate on the specified TemplatesSet.',
  })
  async createWhiteboardTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardTemplateInput')
    whiteboardTemplateInput: CreateWhiteboardTemplateOnTemplatesSetInput
  ): Promise<IWhiteboardTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      whiteboardTemplateInput.templatesSetID,
      {
        relations: ['whiteboardTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create whiteboard template: ${templatesSet.id}`
    );
    const whiteboardTemplate =
      await this.templatesSetService.createWhiteboardTemplate(
        templatesSet,
        whiteboardTemplateInput
      );
    await this.whiteboardTemplateAuthorizationService.applyAuthorizationPolicy(
      whiteboardTemplate,
      templatesSet.authorization
    );
    return whiteboardTemplate;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlowTemplate, {
    description:
      'Creates a new InnovationFlowTemplate on the specified TemplatesSet.',
  })
  async createInnovationFlowTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationFlowTemplateInput')
    innovationFlowTemplateInput: CreateInnovationFlowTemplateOnTemplatesSetInput
  ): Promise<IInnovationFlowTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      innovationFlowTemplateInput.templatesSetID,
      {
        relations: ['innovationFlowTemplates'],
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create innovationFlow template: ${templatesSet.id}`
    );
    const innovationFlowTemplate =
      await this.templatesSetService.createInnovationFlowTemplate(
        templatesSet,
        innovationFlowTemplateInput
      );
    await this.innovationFlowTemplateAuthorizationService.applyAuthorizationPolicy(
      innovationFlowTemplate,
      templatesSet.authorization
    );
    return innovationFlowTemplate;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationFlowTemplate, {
    description: 'Deletes the specified InnovationFlowTemplate.',
  })
  async deleteInnovationFlowTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteInnovationFlowTemplateInput
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplate =
      await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
        deleteData.ID,
        {
          relations: ['templatesSet'],
        }
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationFlowTemplate.authorization,
      AuthorizationPrivilege.DELETE,
      `innovationFlow template delete: ${innovationFlowTemplate.id}`
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
