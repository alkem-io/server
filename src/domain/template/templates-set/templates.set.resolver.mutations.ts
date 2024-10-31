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
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { CreateTemplateOnTemplatesSetInput } from './dto/templates.set.dto.create.template';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplateService } from '../template/template.service';
import { CreateTemplateFromCollaborationOnTemplatesSetInput } from './dto/templates.set.dto.create.template.from.collaboration';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';

@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    private templateAuthorizationService: TemplateAuthorizationService,
    private templateService: TemplateService,
    private collaborationService: CollaborationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ITemplate, {
    description: 'Creates a new Template on the specified TemplatesSet.',
  })
  async createTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateData')
    templateData: CreateTemplateOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create template: ${templatesSet.id}`
    );
    const template = await this.templatesSetService.createTemplate(
      templatesSet,
      templateData
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
  @Mutation(() => ITemplate, {
    description:
      'Creates a new Template on the specified TemplatesSet using the provided Collaboration as content.',
  })
  async createTemplateFromCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateData')
    templateData: CreateTemplateFromCollaborationOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templatesSet create template from Collaboration, templatesSetId: ${templatesSet.id}`
    );
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(
        templateData.collaborationID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `templatesSet create template from Collaboration, read access, collaborationId:${collaboration.id} templatesSetId:${templatesSet.id}`
    );
    const template =
      await this.templatesSetService.createTemplateFromCollaboration(
        templatesSet,
        templateData,
        collaboration
      );
    const authorizations =
      await this.templateAuthorizationService.applyAuthorizationPolicy(
        template,
        templatesSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.templateService.getTemplateOrFail(template.id);
  }
}
