import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IInnovationHub, InnovationHub } from './types';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class InnovationHubAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(InnovationHub)
    private spaceRepository: Repository<InnovationHub>
  ) {}

  public async applyAuthorizationPolicyAndSave(
    space: IInnovationHub
  ): Promise<IInnovationHub> {
    space.authorization = this.authorizationPolicyService.reset(
      space.authorization
    );
    space.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        space.authorization
      );
    space.authorization.anonymousReadAccess = true;

    space = await this.cascadeAuthorization(space);

    return this.spaceRepository.save(space);
  }

  private async cascadeAuthorization(
    innovationHub: IInnovationHub
  ): Promise<IInnovationHub> {
    if (innovationHub.profile) {
      innovationHub.profile =
        await this.profileAuthorizationService.applyAuthorizationPolicy(
          innovationHub.profile,
          innovationHub.authorization
        );
    }

    return innovationHub;
  }
}
