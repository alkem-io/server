import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplatesSetService } from './templates.set.service';
import { ITemplate } from '../template/template.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { WhiteboardTemplateAuthorizationService } from '../whiteboard-template/whiteboard.template.service.authorization';
import { CreateWhiteboardTemplateOnTemplatesSetInput } from './dto/whiteboard.template.dto.create.on.templates.set';
import { CreateTemplateOnTemplatesSetInput } from './dto/templates.set.dto.create.template';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { CreateCalloutTemplateOnTemplatesSetInput } from './dto/callout.template.dto.create.on.templates.set';
import { CalloutTemplateAuthorizationService } from '../callout-template/callout.template.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplateService } from '../template/template.service';
import { WhiteboardTemplateService } from '../whiteboard-template/whiteboard.template.service';
import { CalloutTemplateService } from '../callout-template/callout.template.service';

@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    private calloutTemplateAuthorizationService: CalloutTemplateAuthorizationService,
    private templateAuthorizationService: TemplateAuthorizationService,
    private whiteboardTemplateAuthorizationService: WhiteboardTemplateAuthorizationService,
    private templateService: TemplateService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    private calloutTemplateService: CalloutTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutTemplate, {
    description: 'Creates a new CalloutTemplate on the specified TemplatesSet.',
  })
  async createCalloutTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutTemplateInput')
    calloutTemplateInput: CreateCalloutTemplateOnTemplatesSetInput
  ): Promise<ICalloutTemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      calloutTemplateInput.templatesSetID,
      {
        relations: {
          calloutTemplates: true,
        },
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create callout template: ${templatesSet.id}`
    );
    const calloutTemplate =
      await this.templatesSetService.createCalloutTemplate(
        templatesSet,
        calloutTemplateInput,
        agentInfo
      );
    const authorizations =
      await this.calloutTemplateAuthorizationService.applyAuthorizationPolicy(
        calloutTemplate,
        templatesSet.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return this.calloutTemplateService.getCalloutTemplateOrFail(
      calloutTemplate.id
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITemplate, {
    description: 'Creates a new PostTemplate on the specified TemplatesSet.',
  })
  async createPostTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateInput')
    templateInput: CreateTemplateOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateInput.templatesSetID,
      {
        relations: { templates: true },
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create post template: ${templatesSet.id}`
    );
    const template = await this.templatesSetService.createPostTemplate(
      templatesSet,
      templateInput
    );
    const authorizations =
      await this.templateAuthorizationService.applyAuthorizationPolicy(
        template,
        templatesSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.templateService.getTemplateOrFail(template.id);
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
        relations: { whiteboardTemplates: true },
      }
    );
    this.authorizationService.grantAccessOrFail(
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
    const authorizations =
      await this.whiteboardTemplateAuthorizationService.applyAuthorizationPolicy(
        whiteboardTemplate,
        templatesSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.whiteboardTemplateService.getWhiteboardTemplateOrFail(
      whiteboardTemplate.id
    );
  }
}
