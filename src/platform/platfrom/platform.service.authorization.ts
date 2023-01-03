import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IPlatform } from './platform.interface';
import { Platform } from './platform.entity';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
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
    const platformPropagated = await this.propagateAuthorizationToChildEntities(
      platform
    );

    return await this.platformRepository.save(platformPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    platform: IPlatform
  ): Promise<IPlatform> {
    return platform;
  }
}
