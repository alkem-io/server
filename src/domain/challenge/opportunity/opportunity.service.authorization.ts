import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IOpportunity } from './opportunity.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LogContext } from '@common/enums/logging.context';
import { OpportunityService } from './opportunity.service';

import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { Repository } from 'typeorm';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';

@Injectable()
export class OpportunityAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private opportunityService: OpportunityService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async applyAuthorizationPolicy(
    opportunityInput: IOpportunity,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityInput.id,
      {
        relations: {
          account: {
            license: true,
            authorization: true,
          },
          community: {
            policy: true,
          },
          authorization: true,
        },
      }
    );
    if (
      !opportunity.account ||
      !opportunity.account.license ||
      !opportunity.account.authorization ||
      !opportunity.community ||
      !opportunity.community.policy ||
      !opportunity.authorization
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for opportunity ${opportunity.id} `,
        LogContext.CHALLENGES
      );
    }
    const license = opportunity.account.license;

    const communityPolicy =
      this.baseChallengeAuthorizationService.getCommunityPolicyWithSettings(
        opportunity
      );

    // If it is a private opportunity then cannot inherit from Space
    const baseAuthorization = opportunity.authorization;
    if (communityPolicy.settings.privacy.mode === SpacePrivacyMode.PRIVATE) {
      this.authorizationPolicyService.inheritParentAuthorization(
        baseAuthorization,
        parentAuthorization
      );
    } else {
      // Inherite from account, and extend for admins
      const accountAuthorization = opportunity.account.authorization;
      this.authorizationPolicyService.inheritParentAuthorization(
        baseAuthorization,
        accountAuthorization
      );
      baseAuthorization.anonymousReadAccess = false;
      this.baseChallengeAuthorizationService.extendPrivateSubspaceAdmins(
        baseAuthorization,
        communityPolicy
      );
    }

    opportunityInput.authorization =
      this.baseChallengeAuthorizationService.extendAuthorizationPolicyLocal(
        baseAuthorization,
        communityPolicy
      );
    opportunity.authorization = baseAuthorization;
    await this.opportunityService.save(opportunity);

    // propagate authorization rules for child entities
    return await this.baseChallengeAuthorizationService.propagateAuthorizationToChildEntities(
      opportunity,
      license,
      this.opportunityRepository
    );
  }
}
