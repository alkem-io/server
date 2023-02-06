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
import { OpportunityService } from './opportunity.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import {
  CREDENTIAL_RULE_OPPORTUNITY_ADMIN,
  CREDENTIAL_RULE_OPPORTUNITY_MEMBER,
  CREDENTIAL_RULE_TYPES_OPPORTUNITY_UPDATE_INNOVATION_FLOW,
} from '@common/constants';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private opportunityService: OpportunityService,
    private communityPolicyService: CommunityPolicyService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async applyAuthorizationPolicy(
    opportunity: IOpportunity,
    challengeAuthorization: IAuthorizationPolicy | undefined,
    challengeCommunityPolicy: ICommunityPolicy
  ): Promise<IOpportunity> {
    const communityPolicy = await this.opportunityService.getCommunityPolicy(
      opportunity.id
    );

    this.setCommunityPolicyFlags(communityPolicy, challengeCommunityPolicy);

    // Start with parent authorization
    opportunity.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        opportunity.authorization,
        challengeAuthorization
      );
    // Add in opportunity specified policy rules
    opportunity.authorization = this.appendCredentialRules(
      opportunity.authorization,
      communityPolicy
    );

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      opportunity,
      this.opportunityRepository,
      communityPolicy
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

  private setCommunityPolicyFlags(
    policy: ICommunityPolicy,
    challengeCommunityPolicy: ICommunityPolicy
  ) {
    // propagate the value of the parent community policy into the opportunity community policy
    const challengeContributors = this.communityPolicyService.getFlag(
      challengeCommunityPolicy,
      CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
      challengeContributors
    );

    // Propagate the callout flag from challenge community policy also
    const challengeCalloutCreation = this.communityPolicyService.getFlag(
      challengeCommunityPolicy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS
    );
    this.communityPolicyService.setFlag(
      policy,
      CommunityPolicyFlag.ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS,
      challengeCalloutCreation
    );
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${policy}`,
        LogContext.OPPORTUNITY
      );

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(policy)
    );
  }

  private createCredentialRules(
    policy: ICommunityPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    const opportunityAdmin =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.DELETE,
        ],
        [this.communityPolicyService.getAdminCredential(policy)],
        CREDENTIAL_RULE_OPPORTUNITY_ADMIN
      );
    rules.push(opportunityAdmin);

    const opportunityMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        [this.communityPolicyService.getMembershipCredential(policy)],
        CREDENTIAL_RULE_OPPORTUNITY_MEMBER
      );
    rules.push(opportunityMember);

    const updateInnovationFlowRule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.UPDATE_INNOVATION_FLOW],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_HUBS,
        ],
        CREDENTIAL_RULE_TYPES_OPPORTUNITY_UPDATE_INNOVATION_FLOW
      );
    updateInnovationFlowRule.inheritable = false;
    rules.push(updateInnovationFlowRule);

    return rules;
  }
}
