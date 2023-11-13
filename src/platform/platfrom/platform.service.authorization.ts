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
  CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE,
  CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';

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
        library: {
          innovationPacks: true,
        },
        communication: true,
      },
    });

    const platformAuthorizationPolicy =
      this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    platform.authorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        platformAuthorizationPolicy
      );
    platform.authorization.anonymousReadAccess = true;
    platform.authorization =
      await this.appendCredentialRulesInteractiveGuidance(
        platform.authorization
      );

    // Cascade down
    const platformPropagated = await this.propagateAuthorizationToChildEntities(
      platform
    );

    return await this.platformRepository.save(platformPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    platform: IPlatform
  ): Promise<IPlatform> {
    if (platform.library) {
      await this.libraryAuthorizationService.applyAuthorizationPolicy(
        platform.library,
        platform.authorization
      );
    }

    if (platform.communication) {
      const copyPlatformAuthorization: IAuthorizationPolicy = JSON.parse(
        JSON.stringify(platform.authorization)
      );
      // Extend the platform authoization policy for communication only
      const extendedAuthPolicy = await this.appendCredentialRulesCommunication(
        copyPlatformAuthorization
      );
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        platform.communication,
        extendedAuthPolicy
      );
    }

    platform.storageAggregator =
      await this.platformService.getStorageAggregator(platform);
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
      relations: {
        profile: {
          visuals: true,
          references: true,
          tagsets: true,
          location: true,
        },
      },
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

  private async appendCredentialRulesInteractiveGuidance(
    authorization: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const criterias: ICredentialDefinition[] = [];
    // Assign all users that are beta tester
    const betaTesterUser: ICredentialDefinition = {
      type: AuthorizationCredential.BETA_TESTER,
      resourceID: '',
    };
    criterias.push(betaTesterUser);
    // Assign all users that are associates of organizations that are beta testers
    const betaTesterOrganizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.BETA_TESTER,
      });
    for (const organization of betaTesterOrganizations) {
      const betaTesterOrg: ICredentialDefinition = {
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
        resourceID: organization.id,
      };
      criterias.push(betaTesterOrg);
    }

    const interactiveGuidanceRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE],
        criterias,
        `${CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE}2`
      );
    interactiveGuidanceRule.cascade = false;

    newRules.push(interactiveGuidanceRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }
}
