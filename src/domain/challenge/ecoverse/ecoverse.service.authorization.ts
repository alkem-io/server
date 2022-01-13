import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { EcoverseService } from './ecoverse.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import {
  IAuthorizationPolicy,
  UpdateAuthorizationPolicyInput,
} from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IEcoverse } from './ecoverse.interface';
import { Ecoverse } from './ecoverse.entity';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class EcoverseAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private ecoverseService: EcoverseService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async applyAuthorizationPolicy(
    ecoverse: IEcoverse,
    authorizationPolicyData?: UpdateAuthorizationPolicyInput
  ): Promise<IEcoverse> {
    // Store the current value of anonymousReadAccess
    const anonymousReadAccessCache =
      ecoverse.authorization?.anonymousReadAccess;
    // Ensure always applying from a clean state
    ecoverse.authorization = await this.authorizationPolicyService.reset(
      ecoverse.authorization
    );
    ecoverse.authorization =
      this.authorizationPolicyService.inheritPlatformAuthorization(
        ecoverse.authorization
      );
    ecoverse.authorization = this.extendAuthorizationPolicy(
      ecoverse.authorization,
      ecoverse.id
    );
    if (authorizationPolicyData) {
      ecoverse.authorization.anonymousReadAccess =
        authorizationPolicyData.anonymousReadAccess;
    } else if (anonymousReadAccessCache === false) {
      ecoverse.authorization.anonymousReadAccess = false;
    }

    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      ecoverse,
      this.ecoverseRepository
    );

    // propagate authorization rules for child entities
    const challenges = await this.ecoverseService.getChallenges(ecoverse);
    for (const challenge of challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        ecoverse.authorization
      );
      challenge.authorization =
        await this.authorizationPolicyService.appendCredentialAuthorizationRule(
          challenge.authorization,
          {
            type: AuthorizationCredential.ECOVERSE_ADMIN,
            resourceID: ecoverse.id,
          },
          [AuthorizationPrivilege.DELETE]
        );
    }

    return await this.ecoverseRepository.save(ecoverse);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    ecoverseID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${ecoverseID}`,
        LogContext.CHALLENGES
      );
    const newRules: AuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    const communityAdmin = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY
    );
    newRules.push(communityAdmin);

    const ecoverseAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      AuthorizationCredential.ECOVERSE_ADMIN,
      ecoverseID
    );
    newRules.push(ecoverseAdmin);

    const ecoverseMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.ECOVERSE_MEMBER,
      ecoverseID
    );
    newRules.push(ecoverseMember);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
