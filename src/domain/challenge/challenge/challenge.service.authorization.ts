import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { RelationshipNotFoundException } from '@common/exceptions';
import { OpportunityAuthorizationService } from '@domain/challenge/opportunity/opportunity.service.authorization';
import { ChallengeService } from './challenge.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IChallenge } from './challenge.interface';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { InjectRepository } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { Repository } from 'typeorm';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challengeInput: IChallenge,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeInput.id,
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
      !challenge.account ||
      !challenge.account.license ||
      !challenge.account.authorization ||
      !challenge.community ||
      !challenge.community.policy ||
      !challenge.authorization
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to reset auth for challenge ${challenge.id} `,
        LogContext.CHALLENGES
      );
    }
    const license = challenge.account.license;

    const communityPolicy =
      this.baseChallengeAuthorizationService.getCommunityPolicyWithSettings(
        challenge
      );

    // If it is a private challenge then cannot inherit from Space
    const baseAuthorization = challenge.authorization;
    if (communityPolicy.settings.privacy.mode === SpacePrivacyMode.PRIVATE) {
      this.authorizationPolicyService.inheritParentAuthorization(
        baseAuthorization,
        parentAuthorization
      );
    } else {
      // Inherite from account, and extend for admins
      const accountAuthorization = challenge.account.authorization;
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

    challengeInput.authorization =
      this.baseChallengeAuthorizationService.extendAuthorizationPolicyLocal(
        baseAuthorization,
        communityPolicy
      );
    challenge.authorization = baseAuthorization;

    // propagate authorization rules for child entities
    const challengePropagated =
      await this.baseChallengeAuthorizationService.propagateAuthorizationToChildEntities(
        challenge,
        license,
        this.challengeRepository
      );
    return await this.propagateAuthorizationToOpportunities(
      challengePropagated
    );
  }

  public async propagateAuthorizationToOpportunities(
    challengeBase: IChallenge
  ): Promise<IChallenge> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeBase.id,
      {
        relations: {
          opportunities: true,
        },
      }
    );
    if (!challenge.opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load child entities for challenge authorization: ${challenge.id} - ${challenge.opportunities}`,
        LogContext.CHALLENGES
      );

    for (const opportunity of challenge.opportunities) {
      await this.opportunityAuthorizationService.applyAuthorizationPolicy(
        opportunity,
        challenge.authorization
      );
    }

    return await this.challengeService.save(challenge);
  }
}
