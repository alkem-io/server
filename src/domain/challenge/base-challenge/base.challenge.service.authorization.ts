import { Injectable } from '@nestjs/common';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { IBaseChallenge } from './base.challenge.interface';

@Injectable()
export class BaseChallengeAuthorizationService {
  constructor(private authorizationEngine: AuthorizationEngineService) {}

  async applyAuthorizationRules(
    baseChallenge: IBaseChallenge
  ): Promise<IBaseChallenge> {
    // propagate authorization rules for child entitie
    const community = baseChallenge.community;
    if (community) {
      community.authorization = this.authorizationEngine.inheritParentAuthorization(
        community.authorization,
        baseChallenge.authorization
      );

      // disable anonymous access for community
      community.authorization.anonymousReadAccess = false;
    }

    const context = baseChallenge.context;
    if (context) {
      context.authorization = this.authorizationEngine.setAnonymousAccess(
        context.authorization,
        true
      );
      context.authorization = this.authorizationEngine.inheritParentAuthorization(
        context.authorization,
        baseChallenge.authorization
      );
    }

    return baseChallenge;
  }
}
