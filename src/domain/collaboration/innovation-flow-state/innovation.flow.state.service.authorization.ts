import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { IInnovationFlowState } from './innovation.flow.state.interface';

@Injectable()
export class InnovationFlowStateAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    innovationFlowState: IInnovationFlowState,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    // Ensure always applying from a clean state
    innovationFlowState.authorization = this.authorizationPolicyService.reset(
      innovationFlowState.authorization
    );
    innovationFlowState.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        innovationFlowState.authorization,
        parentAuthorization
      );

    return innovationFlowState.authorization;
  }
}
