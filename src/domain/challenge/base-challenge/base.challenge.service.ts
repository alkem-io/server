import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { IContext } from '@domain/context/context/context.interface';
import { ContextService } from '@domain/context/context/context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { CommunityType } from '@common/enums/community.type';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CommunityRole } from '@common/enums/community.role';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';

@Injectable()
export class BaseChallengeService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private contextService: ContextService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private namingService: NamingService,
    private tagsetService: TagsetService,
    private lifecycleService: LifecycleService,
    private collaborationService: CollaborationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async initialise(
    baseChallenge: IBaseChallenge,
    baseChallengeData: CreateBaseChallengeInput,
    hubID: string,
    communityType: CommunityType,
    communityPolicy: ICommunityPolicyDefinition
  ) {
    baseChallenge.authorization = new AuthorizationPolicy();
    await this.isNameAvailableOrFail(baseChallengeData.nameID, hubID);

    baseChallenge.community = await this.communityService.createCommunity(
      baseChallenge.displayName,
      hubID,
      communityType,
      communityPolicy
    );

    if (!baseChallengeData.context) {
      baseChallenge.context = await this.contextService.createContext({});
    } else {
      baseChallenge.context = await this.contextService.createContext(
        baseChallengeData.context
      );
    }
    const communicationGroupID =
      baseChallenge.community?.communication?.communicationGroupID || '';

    baseChallenge.collaboration =
      await this.collaborationService.createCollaboration(
        communityType,
        communicationGroupID
      );

    baseChallenge.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: baseChallengeData.tags || [],
    });

    baseChallenge.agent = await this.agentService.createAgent({
      parentDisplayID: `${baseChallenge.nameID}`,
    });
  }

  public async update(
    baseChallengeData: UpdateBaseChallengeInput,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const baseChallenge = await this.getBaseChallengeOrFail(
      baseChallengeData.ID,
      repository,
      {
        relations: ['context', 'community'],
      }
    );

    if (baseChallengeData.context) {
      if (!baseChallenge.context)
        throw new EntityNotInitializedException(
          `Challenge not initialised: ${baseChallengeData.ID}`,
          LogContext.CHALLENGES
        );
      baseChallenge.context = await this.contextService.updateContext(
        baseChallenge.context,
        baseChallengeData.context
      );
    }
    if (baseChallengeData.tags)
      this.tagsetService.replaceTagsOnEntity(
        baseChallenge as BaseChallenge,
        baseChallengeData.tags
      );

    if (
      baseChallengeData.displayName &&
      baseChallenge.displayName !== baseChallengeData.displayName
    ) {
      if (baseChallenge.community) {
        // will be retrieved; see relations above
        baseChallenge.community.displayName = baseChallengeData.displayName;
      }
      baseChallenge.displayName = baseChallengeData.displayName;
    }

    return await repository.save(baseChallenge);
  }

  public async deleteEntities(baseChallenge: IBaseChallenge) {
    if (baseChallenge.context) {
      await this.contextService.removeContext(baseChallenge.context.id);
    }

    if (baseChallenge.collaboration) {
      await this.collaborationService.deleteCollaboration(
        baseChallenge.collaboration.id
      );
    }

    const community = baseChallenge.community;
    if (community) {
      await this.communityService.removeCommunity(community.id);
    }

    if (baseChallenge.lifecycle) {
      await this.lifecycleService.deleteLifecycle(baseChallenge.lifecycle.id);
    }

    if (baseChallenge.tagset) {
      await this.tagsetService.removeTagset({
        ID: baseChallenge.tagset.id,
      });
    }

    if (baseChallenge.agent) {
      await this.agentService.deleteAgent(baseChallenge.agent.id);
    }

    if (baseChallenge.authorization) {
      await this.authorizationPolicyService.delete(baseChallenge.authorization);
    }
  }

  public async getBaseChallengeOrFail(
    baseChallengeID: string,
    repository: Repository<BaseChallenge>,
    options?: FindOneOptions<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const conditions: FindConditions<BaseChallenge> = {
      id: baseChallengeID,
    };

    const challenge = await repository.findOne(conditions, options);
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find base challenge with ID: ${baseChallengeID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  public async isNameAvailableOrFail(nameID: string, nameableScopeID: string) {
    if (
      !(await this.namingService.isNameIdAvailableInHub(
        nameID,
        nameableScopeID
      ))
    )
      throw new ValidationException(
        `Unable to create entity: the provided nameID is already taken: ${nameID}`,
        LogContext.CHALLENGES
      );
  }

  public async getCommunity(
    baseChallengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ICommunity> {
    const challengeWithCommunity = await this.getBaseChallengeOrFail(
      baseChallengeId,
      repository,
      {
        relations: ['community'],
      }
    );
    const community = challengeWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for challenge ${baseChallengeId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  public async getCommunityPolicy(
    baseChallengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ICommunityPolicy> {
    const community = await this.getCommunity(baseChallengeId, repository);
    return this.communityService.getCommunityPolicy(community);
  }

  public async getCommunityLeadershipCredential(
    baseChallengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<CredentialDefinition> {
    const community = await this.getCommunity(baseChallengeId, repository);
    return this.communityService.getCredentialDefinitionForRole(
      community,
      CommunityRole.LEAD
    );
  }

  public async getContext(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IContext> {
    const challengeWithContext = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: ['context'],
      }
    );
    const context = challengeWithContext.context;
    if (!context)
      throw new RelationshipNotFoundException(
        `Unable to load context for challenge ${challengeId} `,
        LogContext.CONTEXT
      );
    return context;
  }

  public async getCollaboration(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ICollaboration> {
    const challengeWithCollaboration = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: ['collaboration'],
      }
    );
    const collaboration = challengeWithCollaboration.collaboration;
    if (!collaboration)
      throw new RelationshipNotFoundException(
        `Unable to load collaboration for challenge ${challengeId} `,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  public async getAgent(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IAgent> {
    const challengeWithContext = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: ['agent'],
      }
    );
    const agent = challengeWithContext.agent;
    if (!agent)
      throw new RelationshipNotFoundException(
        `Unable to load Agent for challenge ${challengeId}`,
        LogContext.AGENT
      );
    return agent;
  }

  public async getLifecycle(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ILifecycle> {
    const challenge = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: ['lifecycle'],
      }
    );

    if (!challenge.lifecycle) {
      throw new RelationshipNotFoundException(
        `Unable to load Lifecycle for challenge ${challengeId} `,
        LogContext.CHALLENGES
      );
    }

    return challenge.lifecycle;
  }

  public async getMembersCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const community = await this.getCommunity(baseChallenge.id, repository);
    return await this.communityService.getMembersCount(community);
  }

  public async getAspectsCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const collaboration = await this.getCollaboration(
      baseChallenge.id,
      repository
    );

    return await this.collaborationService.getAspectsCount(collaboration);
  }

  public async getCanvasesCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const collaboration = await this.getCollaboration(
      baseChallenge.id,
      repository
    );
    return await this.collaborationService.getCanvasesCount(collaboration);
  }

  public async getRelationsCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const collaboration = await this.getCollaboration(
      baseChallenge.id,
      repository
    );
    return await this.collaborationService.getRelationsCount(collaboration);
  }
}
