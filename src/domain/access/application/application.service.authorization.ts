import { Injectable } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IApplication } from './application.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_ROLESET_APPLY } from '@common/constants/authorization/credential.rule.constants';
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

    application.authorization =
      await this.extendAuthorizationPolicy(application);

    return application.authorization;
  }

  private async extendAuthorizationPolicy(
    application: IApplication
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // get the user
    const user = await this.applicationService.getApplicant(application.id);

    // also grant the user privileges to manage their own application
    // Note: the GRANT privilege iS NOT assigned to the user; that is what is actually used to approve the application
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
        CREDENTIAL_RULE_ROLESET_APPLY
      );
    newRules.push(userApplicationRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      application.authorization,
      newRules
    );
  }
}
