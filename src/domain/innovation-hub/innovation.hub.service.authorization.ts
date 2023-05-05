import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IInnovationHub, InnovationHub } from './';

@Injectable()
export class InnovationHubAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @InjectRepository(InnovationHub)
    private hubRepository: Repository<InnovationHub>
  ) {}

  public applyAuthorizationPolicyAndSave(
    hub: IInnovationHub
  ): Promise<IInnovationHub> {
    hub.authorization = this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization.anonymousReadAccess = false;
    hub.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        hub.authorization
      );
    // todo apply more auth

    return this.hubRepository.save(hub);
  }
}
