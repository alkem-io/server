import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ITemplateBase } from './template.base.interface';
import { TemplateBase } from './template.base.entity';

@Injectable()
export class TemplateBaseAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    templateBase: ITemplateBase,
    repository: Repository<TemplateBase>,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplateBase> {
    if (templateBase.visual) {
      templateBase.visual.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          templateBase.visual.authorization,
          parentAuthorization
        );
    }

    if (templateBase.tagset) {
      templateBase.tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          templateBase.tagset.authorization,
          parentAuthorization
        );
    }

    return await repository.save(templateBase);
  }
}
