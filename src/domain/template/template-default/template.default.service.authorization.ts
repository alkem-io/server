import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ITemplateDefault } from './template.default.interface';

@Injectable()
export class TemplateDefaultAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    templateDefault: ITemplateDefault,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    templateDefault.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        templateDefault.authorization,
        parentAuthorization
      );

    return templateDefault.authorization;
  }
}
