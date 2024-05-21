import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

import { IAgent } from './agent.interface';

@Injectable()
export class AgentAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    agent: IAgent,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAgent {
    agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        agent.authorization,
        parentAuthorization
      );

    return agent;
  }
}
