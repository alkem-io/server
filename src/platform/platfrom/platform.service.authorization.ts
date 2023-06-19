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
import { InnovationHxbService } from '@domain/innovation-hub';
import { InnovationHxbAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private libraryAuthorizationService: LibraryAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private platformService: PlatformService,
    private innovationHxbService: InnovationHxbService,
    private innovationHxbAuthorizationService: InnovationHxbAuthorizationService,
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

    const innovationHxbs = await this.innovationHxbService.getInnovationHxbs({
      relations: [
        'profile',
        'profile.visuals',
        'profile.references',
        'profile.tagsets',
        'profile.location',
      ],
    });

    for (const innovationHxb of innovationHxbs) {
      this.innovationHxbAuthorizationService.applyAuthorizationPolicyAndSave(
        innovationHxb
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
}
