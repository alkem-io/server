import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { Opportunity } from '@domain/collaboration/opportunity';
import { IOpportunity } from '..';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async applyAuthorizationPolicy(
    opportunity: IOpportunity,
    challengeAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IOpportunity> {
    // Start with parent authorization
    opportunity.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        opportunity.authorization,
        challengeAuthorization
      );
    // Add in opportunity specified policy rules
    opportunity.authorization = this.appendCredentialRules(
      opportunity.authorization,
      opportunity.id
    );

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      opportunity,
      this.opportunityRepository
    );
    if (opportunity.projects) {
      for (const project of opportunity.projects) {
        project.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            project.authorization,
            opportunity.authorization
          );
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    opportunityID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${opportunityID}`,
        LogContext.OPPORTUNITY
      );

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(opportunityID)
    );

    return authorization;
  }

  private createCredentialRules(
    opportunityID: string
  ): AuthorizationPolicyRuleCredential[] {
    const rules: AuthorizationPolicyRuleCredential[] = [];

    const opportunityAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.DELETE,
      ],
      AuthorizationCredential.OPPORTUNITY_ADMIN,
      opportunityID
    );
    rules.push(opportunityAdmin);

    const opportunityMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.OPPORTUNITY_MEMBER,
      opportunityID
    );
    rules.push(opportunityMember);

    const updateInnovationFlowRule = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
      AuthorizationCredential.GLOBAL_ADMIN
    );
    updateInnovationFlowRule.inheritable = false;
    rules.push(updateInnovationFlowRule);

    const updateInnovationFlowRuleGlobalHubs =
      new AuthorizationPolicyRuleCredential(
        [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
        AuthorizationCredential.GLOBAL_ADMIN_HUBS
      );
    updateInnovationFlowRuleGlobalHubs.inheritable = false;
    rules.push(updateInnovationFlowRuleGlobalHubs);

    return rules;
  }
}
