import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationFlow } from './innovation.flow.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { PRIVILEGE_RULE_TYPES_INNOVATION_FLOW_UPDATE } from '@common/constants/authorization/policy.rule.constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { InnovationFlowService } from './innovation.flow.service';
import { InnovationFlowStateAuthorizationService } from '../innovation-flow-state/innovation.flow.state.service.authorization';

@Injectable()
export class InnovationFlowAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private innovationFlowService: InnovationFlowService,
    private innovationFlowStateAuthorizationService: InnovationFlowStateAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    innovationFlowID: string,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const innovationFlow: IInnovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowID,
        {
          relations: {
            profile: true,
            states: true,
          },
        }
      );
    if (!innovationFlow.profile || !innovationFlow.states) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for innovationFlow ${innovationFlow.id} `,
        LogContext.INNOVATION_FLOW
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];
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
    innovationFlow.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        innovationFlow.authorization,
        AuthorizationPrivilege.CREATE,
        [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
        PRIVILEGE_RULE_TYPES_INNOVATION_FLOW_UPDATE
      );
    updatedAuthorizations.push(innovationFlow.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationFlow.profile.id,
        innovationFlow.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    for (const state of innovationFlow.states) {
      const stateAuthorization =
        this.innovationFlowStateAuthorizationService.applyAuthorizationPolicy(
          state,
          innovationFlow.authorization
        );
      updatedAuthorizations.push(stateAuthorization);
    }

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for: InnovationFlow}',
        LogContext.SPACES
      );

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules()
    );

    return authorization;
  }

  private createCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    return rules;
  }
}
