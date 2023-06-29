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
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { InnovationHubService } from '@domain/innovation-hub';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER } from '@common/constants';

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
    private storageBucketAuthorizationService: StorageBucketAuthorizationService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {}

  async applyAuthorizationPolicy(): Promise<IPlatform> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: ['library', 'library.innovationPacks', 'communication'],
    });

    platform.authorization =
      this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    platform.authorization.anonymousReadAccess = true;

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

    platform.storageBucket = await this.platformService.getStorageBucket(
      platform
    );
    platform.storageBucket =
      await this.storageBucketAuthorizationService.applyAuthorizationPolicy(
        platform.storageBucket,
        platform.authorization
      );
    platform.storageBucket.authorization =
      this.extendStorageAuthorizationPolicy(
        platform.storageBucket.authorization
      );

    const innovationHubs = await this.innovationHubService.getInnovationHubs({
      relations: [
        'profile',
        'profile.visuals',
        'profile.references',
        'profile.tagsets',
        'profile.location',
      ],
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
}
