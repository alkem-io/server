import { UpdateAuthorizationPolicyInput } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
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
    private authorizationPolicyService: AuthorizationPolicyService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    // propagate authorization rules for child entitie
    const community = await this.baseChallengeService.getCommunity(
      baseChallenge.id,
      repository
    );

    if (community.authorization) {
      baseChallenge.community =
        await this.communityAuthorizationService.applyAuthorizationPolicy(
          community,
          baseChallenge.authorization
        );
    }

    const tagset = baseChallenge.tagset;
    if (tagset) {
      tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          tagset.authorization,
          baseChallenge.authorization
        );
    }

    const context = await this.baseChallengeService.getContext(
      baseChallenge.id,
      repository
    );
    context.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        context.authorization,
        baseChallenge.authorization
      );
    baseChallenge.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(context);

    baseChallenge.agent = await this.baseChallengeService.getAgent(
      baseChallenge.id,
      repository
    );
    baseChallenge.agent.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        baseChallenge.agent.authorization,
        baseChallenge.authorization
      );

    return await repository.save(baseChallenge);
  }

  async updateAuthorization(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>,
    authorizationUpdateData: UpdateAuthorizationPolicyInput
  ): Promise<IBaseChallenge> {
    baseChallenge.authorization =
      this.authorizationPolicyService.updateAuthorization(
        baseChallenge.authorization,
        authorizationUpdateData
      );

    // propagate authorization rules for child entities
    baseChallenge.context = await this.baseChallengeService.getContext(
      baseChallenge.id,
      repository
    );
    baseChallenge.context.authorization =
      this.authorizationPolicyService.updateAuthorization(
        baseChallenge.context.authorization,
        authorizationUpdateData
      );

    return baseChallenge;
  }
}
