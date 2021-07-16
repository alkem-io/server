import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  AuthorizationVerifiedCredential,
  LogContext,
} from '@common/enums';
import { Repository } from 'typeorm';
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
} from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private challengeService: ChallengeService,
    private opportunityAuthorizationService: OpportunityAuthorizationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationPolicy(
    challenge: IChallenge,
    parentAuthorization: IAuthorizationDefinition | undefined
  ): Promise<IChallenge> {
    challenge.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
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
    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      challenge,
      this.challengeRepository
    );
    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        await this.applyAuthorizationPolicy(
          childChallenge,
          challenge.authorization
        );
      }
    }
    if (challenge.opportunities) {
      for (const opportunity of challenge.opportunities) {
        await this.opportunityAuthorizationService.applyAuthorizationPolicy(
          opportunity,
          challenge.authorization
        );
      }
    }

    const agent = await this.challengeService.getAgent(challenge.id);
    agent.authorization = await this.authorizationDefinitionService.reset(
      agent.authorization
    );

    agent.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
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

    this.authorizationDefinitionService.appendCredentialAuthorizationRules(
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
        opportunity.authorization = this.authorizationDefinitionService.updateAuthorization(
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
