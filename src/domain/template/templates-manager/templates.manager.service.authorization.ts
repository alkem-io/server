import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
            templateDefaults: {
              authorization: true,
            },
            templatesSet: {
              authorization: true,
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
      // Per-templateDefault containment: a single malformed templateDefault must
      // not abort authorization for its healthy siblings or the templatesSet.
      // Data-integrity anomalies are logged and skipped; other exceptions
      // propagate.
      try {
        const templateDefaultAuthorization =
          await this.templateDefaultAuthorizationService.applyAuthorizationPolicy(
            templateDefault,
            parentAuthorization
          );
        updatedAuthorizations.push(templateDefaultAuthorization);
      } catch (err: unknown) {
        if (
          err instanceof RelationshipNotFoundException ||
          err instanceof EntityNotFoundException
        ) {
          this.logger.error(
            {
              message: 'Auth-reset skipped templateDefault due to data anomaly',
              templateDefaultId: templateDefault.id,
              templatesManagerId: templatesManager.id,
              error: (err as Error).message,
            },
            (err as Error).stack,
            LogContext.TEMPLATES
          );
          continue;
        }
        throw err;
      }
    }

    // Per-templatesSet containment: a data anomaly inside the templatesSet
    // cascade must not deny the manager + its healthy templateDefaults their
    // re-inherited authorization. Anomalies are logged and skipped; other
    // exceptions propagate.
    try {
      const templatesSetUpdatedAuthorizations =
        await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
          templatesManager.templatesSet,
          parentAuthorization
        );
      updatedAuthorizations.push(...templatesSetUpdatedAuthorizations);
    } catch (err: unknown) {
      if (
        err instanceof RelationshipNotFoundException ||
        err instanceof EntityNotFoundException
      ) {
        this.logger.error(
          {
            message: 'Auth-reset skipped templatesSet due to data anomaly',
            templatesSetId: templatesManager.templatesSet.id,
            templatesManagerId: templatesManager.id,
            error: (err as Error).message,
          },
          (err as Error).stack,
          LogContext.TEMPLATES
        );
      } else {
        throw err;
      }
    }

    return updatedAuthorizations;
  }
}
