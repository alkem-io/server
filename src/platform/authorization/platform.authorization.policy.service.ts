import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class PlatformAuthorizationPolicyService {
  private readonly platformAuthorizationPolicy: IAuthorizationPolicy;
  private readonly rootAuthorizationPolicy: IAuthorizationPolicy;

  constructor(private authorizationPolicyService: AuthorizationPolicyService) {
    this.rootAuthorizationPolicy = this.createRootAuthorizationPolicy();
    this.platformAuthorizationPolicy = this.createPlatformAuthorizationPolicy();
  }

  public getPlatformAuthorizationPolicy(): IAuthorizationPolicy {
    return this.platformAuthorizationPolicy;
  }

  public inheritRootAuthorizationPolicy(
    childAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    return this.authorizationPolicyService.inheritParentAuthorization(
      childAuthorization,
      this.rootAuthorizationPolicy
    );
  }

  private createRootAuthorizationPolicy(): IAuthorizationPolicy {
    const rootAuthorization = new AuthorizationPolicy();

    const credentialRules = this.createRootCredentialRules();

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      rootAuthorization,
      credentialRules
    );
  }

  private createPlatformAuthorizationPolicy(): IAuthorizationPolicy {
    let platformAuthorization: IAuthorizationPolicy = new AuthorizationPolicy();
    platformAuthorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        platformAuthorization,
        this.rootAuthorizationPolicy
      );

    const credentialRules = this.createPlatformCredentialRules();

    const platformAuthCredRules =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        platformAuthorization,
        credentialRules
      );

    const privilegeRules = this.createPlatformPrivilegeRules();
    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      platformAuthCredRules,
      privilegeRules
    );
  }

  private createRootCredentialRules(): IAuthorizationPolicyRuleCredential[] {
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

    return credentialRules;
  }

  private createPlatformCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage global privileges, access Platform mgmt
    const globalAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
        [AuthorizationCredential.GLOBAL_ADMIN]
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
    const userNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ_USERS],
        [AuthorizationCredential.GLOBAL_REGISTERED]
      );
    userNotInherited.inheritable = false;
    credentialRules.push(userNotInherited);

    const createOrg =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE_ORGANIZATION,
          AuthorizationPrivilege.FILE_UPLOAD,
        ],
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

  private createPlatformPrivilegeRules(): AuthorizationPolicyRulePrivilege[] {
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
