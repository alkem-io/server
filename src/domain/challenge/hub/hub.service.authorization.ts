import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { HubService } from './hub.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import {
  IAuthorizationPolicy,
  UpdateAuthorizationPolicyInput,
} from '@domain/common/authorization-policy';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IHub } from './hub.interface';
import { Hub } from './hub.entity';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';

@Injectable()
export class HubAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private hubService: HubService,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>
  ) {}

  async applyAuthorizationPolicy(
    hub: IHub,
    authorizationPolicyData?: UpdateAuthorizationPolicyInput
  ): Promise<IHub> {
    // Store the current value of anonymousReadAccess
    const anonymousReadAccessCache = hub.authorization?.anonymousReadAccess;
    // Ensure always applying from a clean state
    hub.authorization = await this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization =
      this.authorizationPolicyService.inheritPlatformAuthorization(
        hub.authorization
      );
    hub.authorization = this.extendAuthorizationPolicy(
      hub.authorization,
      hub.id
    );
    if (authorizationPolicyData) {
      hub.authorization.anonymousReadAccess =
        authorizationPolicyData.anonymousReadAccess;
    } else if (anonymousReadAccessCache === false) {
      hub.authorization.anonymousReadAccess = false;
    }

    await this.baseChallengeAuthorizationService.applyAuthorizationPolicy(
      hub,
      this.hubRepository
    );

    // propagate authorization rules for child entities
    hub.challenges = await this.hubService.getChallenges(hub);
    for (const challenge of hub.challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        hub.authorization
      );
      challenge.authorization =
        await this.authorizationPolicyService.appendCredentialAuthorizationRule(
          challenge.authorization,
          {
            type: AuthorizationCredential.HUB_ADMIN,
            resourceID: hub.id,
          },
          [AuthorizationPrivilege.DELETE]
        );
    }

    return await this.hubRepository.save(hub);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    hubID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${hubID}`,
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

    const hubAdmin = new AuthorizationPolicyRuleCredential(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
      AuthorizationCredential.HUB_ADMIN,
      hubID
    );
    newRules.push(hubAdmin);

    const hubMember = new AuthorizationPolicyRuleCredential(
      [AuthorizationPrivilege.READ],
      AuthorizationCredential.HUB_MEMBER,
      hubID
    );
    newRules.push(hubMember);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
