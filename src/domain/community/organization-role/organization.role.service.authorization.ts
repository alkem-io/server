import { Injectable } from '@nestjs/common';
import { AuthorizationCredential } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IOrganization } from '@domain/community/organization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL } from '@common/constants';

@Injectable()
export class OrganizationRoleAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  public extendAuthorizationPolicyForSelfRemoval(
    organization: IOrganization,
    userToBeRemovedID: string
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userToBeRemovedID,
          },
        ],
        CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedOrganizationAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        organization.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedOrganizationAuthorization,
        newRules
      );

    return updatedAuthorization;
  }
}
