import { UpdateAuthorizationDefinitionInput } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseChallenge } from './base.challenge.entity';
import { IBaseChallenge } from './base.challenge.interface';
import { BaseChallengeService } from './base.challenge.service';

@Injectable()
export class BaseChallengeAuthorizationService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private authorizationDefinitionService: AuthorizationDefinitionService,
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
    // disable anonymous access for community
    if (community.authorization) {
      community.authorization.anonymousReadAccess = false;
      baseChallenge.community = await this.communityAuthorizationService.applyAuthorizationRules(
        community,
        baseChallenge.authorization
      );
    }

    const tagset = baseChallenge.tagset;
    if (tagset) {
      // Ensure always applying from a clean state
      tagset.authorization = await this.authorizationDefinitionService.reset(
        tagset.authorization
      );
      tagset.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
        tagset.authorization,
        baseChallenge.authorization
      );
    }

    const context = await this.baseChallengeService.getContext(
      baseChallenge.id,
      repository
    );
    context.authorization = await this.authorizationDefinitionService.reset(
      context.authorization
    );
    context.authorization = this.authorizationDefinitionService.inheritParentAuthorization(
      context.authorization,
      baseChallenge.authorization
    );
    baseChallenge.context = await this.contextAuthorizationService.applyAuthorizationRules(
      context
    );

    return await repository.save(baseChallenge);
  }

  async updateAuthorization(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>,
    authorizationUpdateData: UpdateAuthorizationDefinitionInput
  ): Promise<IBaseChallenge> {
    baseChallenge.authorization = this.authorizationDefinitionService.updateAuthorization(
      baseChallenge.authorization,
      authorizationUpdateData
    );

    // propagate authorization rules for child entities
    baseChallenge.context = await this.baseChallengeService.getContext(
      baseChallenge.id,
      repository
    );
    baseChallenge.context.authorization = this.authorizationDefinitionService.updateAuthorization(
      baseChallenge.context.authorization,
      authorizationUpdateData
    );

    return baseChallenge;
  }
}
