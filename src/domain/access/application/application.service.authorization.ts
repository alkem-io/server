import { Injectable } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IApplication } from './application.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_COMMUNITY_USER_APPLICATION } from '@common/constants/authorization/credential.rule.constants';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { POLICY_RULE_COMMUNITY_APPROVE_APPLICATION } from '@common/constants';

@Injectable()
export class ApplicationAuthorizationService {
  constructor(
    private applicationService: ApplicationService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    application: IApplication,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    application.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        application.authorization,
        parentAuthorization
      );

    application.authorization = this.appendPrivilegeRules(
      application.authorization
    );

    application.authorization =
      await this.extendAuthorizationPolicy(application);

    return application.authorization;
  }

  private async extendAuthorizationPolicy(
    application: IApplication
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // get the user
    const user = await this.applicationService.getContributor(application.id);

    // also grant the user privileges to manage their own application
    const userApplicationRule =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: user.id,
          },
        ],
        CREDENTIAL_RULE_COMMUNITY_USER_APPLICATION
      );
    newRules.push(userApplicationRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      application.authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const approveApplicationPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_APPLY_ACCEPT],
      AuthorizationPrivilege.GRANT,
      POLICY_RULE_COMMUNITY_APPROVE_APPLICATION
    );

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [approveApplicationPrivilege]
    );
  }
}
