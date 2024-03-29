import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IPlatform } from './platform.interface';
import { Platform } from './platform.entity';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { LibraryAuthorizationService } from '@library/library/library.service.authorization';
import { PlatformService } from './platform.service';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { InnovationHubService } from '@domain/innovation-hub';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import {
  CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_DASHBOARD,
  CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE,
  CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_ANY_ADMIN,
  CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER,
  CREDENTIAL_RULE_TYPES_PLATFORM_GRANT_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_READ_REGISTERED,
  POLICY_RULE_PLATFORM_CREATE,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private libraryAuthorizationService: LibraryAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private platformService: PlatformService,
    private innovationHubService: InnovationHubService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private organizationService: OrganizationService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {}

  async applyAuthorizationPolicy(): Promise<IPlatform> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: {
        authorization: true,
        library: {
          innovationPacks: true,
        },
        communication: true,
      },
    });

    if (!platform.authorization)
      throw new RelationshipNotFoundException(
        `Unable to load entities for platform: ${platform.id} `,
        LogContext.PLATFORM
      );

    platform.authorization = await this.authorizationPolicyService.reset(
      platform.authorization
    );
    platform.authorization =
      this.platformAuthorizationPolicyService.inheritRootAuthorizationPolicy(
        platform.authorization
      );
    platform.authorization.anonymousReadAccess = true;
    platform.authorization = await this.appendCredentialRules(
      platform.authorization
    );

    const privilegeRules = this.createPlatformPrivilegeRules();
    platform.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
        platform.authorization,
        privilegeRules
      );

    // Cascade down
    const platformPropagated = await this.propagateAuthorizationToChildEntities(
      platform.authorization
    );

    return await this.platformRepository.save(platformPropagated);
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    const credentialRules = this.createPlatformCredentialRules();
    const credentialRuleInteractiveGuidance =
      await this.createCredentialRuleInteractiveGuidance();
    credentialRules.push(credentialRuleInteractiveGuidance);
    const credentialRuleDashbaord =
      await this.createCredentialRuleDashboardRefresh();
    credentialRules.push(credentialRuleDashbaord);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      credentialRules
    );
  }

  private async propagateAuthorizationToChildEntities(
    authorization: IAuthorizationPolicy
  ): Promise<IPlatform> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: {
        library: {
          innovationPacks: true,
        },
        communication: true,
        storageAggregator: true,
      },
    });

    if (
      !platform.library ||
      !platform.communication ||
      !platform.storageAggregator
    )
      throw new RelationshipNotFoundException(
        `Unable to load entities for platform: ${platform.id} `,
        LogContext.PLATFORM
      );

    platform.authorization = authorization;
    await this.libraryAuthorizationService.applyAuthorizationPolicy(
      platform.library,
      platform.authorization
    );

    const copyPlatformAuthorization: IAuthorizationPolicy =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        platform.authorization
      );

    // Extend the platform authoization policy for communication only
    const extendedAuthPolicy = await this.appendCredentialRulesCommunication(
      copyPlatformAuthorization
    );
    await this.communicationAuthorizationService.applyAuthorizationPolicy(
      platform.communication,
      extendedAuthPolicy
    );

    platform.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        platform.storageAggregator,
        platform.authorization
      );
    platform.storageAggregator.authorization =
      this.extendStorageAuthorizationPolicy(
        platform.storageAggregator.authorization
      );

    const innovationHubs = await this.innovationHubService.getInnovationHubs({
      relations: {},
    });

    for (const innovationHub of innovationHubs) {
      this.innovationHubAuthorizationService.applyAuthorizationPolicyAndSave(
        innovationHub
      );
    }
    return platform;
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
        [AuthorizationPrivilege.FILE_UPLOAD],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER
      );
    registeredUserUpload.cascade = false;
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

  private async createCredentialRuleDashboardRefresh(): Promise<IAuthorizationPolicyRuleCredential> {
    const criterias: ICredentialDefinition[] = [];
    // Assign all users that are beta tester
    const betaTesterUser: ICredentialDefinition = {
      type: AuthorizationCredential.BETA_TESTER,
      resourceID: '',
    };
    criterias.push(betaTesterUser);

    const interactiveGuidanceRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ACCESS_DASHBOARD_REFRESH],
        criterias,
        CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_DASHBOARD
      );
    interactiveGuidanceRule.cascade = false;
    return interactiveGuidanceRule;
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

    // Allow global admin Spaces to access Platform mgmt
    const platformAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
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
        [AuthorizationPrivilege.CREATE_ORGANIZATION],
        [
          AuthorizationCredential.SPACE_ADMIN,
          AuthorizationCredential.CHALLENGE_ADMIN,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ANY_ADMIN
      );
    createOrg.cascade = false;
    credentialRules.push(createOrg);

    const admin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
          AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY,
          AuthorizationCredential.SPACE_ADMIN,
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
        AuthorizationPrivilege.CREATE_SPACE,
        AuthorizationPrivilege.CREATE_ORGANIZATION,
      ],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_PLATFORM_CREATE
    );
    privilegeRules.push(createPrivilege);

    return privilegeRules;
  }
}
