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

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private libraryAuthorizationService: LibraryAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private platformService: PlatformService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {}

  async applyAuthorizationPolicy(platform: IPlatform): Promise<IPlatform> {
    // Ensure always applying from a clean state
    platform.authorization = this.authorizationPolicyService.reset(
      platform.authorization
    );
    platform.authorization =
      this.platformAuthorizationPolicyService.inheritPlatformAuthorizationPolicy(
        platform.authorization
      );
    platform.authorization.anonymousReadAccess = true;

    // Cascade down
    const platformPropagated =
      await this.propagateAuthorizationToChildEntities();

    return await this.platformRepository.save(platformPropagated);
  }

  private async propagateAuthorizationToChildEntities(): Promise<IPlatform> {
    const platformPropagated = await this.platformService.getPlatformOrFail({
      relations: ['library', 'communication'],
    });
    if (platformPropagated.library) {
      await this.libraryAuthorizationService.applyAuthorizationPolicy(
        platformPropagated.library
      );
    }

    if (platformPropagated.communication) {
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        platformPropagated.communication,
        platformPropagated.communication.authorization
      );
    }
    return platformPropagated;
  }
}
