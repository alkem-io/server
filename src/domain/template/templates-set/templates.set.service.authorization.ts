import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { ITemplatesSet } from '.';
import { TemplatesSetService } from './templates.set.service';

@Injectable()
export class TemplatesSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    private templateAuthorizationService: TemplateAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    templatesSetInput: ITemplatesSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templatesSetInput.id,
      {
        relations: {
          templates: true,
        },
      }
    );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    templatesSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        templatesSet.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(templatesSet.authorization);

    if (templatesSet.templates) {
      for (const template of templatesSet.templates) {
        // Per-template containment: a single malformed template (e.g. a
        // type='whiteboard' template with whiteboardId=NULL, or an unknown
        // template.type) must not abort authorization for its healthy siblings.
        // Data-integrity anomalies (RelationshipNotFoundException,
        // EntityNotFoundException) are logged at error level with structured
        // context and skipped; every other exception propagates so genuine
        // failures aren't silently masked. See auth-reset regression where a
        // single orphan template denied a whole Account's templates.
        try {
          const templateAuthorizations =
            await this.templateAuthorizationService.applyAuthorizationPolicy(
              template,
              // Ensure templates inherit from the TemplatesSet authorization, not the original parent.
              // Previously this passed parentAuthorization directly which caused templates to miss
              // the credential rules applied to the TemplatesSet, resulting in missing READ access
              // (e.g. for Callout Template contributionDefaults - issue #8804).
              templatesSet.authorization
            );
          updatedAuthorizations.push(...templateAuthorizations);
        } catch (err: unknown) {
          if (
            err instanceof RelationshipNotFoundException ||
            err instanceof EntityNotFoundException
          ) {
            this.logger.error(
              {
                message: 'Auth-reset skipped template due to data anomaly',
                templateId: template.id,
                templatesSetId: templatesSet.id,
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
    }

    return updatedAuthorizations;
  }
}
