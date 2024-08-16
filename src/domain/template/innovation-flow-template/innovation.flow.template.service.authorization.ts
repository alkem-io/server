import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class InnovationFlowTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    innovationFlowTemplate: IInnovationFlowTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    // Inherit from the parent
    innovationFlowTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        innovationFlowTemplate.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(innovationFlowTemplate.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationFlowTemplate.profile,
        innovationFlowTemplate.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }
}
