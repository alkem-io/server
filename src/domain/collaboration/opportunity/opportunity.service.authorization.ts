import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import {
  IAuthorizationDefinition,
  UpdateAuthorizationDefinitionInput,
} from '@domain/common/authorization-definition';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { Opportunity } from '@domain/collaboration/opportunity';
import { IOpportunity } from '..';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async applyAuthorizationRules(
    opportunity: IOpportunity,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<IOpportunity> {
    opportunity.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
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
        relation.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
          relation.authorization,
          opportunity.authorization
        );
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }

  async updateAuthorization(
    opportunity: IOpportunity,
    authorizationUpdateData: UpdateAuthorizationDefinitionInput
  ): Promise<IOpportunity> {
    await this.baseChallengeAuthorizationService.updateAuthorization(
      opportunity,
      this.opportunityRepository,
      authorizationUpdateData
    );

    // propagate authorization rules for child entities
    if (opportunity.projects) {
      for (const project of opportunity.projects) {
        project.authorization = this.authorizationDefinitionService.updateAuthorization(
          project.authorization,
          authorizationUpdateData
        );
      }
    }
    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        relation.authorization = this.authorizationDefinitionService.updateAuthorization(
          relation.authorization,
          authorizationUpdateData
        );
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }
}
