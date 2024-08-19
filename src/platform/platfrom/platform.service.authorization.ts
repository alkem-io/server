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
  CREDENTIAL_RULE_PLATFORM_CREATE_SPACE,
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
import { LicensingAuthorizationService } from '@platform/licensing/licensing.service.authorization';
import { ForumAuthorizationService } from '@platform/forum/forum.service.authorization';
import { PlatformInvitationAuthorizationService } from '@platform/invitation/platform.invitation.service.authorization';
import { LibraryAuthorizationService } from '@library/library/library.service.authorization';

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private forumAuthorizationService: ForumAuthorizationService,
    private platformService: PlatformService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private libraryAuthorizationService: LibraryAuthorizationService,
    private licensingAuthorizationService: LicensingAuthorizationService
  ) {}

  async applyAuthorizationPolicy(): Promise<IAuthorizationPolicy[]> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: {
        authorization: true,
        platformInvitations: true,
        forum: true,
        library: true,
        storageAggregator: true,
        licensing: true,
      },
    });

    if (
      !platform.authorization ||
      !platform.platformInvitations ||
      !platform.library ||
      !platform.forum ||
      !platform.storageAggregator ||
      !platform.licensing
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

    for (const platformInvitation of platform.platformInvitations) {
      const updatedInvitation =
        await this.platformInvitationAuthorizationService.applyAuthorizationPolicy(
          platformInvitation,
          platform.authorization
        );
      updatedAuthorizations.push(updatedInvitation);
    }

    const copyPlatformAuthorization: IAuthorizationPolicy =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        platform.authorization
      );

    // Extend the platform authoization policy for communication only
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
    platformStorageAuth.anonymousReadAccess = true;

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        platform.storageAggregator,
        platformStorageAuth
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const platformLicensingAuthorizations =
      await this.licensingAuthorizationService.applyAuthorizationPolicy(
        platform.licensing,
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
    authorization.anonymousReadAccess = true;

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
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
    const userGuidanceChatAccessCredential = {
      type: AuthorizationCredential.GLOBAL_REGISTERED,
      resourceID: '',
    };

    const userGuidanceChatAccessPrivilegeRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE],
        [userGuidanceChatAccessCredential],
        CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE
      );
    userGuidanceChatAccessPrivilegeRule.cascade = false;

    return userGuidanceChatAccessPrivilegeRule;
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

    const createSpace =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_SPACE],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.BETA_TESTER,
          AuthorizationCredential.VC_CAMPAIGN,
        ],
        CREDENTIAL_RULE_PLATFORM_CREATE_SPACE
      );
    createSpace.cascade = false;
    credentialRules.push(createSpace);

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
}
