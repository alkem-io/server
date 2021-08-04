import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IAuthorizationPolicy,
  UpdateAuthorizationPolicyInput,
} from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { Opportunity } from '@domain/collaboration/opportunity';
import { IOpportunity } from '..';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

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
    opportunity.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        opportunity.authorization,
        challengeAuthorization
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

  async updateAuthorization(
    opportunity: IOpportunity,
    authorizationUpdateData: UpdateAuthorizationPolicyInput
  ): Promise<IOpportunity> {
    await this.baseChallengeAuthorizationService.updateAuthorization(
      opportunity,
      this.opportunityRepository,
      authorizationUpdateData
    );

    // propagate authorization rules for child entities
    if (opportunity.projects) {
      for (const project of opportunity.projects) {
        project.authorization =
          this.authorizationPolicyService.updateAuthorization(
            project.authorization,
            authorizationUpdateData
          );
      }
    }
    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        relation.authorization =
          this.authorizationPolicyService.updateAuthorization(
            relation.authorization,
            authorizationUpdateData
          );
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }
}
