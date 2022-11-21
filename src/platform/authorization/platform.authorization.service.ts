import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

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

  private createPlatformCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];
    const globalAdmins =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ]
      );
    credentialRules.push(globalAdmins);

    // Allow global admins to manage global privileges, access Platform mgmt
    const globalAdminNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
      AuthorizationCredential.GLOBAL_ADMIN
    );
    globalAdminNotInherited.inheritable = false;
    credentialRules.push(globalAdminNotInherited);

    // Allow global admin Hubs to access Platform mgmt
    const platformAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
        ]
      );
    platformAdmin.inheritable = false;
    credentialRules.push(platformAdmin);

    // Allow all registered users to query non-protected user information
    const userNotInherited = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ_USERS],
      AuthorizationCredential.GLOBAL_REGISTERED
    );
    userNotInherited.inheritable = false;
    credentialRules.push(userNotInherited);

    const createOrg =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_ORGANIZATION],
        [
          AuthorizationCredential.HUB_ADMIN,
          AuthorizationCredential.CHALLENGE_ADMIN,
        ]
      );
    createOrg.inheritable = false;
    credentialRules.push(createOrg);

    const admin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
          AuthorizationCredential.HUB_ADMIN,
          AuthorizationCredential.CHALLENGE_ADMIN,
          AuthorizationCredential.OPPORTUNITY_ADMIN,
          AuthorizationCredential.ORGANIZATION_ADMIN,
        ]
      );
    admin.inheritable = false;
    credentialRules.push(admin);

    return credentialRules;
  }

  private createPrivilegeRules(): AuthorizationPolicyRulePrivilege[] {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [
        AuthorizationPrivilege.CREATE_HUB,
        AuthorizationPrivilege.CREATE_ORGANIZATION,
        AuthorizationPrivilege.FILE_UPLOAD,
      ],
      AuthorizationPrivilege.CREATE
    );
    privilegeRules.push(createPrivilege);

    const deletePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.FILE_DELETE],
      AuthorizationPrivilege.DELETE
    );
    privilegeRules.push(deletePrivilege);

    return privilegeRules;
  }
}
