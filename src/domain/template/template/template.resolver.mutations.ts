import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TemplateService } from './template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplate } from './template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UpdateTemplateInput } from './dto/template.dto.update';
import { DeleteTemplateInput } from './dto/template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions/validation.exception';
import { UpdateTemplateFromCollaborationInput } from './dto/template.dto.update.from.collaboration';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { TemplateAuthorizationService } from './template.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class TemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private collaborationService: CollaborationService,
    private templateAuthorizationService: TemplateAuthorizationService,
    private templateService: TemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ITemplate, {
    description: 'Updates the specified Template.',
  })
  async updateTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      updateData.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      template.authorization,
      AuthorizationPrivilege.UPDATE,
      `update template: ${template.id}`
    );
    return await this.templateService.updateTemplate(template, updateData);
  }

  @Mutation(() => ITemplate, {
    description:
      'Updates the specified Collaboration Template using the provided Collaboration.',
  })
  async updateTemplateFromCollaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData')
    updateData: UpdateTemplateFromCollaborationInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      updateData.templateID,
      {
        relations: {
          templatesSet: true,
          collaboration: {
            innovationFlow: true,
            calloutsSet: {
              callouts: true,
              tagsetTemplateSet: true,
            },
          },
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      template.authorization,
      AuthorizationPrivilege.UPDATE,
      `update template: ${template.id}`
    );

    const sourceCollaboration =
      await this.collaborationService.getCollaborationOrFail(
        updateData.collaborationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      sourceCollaboration.authorization,
      AuthorizationPrivilege.READ,
      `read source collaboration for template: ${sourceCollaboration.id}`
    );
    const templateUpdated =
      await this.templateService.updateTemplateFromCollaboration(
        template,
        updateData,
        agentInfo.userID
      );

    const authorizations =
      await this.templateAuthorizationService.applyAuthorizationPolicy(
        templateUpdated,
        template.templatesSet?.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.templateService.getTemplateOrFail(template.id);
  }

  @Mutation(() => ITemplate, {
    description: 'Deletes the specified Template.',
  })
  async deleteTemplate(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      deleteData.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      template.authorization,
      AuthorizationPrivilege.DELETE,
      `template delete: ${template.id}`
    );
    const usedInTemplateDefault =
      await this.templateService.isTemplateInUseInTemplateDefault(template.id);
    if (usedInTemplateDefault) {
      throw new ValidationException(
        `Template is in use in TemplateDefault: ${template.id}`,
        LogContext.TEMPLATES
      );
    }

    return await this.templateService.delete(template);
  }
}
