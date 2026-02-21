import { POLICY_RULE_VISUAL_UPDATE } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { IVisual } from './visual.interface';

@Injectable()
export class VisualAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    visual: IVisual,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    visual.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        visual.authorization,
        parentAuthorization
      );

    visual.authorization = this.appendPrivilegeRules(visual.authorization);

    return visual.authorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE],
      AuthorizationPrivilege.CONTRIBUTE,
      POLICY_RULE_VISUAL_UPDATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
