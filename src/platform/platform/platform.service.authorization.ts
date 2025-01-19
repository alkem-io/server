import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformService } from './platform.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_PLATFORM_CREATE_ORGANIZATION,
  CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE,
  CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_AUTH_RESET,
  CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER,
  CREDENTIAL_RULE_TYPES_PLATFORM_GRANT_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_MGMT,
  CREDENTIAL_RULE_TYPES_PLATFORM_READ_REGISTERED,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { ForumAuthorizationService } from '@platform/forum/forum.service.authorization';
import { LibraryAuthorizationService } from '@library/library/library.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { LicensingFrameworkAuthorizationService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetType } from '@common/enums/role.set.type';

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private forumAuthorizationService: ForumAuthorizationService,
    private platformService: PlatformService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private libraryAuthorizationService: LibraryAuthorizationService,
    private licensingFrameworkAuthorizationService: LicensingFrameworkAuthorizationService,
    private templatesManagerAuthorizationService: TemplatesManagerAuthorizationService,
    private roleSetAuthorizationService: RoleSetAuthorizationService
  ) {}

  async applyAuthorizationPolicy(): Promise<IAuthorizationPolicy[]> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: {
        authorization: true,
        forum: true,
        library: true,
        storageAggregator: true,
        licensingFramework: true,
        templatesManager: true,
        roleSet: true,
      },
    });

    if (
      !platform.authorization ||
      !platform.library ||
      !platform.forum ||
      !platform.storageAggregator ||
      !platform.licensingFramework ||
      !platform.templatesManager ||
      !platform.roleSet
    )
      throw new RelationshipNotFoundException(
        `Unable to load entities for platform: ${platform.id} `,
        LogContext.PLATFORM
      );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    platform.authorization = await this.authorizationPolicyService.reset(
      platform.authorization
    );
    platform.authorization =
      this.platformAuthorizationPolicyService.inheritRootAuthorizationPolicy(
        platform.authorization
      );
    platform.authorization = await this.appendCredentialRules(
      platform.authorization
    );
    updatedAuthorizations.push(platform.authorization);

    const libraryUpdatedAuthorization =
      await this.libraryAuthorizationService.applyAuthorizationPolicy(
        platform.library,
        platform.authorization
      );
    updatedAuthorizations.push(libraryUpdatedAuthorization);

    const templatesManagerAuthorizations =
      await this.templatesManagerAuthorizationService.applyAuthorizationPolicy(
        platform.templatesManager.id,
        platform.authorization
      );
    updatedAuthorizations.push(...templatesManagerAuthorizations);

    const additionalRoleSetCredentialRules =
      await this.createAdditionalRoleSetCredentialRules(platform.roleSet);
    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        platform.roleSet.id,
        platform.authorization,
        additionalRoleSetCredentialRules
      );
    updatedAuthorizations.push(...roleSetAuthorizations);

    const copyPlatformAuthorization: IAuthorizationPolicy =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        platform.authorization
      );

    // Extend the platform authorization policy for communication only
    const extendedAuthPolicy = await this.appendCredentialRulesCommunication(
      copyPlatformAuthorization
    );
    const forumUpdatedAuthorizations =
      await this.forumAuthorizationService.applyAuthorizationPolicy(
        platform.forum,
        extendedAuthPolicy
      );
    updatedAuthorizations.push(...forumUpdatedAuthorizations);

    let platformStorageAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        platform.authorization
      );
    platformStorageAuth =
      this.extendStorageAuthorizationPolicy(platformStorageAuth);
    platformStorageAuth =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        platformStorageAuth,
        AuthorizationPrivilege.READ
      );

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        platform.storageAggregator,
        platformStorageAuth
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const platformLicensingAuthorizations =
      await this.licensingFrameworkAuthorizationService.applyAuthorizationPolicy(
        platform.licensingFramework,
        platform.authorization
      );
    updatedAuthorizations.push(...platformLicensingAuthorizations);

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    const credentialRules = this.createPlatformCredentialRules();
    const credentialRuleInteractiveGuidance =
      await this.createCredentialRuleInteractiveGuidance();
    credentialRules.push(credentialRuleInteractiveGuidance);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      credentialRules
    );
  }

  private async appendCredentialRulesCommunication(
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for Platform Communication',
        LogContext.PLATFORM
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const communicationRules =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ, AuthorizationPrivilege.CONTRIBUTE],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        'platformReadContributeRegistered'
      );
    newRules.push(communicationRules);

    // Set globally visible to replicate what already
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        authorization,
        AuthorizationPrivilege.READ
      );

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }

  private extendStorageAuthorizationPolicy(
    storageAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!storageAuthorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for Platform Communication',
        LogContext.PLATFORM
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Any member can upload
    const registeredUserUpload =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.FILE_UPLOAD, AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER
      );
    // Cascade so the priviliege is picked up on the dirct storage bucket
    registeredUserUpload.cascade = true;
    newRules.push(registeredUserUpload);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      storageAuthorization,
      newRules
    );

    return storageAuthorization;
  }

  private async createCredentialRuleInteractiveGuidance(): Promise<IAuthorizationPolicyRuleCredential> {
    const userChatGuidanceAccessCredential = {
      type: AuthorizationCredential.GLOBAL_REGISTERED,
      resourceID: '',
    };

    const userChatGuidanceAccessPrivilegeRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE],
        [userChatGuidanceAccessCredential],
        CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE
      );
    userChatGuidanceAccessPrivilegeRule.cascade = false;

    return userChatGuidanceAccessPrivilegeRule;
  }

  private createPlatformCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global supportto access Platform mgmt
    const platformAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS
      );
    platformAdmin.cascade = false;
    credentialRules.push(platformAdmin);

    const globalSupportPlatformAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_SUPPORT],
        CREDENTIAL_RULE_TYPES_PLATFORM_MGMT
      );
    globalSupportPlatformAdmin.cascade = true;
    credentialRules.push(globalSupportPlatformAdmin);

    // Allow global support to reset auth
    const platformResetAuth =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_AUTH_RESET
      );
    platformResetAuth.cascade = false;
    credentialRules.push(platformResetAuth);

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
        [AuthorizationPrivilege.CREATE_ORGANIZATION],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.SPACE_ADMIN,
        ],
        CREDENTIAL_RULE_PLATFORM_CREATE_ORGANIZATION
      );
    createOrg.cascade = false;
    credentialRules.push(createOrg);

    return credentialRules;
  }

  private async createAdditionalRoleSetCredentialRules(
    roleSet: IRoleSet
  ): Promise<IAuthorizationPolicyRuleCredential[]> {
    if (roleSet.type !== RoleSetType.PLATFORM) {
      throw new RelationshipNotFoundException(
        `RoleSet of wrong type passed: ${roleSet.id}`,
        LogContext.ROLES
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage global privileges, access Platform mgmt
    const globalAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GRANT_GLOBAL_ADMINS
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS
      );
    globalAdmin.cascade = false;
    newRules.push(globalAdmin);

    return newRules;
  }
}
