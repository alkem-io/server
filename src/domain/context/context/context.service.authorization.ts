import { Injectable } from '@nestjs/common';
import { ContextService } from './context.service';
import { IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '@domain/context/ecosystem-model/ecosystem-model.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    context: IContext,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    context.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        context.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(context.authorization);

    // cascade
    context.ecosystemModel =
      await this.contextService.getEcosystemModel(context);
    const ecosystemAuthorizations =
      await this.ecosysteModelAuthorizationService.applyAuthorizationPolicy(
        context.ecosystemModel,
        context.authorization
      );
    updatedAuthorizations.push(...ecosystemAuthorizations);

    return updatedAuthorizations;
  }
}
