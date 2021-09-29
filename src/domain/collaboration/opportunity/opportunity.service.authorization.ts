import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationRuleCredential,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { Opportunity } from '@domain/collaboration/opportunity';
import { IOpportunity } from '..';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

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
    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        relation.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            relation.authorization,
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
  ): AuthorizationRuleCredential[] {
    const rules: AuthorizationRuleCredential[] = [];

    const opportunityAdmin = {
      type: AuthorizationCredential.OPPORTUNITY_ADMIN,
      resourceID: opportunityID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.DELETE,
      ],
    };
    rules.push(opportunityAdmin);

    const opportunityMember = {
      type: AuthorizationCredential.OPPORTUNITY_MEMBER,
      resourceID: opportunityID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(opportunityMember);

    return rules;
  }
}
