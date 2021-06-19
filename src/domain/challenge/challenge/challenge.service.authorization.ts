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
import {
  IAuthorizationDefinition,
  UpdateAuthorizationDefinitionInput,
} from '@domain/common/authorization-definition';
import { EntityNotInitializedException } from '@common/exceptions';
import { BaseChallengeAuthorizationService } from '@domain/challenge/base-challenge/base.challenge.service.authorization';
import { OpportunityAuthorizationService } from '@domain/collaboration/opportunity/opportunity.service.authorization';
import { ChallengeService } from './challenge.service';
import {
  AuthorizationRuleCredential,
  AuthorizationRuleVerifiedCredential,
} from '@src/services/platform/authorization-engine';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
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
    challenge.authorization = this.extendAuthorizationDefinition(
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
        await this.opportunityAuthorizationService.applyAuthorizationRules(
          opportunity,
          challenge.authorization
        );
      }
    }

    const agent = await this.challengeService.getAgent(challenge.id);
    agent.authorization = this.authorizationEngine.inheritParentAuthorization(
      agent.authorization,
      challenge.authorization
    );

    return await this.challengeRepository.save(challenge);
  }

  private extendAuthorizationDefinition(
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

  async updateAuthorization(
    challenge: IChallenge,
    authorizationUpdateData: UpdateAuthorizationDefinitionInput
  ): Promise<IChallenge> {
    await this.baseChallengeAuthorizationService.updateAuthorization(
      challenge,
      this.challengeRepository,
      authorizationUpdateData
    );

    // propagate authorization rules for child entities
    if (challenge.opportunities) {
      for (const opportunity of challenge.opportunities) {
        opportunity.authorization = this.authorizationEngine.updateAuthorization(
          opportunity.authorization,
          authorizationUpdateData
        );
        await this.opportunityAuthorizationService.updateAuthorization(
          opportunity,
          opportunity.authorization
        );
      }
    }

    return await this.challengeRepository.save(challenge);
  }
}
