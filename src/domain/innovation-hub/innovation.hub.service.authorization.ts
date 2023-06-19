import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IInnovationHxb, InnovationHxb } from './types';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class InnovationHxbAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(InnovationHxb)
    private hubRepository: Repository<InnovationHxb>
  ) {}

  public async applyAuthorizationPolicyAndSave(
    hub: IInnovationHxb
  ): Promise<IInnovationHxb> {
    hub.authorization = this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        hub.authorization
      );
    hub.authorization.anonymousReadAccess = true;

    hub = await this.cascadeAuthorization(hub);

    return this.hubRepository.save(hub);
  }

  private async cascadeAuthorization(
    innovationHxb: IInnovationHxb
  ): Promise<IInnovationHxb> {
    if (innovationHxb.profile) {
      innovationHxb.profile =
        await this.profileAuthorizationService.applyAuthorizationPolicy(
          innovationHxb.profile,
          innovationHxb.authorization
        );
    }

    return innovationHxb;
  }
}
