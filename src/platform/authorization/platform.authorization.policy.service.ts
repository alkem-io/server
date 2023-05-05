import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_GRANT_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_READ_REGISTERED,
  CREDENTIAL_RULE_TYPES_PLATFORM_CREATE_ORG_FILE_UPLOAD,
  CREDENTIAL_RULE_TYPES_PLATFORM_ANY_ADMIN,
  POLICY_RULE_PLATFORM_CREATE,
  POLICY_RULE_PLATFORM_DELETE,
} from '@common/constants';

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
          AuthorizationPrivilege.GRANT,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
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
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GRANT_GLOBAL_ADMINS
      );
    globalAdminNotInherited.cascade = false;
    credentialRules.push(globalAdminNotInherited);

    // Allow global admin Hubs to access Platform mgmt
    const platformAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS
      );
    platformAdmin.cascade = false;
    credentialRules.push(platformAdmin);

    // Allow all registered users to query non-protected user information
    const userNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ_USERS],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_PLATFORM_READ_REGISTERED
      );
    userNotInherited.cascade = false;
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
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_CREATE_ORG_FILE_UPLOAD
      );
    createOrg.cascade = false;
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
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ANY_ADMIN
      );
    admin.cascade = false;
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
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_PLATFORM_CREATE
    );
    privilegeRules.push(createPrivilege);

    const deletePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.FILE_DELETE],
      AuthorizationPrivilege.DELETE,
      POLICY_RULE_PLATFORM_DELETE
    );
    privilegeRules.push(deletePrivilege);

    return privilegeRules;
  }
}
