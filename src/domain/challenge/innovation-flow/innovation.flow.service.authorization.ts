import { Injectable } from '@nestjs/common';
import { InnovationFlowService } from './innovaton.flow.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationFlow } from './innovation.flow.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CREDENTIAL_RULE_TYPES_INNOVATION_FLOW_UPDATE } from '@common/constants/authorization/credential.rule.types.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';

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
    innovationFlow.authorization = this.appendCredentialRules(
      innovationFlow.authorization
    );

    // Cascade down
    const innovationFlowPropagated =
      await this.propagateAuthorizationToChildEntities(innovationFlow);

    return await this.innovationFlowService.save(innovationFlowPropagated);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for: InnovationFlow}',
        LogContext.CHALLENGES
      );

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules()
    );

    return authorization;
  }

  private createCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    const updateInnovationFlowRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_INNOVATION_FLOW_UPDATE
      );
    updateInnovationFlowRule.cascade = false;
    rules.push(updateInnovationFlowRule);

    return rules;
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
