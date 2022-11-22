import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
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
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>,
    communityPolicy: ICommunityPolicy
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
    baseChallenge.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        context,
        baseChallenge.authorization
      );

    const collaboration = await this.baseChallengeService.getCollaboration(
      baseChallenge.id,
      repository
    );
    baseChallenge.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        collaboration,
        baseChallenge.authorization,
        communityPolicy
      );

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
}
