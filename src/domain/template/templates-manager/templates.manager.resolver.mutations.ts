import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ActorContext } from '@core/actor-context';
import { UpdateTemplateDefaultTemplateInput } from '../template-default/dto/template.default.dto.update';
import { ITemplateDefault } from '../template-default/template.default.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateDefaultService } from '../template-default/template.default.service';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { TemplateService } from '../template/template.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class TemplatesManagerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private templatesDefaultService: TemplateDefaultService,
    private templateService: TemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ITemplateDefault, {
    description: 'Updates the specified Template Defaults.',
  })
  async updateTemplateDefault(
    @CurrentUser() actorContext: ActorContext,
    @Args('templateDefaultData')
    templateDefaultData: UpdateTemplateDefaultTemplateInput
  ): Promise<ITemplateDefault> {
    const templateDefault =
      await this.templatesDefaultService.getTemplateDefaultOrFail(
        templateDefaultData.templateDefaultID,
        {
          relations: {
            templatesManager: {
              templatesSet: {
                templates: true,
              },
            },
          },
        }
      );

    const templatesManager = templateDefault.templatesManager;
    if (
      !templatesManager ||
      !templatesManager.templatesSet ||
      !templatesManager.templatesSet.templates
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities on TemplatesManager for templateDefault: ${templateDefault.id}`,
        LogContext.TEMPLATES
      );
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      templateDefault.authorization,
      AuthorizationPrivilege.UPDATE,
      `update templateDefault of type ${templateDefault.type}: ${templateDefault.id}`
    );

    // Check the provided ID is a template
    await this.templateService.getTemplateOrFail(
      templateDefaultData.templateID
    );

    const templatesSet = templatesManager.templatesSet.templates;
    const template = templatesSet.find(
      t => t.id === templateDefaultData.templateID
    );
    if (!template) {
      throw new ValidationException(
        `Updating TemplateDefault (${templateDefault.id}) with templateID (${templateDefaultData.templateID}) that is not in set of Templates in associated TemplateSet`,
        LogContext.TEMPLATES
      );
    }

    return this.templatesDefaultService.updateTemplateDefaultTemplate(
      templateDefault,
      templateDefaultData
    );
  }
}
