import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IOpportunity } from './opportunity.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { OpportunityService } from './opportunity.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_OPPORTUNITY_ADMIN,
  CREDENTIAL_RULE_OPPORTUNITY_MEMBER,
} from '@common/constants';
import { CommunityRole } from '@common/enums/community.role';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { Repository } from 'typeorm';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private opportunityService: OpportunityService,
    private communityPolicyService: CommunityPolicyService,
    private spaceSettingsService: SpaceSettingsService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async applyAuthorizationPolicy(
    opportunityInput: IOpportunity,
    challengeAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityInput.id,
      {
        relations: {
          account: {
            license: true,
          },
          community: {
            policy: true,
          },
        },
      }
    );
    if (
      !opportunity.account ||
      !opportunity.account.license ||
      !opportunity.community ||
      !opportunity.community.policy
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for challenge ${opportunity.id} `,
        LogContext.CHALLENGES
      );
    }
    opportunity.community.policy.settings =
      this.spaceSettingsService.getSettings(opportunity.settingsStr);
    const license = opportunity.account.license;
    const communityPolicy = opportunity.community.policy;

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
    return await this.baseChallengeAuthorizationService.propagateAuthorizationToChildEntities(
      opportunity,
      license,
      this.opportunityRepository
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
        [
          this.communityPolicyService.getCredentialForRole(
            policy,
            CommunityRole.ADMIN
          ),
        ],
        CREDENTIAL_RULE_OPPORTUNITY_ADMIN
      );
    rules.push(opportunityAdmin);

    const opportunityMember =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        [
          this.communityPolicyService.getCredentialForRole(
            policy,
            CommunityRole.MEMBER
          ),
        ],
        CREDENTIAL_RULE_OPPORTUNITY_MEMBER
      );
    rules.push(opportunityMember);

    return rules;
  }
}
