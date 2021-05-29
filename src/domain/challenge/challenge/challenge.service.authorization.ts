import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { Challenge, IChallenge } from '@domain/challenge/challenge';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationCredentialRule } from '@src/services/authorization-engine/authorization.credential.rule';
import { EntityNotInitializedException } from '@common/exceptions';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationRules(
    challenge: IChallenge,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<IChallenge> {
    challenge.authorization = this.authorizationEngine.inheritParentAuthorization(
      challenge.authorization,
      parentAuthorization
    );
    challenge.authorization = this.updateAuthorizationDefinition(
      challenge.authorization,
      challenge.id
    );

    // propagate authorization rules for child entities
    this.baseChallengeAuthorizationService.applyAuthorizationRules(
      challenge,
      this.challengeRepository
    );
    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        await this.applyAuthorizationRules(
          childChallenge,
          challenge.authorization
        );
      }
    }
    if (challenge.opportunities) {
      for (const opportunity of challenge.opportunities) {
        opportunity.authorization = this.authorizationEngine.inheritParentAuthorization(
          opportunity.authorization,
          challenge.authorization
        );
      }
    }

    return await this.challengeRepository.save(challenge);
  }

  private updateAuthorizationDefinition(
    authorization: IAuthorizationDefinition | undefined,
    challengeID: string
  ): IAuthorizationDefinition {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${challengeID}`,
        LogContext.CHALLENGES
      );
    const newRules: AuthorizationCredentialRule[] = [];

    const challengeAdmin = {
      type: AuthorizationCredential.ChallengeAdmin,
      resourceID: challengeID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    newRules.push(challengeAdmin);

    const challengeMember = {
      type: AuthorizationCredential.ChallengeMember,
      resourceID: challengeID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(challengeMember);

    this.authorizationEngine.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
