import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { ITemplateDefault } from './template.default.interface';

@Injectable()
export class TemplateDefaultAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    templateDefault: ITemplateDefault,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    templateDefault.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        templateDefault.authorization,
        parentAuthorization
      );

    return templateDefault.authorization;
  }
}
