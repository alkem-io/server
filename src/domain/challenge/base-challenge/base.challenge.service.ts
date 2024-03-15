import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.update';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { IContext } from '@domain/context/context/context.interface';
import { ContextService } from '@domain/context/context/context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/base.challenge.dto.create';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IProfile } from '@domain/common/profile';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { IAccount } from '../account/account.interface';
import { SpaceType } from '@common/enums/space.type';

@Injectable()
export class BaseChallengeService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private contextService: ContextService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private namingService: NamingService,
    private profileService: ProfileService,
    private collaborationService: CollaborationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async initialise(
    baseChallenge: IBaseChallenge,
    baseChallengeData: CreateBaseChallengeInput,
    account: IAccount,
    spaceType: SpaceType,
    communityPolicy: ICommunityPolicyDefinition,
    applicationFormData: CreateFormInput,
    profileType: ProfileType,
    storageAggregator: IStorageAggregator,
    collaborationInput?: CreateCollaborationInput
  ) {
    baseChallenge.authorization = new AuthorizationPolicy();
    await this.isNameAvailableInAccountOrFail(
      baseChallengeData.nameID,
      account.id
    );

    baseChallenge.community = await this.communityService.createCommunity(
      baseChallengeData.profileData.displayName,
      account.spaceID,
      spaceType,
      communityPolicy,
      applicationFormData
    );

    if (!baseChallengeData.context) {
      baseChallenge.context = await this.contextService.createContext({});
    } else {
      baseChallenge.context = await this.contextService.createContext(
        baseChallengeData.context
      );
    }

    baseChallenge.profile = await this.profileService.createProfile(
      baseChallengeData.profileData,
      profileType,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(baseChallenge.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: baseChallengeData.tags,
    });
    // add the visuals
    await this.profileService.addVisualOnProfile(
      baseChallenge.profile,
      VisualType.AVATAR
    );
    await this.profileService.addVisualOnProfile(
      baseChallenge.profile,
      VisualType.BANNER
    );
    await this.profileService.addVisualOnProfile(
      baseChallenge.profile,
      VisualType.CARD
    );

    baseChallenge.collaboration =
      await this.collaborationService.createCollaboration(
        {
          ...collaborationInput,
        },
        storageAggregator,
        account,
        spaceType
      );

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
        relations: { context: true, community: true, profile: true },
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
    if (baseChallengeData.profileData) {
      baseChallenge.profile = await this.profileService.updateProfile(
        baseChallenge.profile,
        baseChallengeData.profileData
      );
    }

    return await repository.save(baseChallenge);
  }

  public async deleteEntities(
    baseChallengeID: string,
    repository: Repository<BaseChallenge>
  ) {
    const baseChallenge = await this.getBaseChallengeOrFail(
      baseChallengeID,
      repository,
      {
        relations: {
          collaboration: true,
          community: true,
          context: true,
          agent: true,
          profile: true,
        },
      }
    );
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

    if (baseChallenge.profile) {
      await this.profileService.deleteProfile(baseChallenge.profile.id);
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
  ): Promise<IBaseChallenge | never> {
    const challenge = await repository.findOne({
      where: { id: baseChallengeID },
      ...options,
    });
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find base challenge with ID: ${baseChallengeID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  public async isNameAvailableInAccountOrFail(
    nameID: string,
    accountID: string
  ) {
    if (
      !(await this.namingService.isNameIdAvailableInAccount(nameID, accountID))
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
        relations: { community: true },
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

  public async getContext(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IContext> {
    const challengeWithContext = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: {
          context: true,
        },
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

  public async getStorageAggregator(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IContext> {
    const challengeWithContext = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );
    const storageAggregator = challengeWithContext.storageAggregator;
    if (!storageAggregator)
      throw new RelationshipNotFoundException(
        `Unable to load storage aggregator for challenge ${challengeId} `,
        LogContext.CONTEXT
      );
    return storageAggregator;
  }

  public async getProfile(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IProfile> {
    const challengeWithProfile = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: { profile: true },
      }
    );
    const profile = challengeWithProfile.profile;
    if (!profile)
      throw new RelationshipNotFoundException(
        `Unable to load profile for challenge ${challengeId} `,
        LogContext.PROFILE
      );
    return profile;
  }

  public async getCollaborationOrFail(
    challengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<ICollaboration> | never {
    const challengeWithCollaboration = await this.getBaseChallengeOrFail(
      challengeId,
      repository,
      {
        relations: { collaboration: true },
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
        relations: { agent: true },
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

  public async getMembersCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const community = await this.getCommunity(baseChallenge.id, repository);
    return await this.communityService.getMembersCount(community);
  }

  public async getPostsCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const collaboration = await this.getCollaborationOrFail(
      baseChallenge.id,
      repository
    );

    return await this.collaborationService.getPostsCount(collaboration);
  }

  public async getWhiteboardsCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const collaboration = await this.getCollaborationOrFail(
      baseChallenge.id,
      repository
    );
    return await this.collaborationService.getWhiteboardsCount(collaboration);
  }

  public async getRelationsCount(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<number> {
    const collaboration = await this.getCollaborationOrFail(
      baseChallenge.id,
      repository
    );
    return await this.collaborationService.getRelationsCount(collaboration);
  }
}
