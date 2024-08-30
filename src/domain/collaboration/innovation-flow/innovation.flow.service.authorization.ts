import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationFlow } from './innovation.flow.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { PRIVILEGE_RULE_TYPES_INNOVATION_FLOW_UPDATE } from '@common/constants/authorization/policy.rule.constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class InnovationFlowAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    innovationFlow: IInnovationFlow,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    if (!innovationFlow.profile) {
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
    innovationFlow.authorization = this.appendPrivilegeRules(
      innovationFlow.authorization
    );
    updatedAuthorizations.push(innovationFlow.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationFlow.profile.id,
        innovationFlow.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

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

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.SPACES
      );
    const privilegeRules: IAuthorizationPolicyRulePrivilege[] = [];

    const createPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
      AuthorizationPrivilege.CREATE,
      PRIVILEGE_RULE_TYPES_INNOVATION_FLOW_UPDATE
    );
    privilegeRules.push(createPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
