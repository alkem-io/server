import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { IChallenge } from '@domain/challenge/challenge';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { Opportunity } from '@domain/collaboration/opportunity';
import { IOpportunity } from '..';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async applyAuthorizationRules(
    opportunity: IOpportunity,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<IChallenge> {
    opportunity.authorization = this.authorizationEngine.inheritParentAuthorization(
      opportunity.authorization,
      parentAuthorization
    );

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationRules(
      opportunity,
      this.opportunityRepository
    );
    if (opportunity.projects) {
      for (const project of opportunity.projects) {
        await this.applyAuthorizationRules(project, opportunity.authorization);
      }
    }
    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        relation.authorization = this.authorizationEngine.inheritParentAuthorization(
          relation.authorization,
          opportunity.authorization
        );
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }
}
