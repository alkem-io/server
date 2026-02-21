import { PRIVILEGE_RULE_TYPES_INNOVATION_FLOW_UPDATE } from '@common/constants/authorization/policy.rule.constants';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Injectable } from '@nestjs/common';
import { InnovationFlowStateAuthorizationService } from '../innovation-flow-state/innovation.flow.state.service.authorization';
import { IInnovationFlow } from './innovation.flow.interface';
import { InnovationFlowService } from './innovation.flow.service';

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
      await this.authorizationPolicyService.inheritParentAuthorization(
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
        await this.innovationFlowStateAuthorizationService.applyAuthorizationPolicy(
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
