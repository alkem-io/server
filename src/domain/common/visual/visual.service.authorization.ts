import { Injectable } from '@nestjs/common';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { POLICY_RULE_VISUAL_UPDATE } from '@common/constants';
import { VisualService } from './visual.service';
import { IVisual } from './visual.interface';

@Injectable()
export class VisualAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private visualService: VisualService
  ) {}

  async applyAuthorizationPolicy(
    visual: IVisual,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IVisual> {
    visual.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        visual.authorization,
        parentAuthorization
      );

    visual.authorization = this.appendPrivilegeRules(visual.authorization);

    return await this.visualService.saveVisual(visual);
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
