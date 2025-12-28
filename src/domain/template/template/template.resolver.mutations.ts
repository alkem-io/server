import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TemplateService } from './template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplate } from './template.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ActorContext } from '@core/actor-context';
import { UpdateTemplateInput } from './dto/template.dto.update';
import { DeleteTemplateInput } from './dto/template.dto.delete';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions/validation.exception';
import { UpdateTemplateFromSpaceInput } from './dto/template.dto.update.from.space';
import { TemplateAuthorizationService } from './template.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';

@InstrumentResolver()
@Resolver()
export class TemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceLookupService: SpaceLookupService,
    private templateAuthorizationService: TemplateAuthorizationService,
    private templateService: TemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ITemplate, {
    description: 'Updates the specified Template.',
  })
  async updateTemplate(
    @CurrentUser() actorContext: ActorContext,
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
      actorContext,
      template.authorization,
      AuthorizationPrivilege.UPDATE,
      `update template: ${template.id}`
    );
    return await this.templateService.updateTemplate(template, updateData);
  }

  @Mutation(() => ITemplate, {
    description:
      'Updates the specified Space Content Template using the provided Space.',
  })
  async updateTemplateFromSpace(
    @CurrentUser() actorContext: ActorContext,
    @Args('updateData')
    updateData: UpdateTemplateFromSpaceInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      updateData.templateID,
      {
        relations: {
          templatesSet: true,
          contentSpace: {
            about: {
              profile: true,
            },
            collaboration: {
              innovationFlow: {
                states: true,
              },
              calloutsSet: {
                callouts: true,
                tagsetTemplateSet: true,
              },
            },
            subspaces: {
              collaboration: {
                innovationFlow: true,
                calloutsSet: {
                  callouts: true,
                  tagsetTemplateSet: true,
                },
              },
              subspaces: {
                collaboration: {
                  innovationFlow: true,
                  calloutsSet: {
                    callouts: true,
                    tagsetTemplateSet: true,
                  },
                },
              },
            },
          },
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.UPDATE,
      `update template: ${template.id}`
    );

    const space = await this.spaceLookupService.getSpaceOrFail(
      updateData.spaceID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.READ,
      `read source Space for template: ${space.id}`
    );
    const templateUpdated = await this.templateService.updateTemplateFromSpace(
      template,
      updateData,
      actorContext
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
    @CurrentUser() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      deleteData.ID,
      {
        relations: { profile: true },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
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
