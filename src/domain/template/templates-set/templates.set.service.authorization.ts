import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { ITemplatesSet } from '.';
import { TemplatesSetService } from './templates.set.service';

@Injectable()
export class TemplatesSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    private templateAuthorizationService: TemplateAuthorizationService
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
      }
    }

    return updatedAuthorizations;
  }
}
