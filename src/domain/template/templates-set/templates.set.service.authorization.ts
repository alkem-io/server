import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSetService } from './templates.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ITemplatesSet } from '.';
import { TemplateAuthorizationService } from '../template/template.service.authorization';

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
            parentAuthorization
          );
        updatedAuthorizations.push(...templateAuthorizations);
      }
    }

    return updatedAuthorizations;
  }
}
