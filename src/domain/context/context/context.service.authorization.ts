import { Injectable } from '@nestjs/common';
import { ContextService } from './context.service';
import { IContext } from '@domain/context/context';
import { EcosystemModelAuthorizationService } from '@domain/context/ecosystem-model/ecosystem-model.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { POLICY_RULE_READ_ABOUT } from '@common/constants/authorization/policy.rule.constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
@Injectable()
export class ContextAuthorizationService {
  constructor(
    private contextService: ContextService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosysteModelAuthorizationService: EcosystemModelAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    context: IContext,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = []
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    context.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        context.authorization,
        parentAuthorization
      );

    // If can READ_ABOUT on Context, then also allow general READ
    context.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        context.authorization,
        AuthorizationPrivilege.READ_ABOUT,
        [AuthorizationPrivilege.READ],
        POLICY_RULE_READ_ABOUT
      );
    context.authorization.credentialRules.push(...credentialRulesFromParent);
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
