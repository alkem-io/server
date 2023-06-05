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
    private hubRepository: Repository<InnovationHub>
  ) {}

  public async applyAuthorizationPolicyAndSave(
    hub: IInnovationHub
  ): Promise<IInnovationHub> {
    hub.authorization = this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        hub.authorization
      );
    hub.authorization.anonymousReadAccess = true;

    await this.cascadeAuthorization(hub);

    return this.hubRepository.save(hub);
  }

  private async cascadeAuthorization(
    innovationHub: IInnovationHub
  ): Promise<IInnovationHub> {
    if (innovationHub.profile) {
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationHub.profile,
        innovationHub.authorization
      );
    }

    return innovationHub;
  }
}
