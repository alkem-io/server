import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplate } from '../template/template.interface';
import { TemplateService } from '../template/template.service';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { CreateTemplateOnTemplatesSetInput } from './dto/templates.set.dto.create.template';
import { CreateTemplateFromSpaceOnTemplatesSetInput } from './dto/templates.set.dto.create.template.from.space';
import { CreateTemplateFromContentSpaceOnTemplatesSetInput } from './dto/templates.set.dto.create.template.from.space.content';
import { TemplatesSetService } from './templates.set.service';

@InstrumentResolver()
@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    private templateAuthorizationService: TemplateAuthorizationService,
    private templateService: TemplateService,
    private spaceLookupService: SpaceLookupService,
    private templateContentSpaceService: TemplateContentSpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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

  @Mutation(() => ITemplate, {
    description:
      'Creates a new Template on the specified TemplatesSet using the provided Space as content.',
  })
  async createTemplateFromSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateData')
    templateData: CreateTemplateFromSpaceOnTemplatesSetInput
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

    const space = await this.spaceLookupService.getSpaceOrFail(
      templateData.spaceID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ,
      `templatesSet create template from Space, read access, collaborationId:${space.id} templatesSetId:${templatesSet.id}`
    );
    const template = await this.templatesSetService.createTemplateFromSpace(
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

  @Mutation(() => ITemplate, {
    description:
      'Creates a new Template on the specified TemplatesSet using the provided ContentSpace as content.',
  })
  async createTemplateFromContentSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templateData')
    templateData: CreateTemplateFromContentSpaceOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templatesSet create template from ContentSpace, templatesSetId: ${templatesSet.id}`
    );

    const contentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateData.contentSpaceID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contentSpace.authorization,
      AuthorizationPrivilege.READ,
      `templatesSet create template from ContentSpace, read access, contentSpaceId:${contentSpace.id} templatesSetId:${templatesSet.id}`
    );

    const template =
      await this.templatesSetService.createTemplateFromContentSpace(
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
}
