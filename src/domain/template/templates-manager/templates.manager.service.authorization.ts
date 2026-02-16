import { LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { TemplateDefaultAuthorizationService } from '../template-default/template.default.service.authorization';
import { TemplatesSetAuthorizationService } from '../templates-set/templates.set.service.authorization';
import { ITemplatesManager } from '.';
import { TemplatesManagerService } from './templates.manager.service';

@Injectable()
export class TemplatesManagerAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesManagerService: TemplatesManagerService,
    private templateDefaultAuthorizationService: TemplateDefaultAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    templatesManagerID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const templatesManager: ITemplatesManager =
      await this.templatesManagerService.getTemplatesManagerOrFail(
        templatesManagerID,
        {
          relations: {
            authorization: true,
            templateDefaults: {
              with: { authorization: true },
            },
            templatesSet: {
              with: { authorization: true },
            },
          },
        }
      );

    if (
      !templatesManager ||
      !templatesManager.templatesSet ||
      !templatesManager.templateDefaults
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth on templates manager ${templatesManagerID}`,
        LogContext.TEMPLATES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    templatesManager.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        templatesManager.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(templatesManager.authorization);

    for (const templateDefault of templatesManager.templateDefaults) {
      const templateDefaultAuthorization =
        await this.templateDefaultAuthorizationService.applyAuthorizationPolicy(
          templateDefault,
          parentAuthorization
        );
      updatedAuthorizations.push(templateDefaultAuthorization);
    }

    const templatesSetUpdatedAuthorizations =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        templatesManager.templatesSet,
        parentAuthorization
      );
    updatedAuthorizations.push(...templatesSetUpdatedAuthorizations);

    return updatedAuthorizations;
  }
}
