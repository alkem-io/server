import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

@Injectable()
export class PlatformAuthorizationService {
  private readonly platformAuthorizationPolicy: IAuthorizationPolicy;

  constructor(private authorizationPolicyService: AuthorizationPolicyService) {
    this.platformAuthorizationPolicy = this.createPlatformAuthorizationPolicy();
  }

  public getPlatformAuthorizationPolicy(): IAuthorizationPolicy {
    return this.platformAuthorizationPolicy;
  }

  public inheritPlatformAuthorization(
    childAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    return this.authorizationPolicyService.inheritParentAuthorization(
      childAuthorization,
      this.platformAuthorizationPolicy
    );
  }

  private createPlatformAuthorizationPolicy(): IAuthorizationPolicy {
    const platformAuthorization = new AuthorizationPolicy();

    const credentialRules = this.createPlatformCredentialRules();

    const platformAuthCredRules =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        platformAuthorization,
        credentialRules
      );

    const privilegeRules = this.createPrivilegeRules();
    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      platformAuthCredRules,
      privilegeRules
    );
  }

  private createPlatformCredentialRules(): AuthorizationPolicyRuleCredential[] {
    const credentialRules: AuthorizationPolicyRuleCredential[] = [];

    const globalAdmins = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.MOVE_CARD,
      ],
      AuthorizationCredential.GLOBAL_ADMIN
    );
    globalAdmins.appendCriteria(AuthorizationCredential.GLOBAL_ADMIN_HUBS);
    credentialRules.push(globalAdmins);

    // Allow global admins to manage global privileges, access Platform mgmt
    const globalAdminNotInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        AuthorizationPrivilege.ADMIN,
      ],
      AuthorizationCredential.GLOBAL_ADMIN
    );
    globalAdminNotInherited.inheritable = false;
    credentialRules.push(globalAdminNotInherited);

    // Allow global admin Hubs to access Platform mgmt
    const globalAdminHubsNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.PLATFORM_ADMIN, AuthorizationPrivilege.ADMIN],
      AuthorizationCredential.GLOBAL_ADMIN_HUBS
    );
    globalAdminHubsNotInherited.inheritable = false;
    credentialRules.push(globalAdminHubsNotInherited);

    // Allow global admin Communities to access Platform mgmt
    const globalAdminCommunitiesNotInherited =
      new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.PLATFORM_ADMIN, AuthorizationPrivilege.ADMIN],
        AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
      );
    globalAdminCommunitiesNotInherited.inheritable = false;
    credentialRules.push(globalAdminCommunitiesNotInherited);

    // Allow all registered users to query non-protected user information
    const userNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ_USERS],
      AuthorizationCredential.GLOBAL_REGISTERED
    );
    userNotInherited.inheritable = false;
    credentialRules.push(userNotInherited);

    // Allow hub admins to create new organizations + move card
    const hubAdminsNotInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE_ORGANIZATION,
        AuthorizationPrivilege.MOVE_CARD,
        AuthorizationPrivilege.ADMIN,
      ],
      AuthorizationCredential.HUB_ADMIN
    );
    hubAdminsNotInherited.inheritable = false;
    credentialRules.push(hubAdminsNotInherited);

    // Allow challenge admins to create new organizations + move card + access platform admin
    const challengeAdminsNotInherited = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE_ORGANIZATION,
        AuthorizationPrivilege.MOVE_CARD,
        AuthorizationPrivilege.ADMIN,
      ],
      AuthorizationCredential.CHALLENGE_ADMIN
    );
    challengeAdminsNotInherited.inheritable = false;
    credentialRules.push(challengeAdminsNotInherited);

    // Allow Opportunity admins to access admin
    const opportunityAdminNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.ADMIN],
      AuthorizationCredential.OPPORTUNITY_ADMIN
    );
    opportunityAdminNotInherited.inheritable = false;
    credentialRules.push(opportunityAdminNotInherited);

    // Allow Organization admins to access platform admin
    const organizationAdminsNotInherited =
      new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.ADMIN],
        AuthorizationCredential.ORGANIZATION_ADMIN
      );
    organizationAdminsNotInherited.inheritable = false;
    credentialRules.push(organizationAdminsNotInherited);

    return credentialRules;
  }

  private createPrivilegeRules(): AuthorizationPolicyRulePrivilege[] {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_HUB,
        AuthorizationPrivilege.CREATE_ORGANIZATION,
      ],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    return privilegeRules;
  }
}
