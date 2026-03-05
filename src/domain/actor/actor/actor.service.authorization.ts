import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';

import { IActor } from './actor.interface';

@Injectable()
export class ActorAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    actor: IActor,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    actor.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        actor.authorization,
        parentAuthorization
      );

    return actor.authorization;
  }
}
