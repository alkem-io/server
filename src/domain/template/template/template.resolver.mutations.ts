import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DeleteTemplateInput } from './dto/template.dto.delete';
import { UpdateTemplateInput } from './dto/template.dto.update';
import { UpdateTemplateFromSpaceInput } from './dto/template.dto.update.from.space';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';
import { TemplateAuthorizationService } from './template.service.authorization';

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
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData')
    updateData: UpdateTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      updateData.ID,
      {
        relations: { profile: true },
      }
    );
    // 027-platform-role-redesign (T042, A7, research D5): dual-path — full
    // template CRUD inside an org-owned innovation pack/hub is part of A7,
    // gated via PLATFORM_SUPPORT_ORG_RESOURCES (cascaded from the account,
    // account.service.authorization.ts T037) alongside ordinary owner UPDATE.
    // Harmless no-op for space-owned templates, whose authorization tree
    // never carries this privilege.
    const canUpdateAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.UPDATE
    );
    const canUpdateAsPlatformSupport =
      this.authorizationService.isAccessGranted(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
    if (!canUpdateAsOwner && !canUpdateAsPlatformSupport) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.UPDATE,
        `update template: ${template.id}`
      );
    }
    return await this.templateService.updateTemplate(template, updateData);
  }

  @Mutation(() => ITemplate, {
    description:
      'Updates the specified Space Content Template using the provided Space.',
  })
  async updateTemplateFromSpace(
    @CurrentActor() actorContext: ActorContext,
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
    // 027-platform-role-redesign (T042, A7): dual-path — see the identical
    // comment on updateTemplate above.
    const canUpdateAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.UPDATE
    );
    const canUpdateAsPlatformSupport =
      this.authorizationService.isAccessGranted(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
    if (!canUpdateAsOwner && !canUpdateAsPlatformSupport) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.UPDATE,
        `update template: ${template.id}`
      );
    }

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
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteTemplateInput
  ): Promise<ITemplate> {
    const template = await this.templateService.getTemplateOrFail(
      deleteData.ID,
      {
        relations: { profile: true },
      }
    );
    // 027-platform-role-redesign (T042, A7): template delete is part of the
    // "full template CRUD" A7 grants platform-support inside an org-owned
    // pack/hub — distinct from A8's pack/hub deletion, which stays
    // gated on PLATFORM_CONTENT_FULL_ACCESS (innovation.pack/hub.resolver.
    // mutations.ts, T043). Dual-path — see updateTemplate above.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsPlatformSupport =
      this.authorizationService.isAccessGranted(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
    if (!canDeleteAsOwner && !canDeleteAsPlatformSupport) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.DELETE,
        `template delete: ${template.id}`
      );
    }
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
