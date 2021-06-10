import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationVerifiedCredential,
  LogContext,
} from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { Challenge, IChallenge } from '@domain/challenge/challenge';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';
import { EntityNotInitializedException } from '@common/exceptions';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import {
  AuthorizationRuleCredential,
  AuthorizationRuleVerifiedCredential,
} from '@src/services/platform/authorization-engine';
import { ChallengeService } from './challenge.service';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
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
    // Also update the verified credential rules
    challenge.authorization.verifiedCredentialRules = await this.createVerifiedCredentialRules(
      challenge.id
    );

    // propagate authorization rules for child entities
    await this.baseChallengeAuthorizationService.applyAuthorizationRules(
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

    this.authorizationEngine.appendCredentialAuthorizationRules(
      authorization,
      this.createCredentialRules(challengeID)
    );

    return authorization;
  }

  private createCredentialRules(
    challengeID: string
  ): AuthorizationRuleCredential[] {
    const rules: AuthorizationRuleCredential[] = [];

    const challengeAdmin = {
      type: AuthorizationCredential.ChallengeAdmin,
      resourceID: challengeID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    rules.push(challengeAdmin);

    const challengeMember = {
      type: AuthorizationCredential.ChallengeMember,
      resourceID: challengeID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(challengeMember);

    return rules;
  }

  async createVerifiedCredentialRules(challengeID: string): Promise<string> {
    const rules: AuthorizationRuleVerifiedCredential[] = [];
    const agent = await this.challengeService.getAgent(challengeID);

    const stateChange = {
      type: AuthorizationVerifiedCredential.StateModificationCredential,
      resourceID: agent.did,
      grantedPrivileges: [AuthorizationPrivilege.UPDATE],
    };
    rules.push(stateChange);

    return JSON.stringify(rules);
  }
}
