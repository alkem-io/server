import { Injectable } from '@nestjs/common';
import { InnovationFlowService } from './innovaton.flow.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationFlow } from './innovation.flow.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class InnovationFlowAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private innovationFlowService: InnovationFlowService
  ) {}

  async applyAuthorizationPolicy(
    innovationFlow: IInnovationFlow,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInnovationFlow> {
    // Ensure always applying from a clean state
    innovationFlow.authorization = this.authorizationPolicyService.reset(
      innovationFlow.authorization
    );
    innovationFlow.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        innovationFlow.authorization,
        parentAuthorization
      );

    // Cascade down
    const innovationFlowPropagated =
      await this.propagateAuthorizationToChildEntities(innovationFlow);

    return await this.innovationFlowService.save(innovationFlowPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    innovationFlow: IInnovationFlow
  ): Promise<IInnovationFlow> {
    innovationFlow.profile = await this.innovationFlowService.getProfile(
      innovationFlow
    );
    innovationFlow.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationFlow.profile,
        innovationFlow.authorization
      );

    return innovationFlow;
  }
}
