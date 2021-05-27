import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationRule } from '@src/services/authorization-engine/authorizationRule';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { Challenge, IChallenge } from '@domain/challenge/challenge';

@Injectable()
export class ChallengeAuthorizationService {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async applyAuthorizationRules(challenge: IChallenge): Promise<IChallenge> {
    challenge.authorizationRules = this.authorizationEngine.appendAuthorizationRules(
      challenge.authorizationRules,
      this.createAuthorizationRules(challenge.id)
    );

    // propagate authorization rules for child entities
    if (challenge.childChallenges) {
      for (const childChallenge of challenge.childChallenges) {
        childChallenge.authorizationRules = challenge.authorizationRules;
        await this.applyAuthorizationRules(childChallenge);
      }
    }
    if (challenge.opportunities) {
      for (const opportunity of challenge.opportunities) {
        opportunity.authorizationRules = challenge.authorizationRules;
      }
    }

    if (challenge.community) {
      challenge.community.authorizationRules = challenge.authorizationRules;
    }

    if (challenge.context) {
      challenge.context.authorizationRules = challenge.authorizationRules;
      this.authorizationEngine.appendAuthorizationRule(
        challenge.context.authorizationRules,
        {
          type: AuthorizationCredential.GlobalRegistered,
          resourceID: 'challengeID',
        },
        [AuthorizationPrivilege.READ]
      );
    }

    return await this.challengeRepository.save(challenge);
  }

  private createAuthorizationRules(challengeID: string): string {
    const rules: AuthorizationRule[] = [];

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
      type: AuthorizationCredential.EcoverseMember,
      resourceID: challengeID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(challengeMember);

    return JSON.stringify(rules);
  }
}
