import { UpdateAuthorizationDefinitionInput } from '@domain/common/authorization-definition';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { Injectable } from '@nestjs/common';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { Repository } from 'typeorm';
import { BaseChallenge } from './base.challenge.entity';
import { IBaseChallenge } from './base.challenge.interface';
import { BaseChallengeService } from './base.challenge.service';

@Injectable()
export class BaseChallengeAuthorizationService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private authorizationEngine: AuthorizationEngineService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService
  ) {}

  async applyAuthorizationRules(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    // propagate authorization rules for child entitie
    const community = await this.baseChallengeService.getCommunity(
      baseChallenge.id,
      repository
    );
    community.authorization = this.authorizationEngine.inheritParentAuthorization(
      community.authorization,
      baseChallenge.authorization
    );
    // disable anonymous access for community
    community.authorization.anonymousReadAccess = false;
    baseChallenge.community = await this.communityAuthorizationService.applyAuthorizationRules(
      community
    );
    baseChallenge.community = await this.communityAuthorizationService.applyAuthorizationRules(
      community
    );

    const context = await this.baseChallengeService.getContext(
      baseChallenge.id,
      repository
    );
    context.authorization = this.authorizationEngine.inheritParentAuthorization(
      context.authorization,
      baseChallenge.authorization
    );
    baseChallenge.context = await this.contextAuthorizationService.applyAuthorizationRules(
      context
    );

    return baseChallenge;
  }

  async updateAuthorization(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>,
    authorizationUpdateData: UpdateAuthorizationDefinitionInput
  ): Promise<IBaseChallenge> {
    baseChallenge.authorization = this.authorizationEngine.updateAuthorization(
      baseChallenge.authorization,
      authorizationUpdateData
    );

    // propagate authorization rules for child entities
    baseChallenge.context = await this.baseChallengeService.getContext(
      baseChallenge.id,
      repository
    );
    baseChallenge.context.authorization = this.authorizationEngine.updateAuthorization(
      baseChallenge.context.authorization,
      authorizationUpdateData
    );

    return baseChallenge;
  }
}
