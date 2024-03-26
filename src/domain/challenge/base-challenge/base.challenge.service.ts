import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { UpdateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.update';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { IContext } from '@domain/context/context/context.interface';
import { ContextService } from '@domain/context/context/context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { CreateBaseChallengeInput } from '@domain/challenge/base-challenge/dto/base.challenge.dto.create';
import { IBaseChallenge } from '@domain/challenge/base-challenge/base.challenge.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IProfile } from '@domain/common/profile';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { IAccount } from '../account/account.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { AgentInfo } from '@core/authentication';
import { CommunityRole } from '@common/enums/community.role';
import { UpdateSpaceSettingsInput } from '../space.settings/dto/space.settings.dto.update';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';

@Injectable()
export class BaseChallengeService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private contextService: ContextService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private namingService: NamingService,
    private profileService: ProfileService,
    private spaceSettingsService: SpaceSettingsService,
    private spaceDefaultsService: SpaceDefaultsService,
    private storageAggregatorService: StorageAggregatorService,
    private collaborationService: CollaborationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async initialise(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>,
    baseChallengeData: CreateBaseChallengeInput,
    account: IAccount,
    agentInfo: AgentInfo | undefined
  ): Promise<IBaseChallenge> {
    baseChallenge.authorization = new AuthorizationPolicy();
    baseChallenge.account = account;
    baseChallenge.settingsStr = this.spaceSettingsService.serializeSettings(
      this.spaceDefaultsService.getDefaultSpaceSettings()
    );
    await this.isNameAvailableInAccountOrFail(
      baseChallengeData.nameID,
      account.id
    );

    const parentStorageAggregator = baseChallengeData.storageAggregatorParent;
    baseChallenge.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        parentStorageAggregator
      );

    if (!baseChallenge.storageAggregator) {
      throw new EntityNotInitializedException(
        `Entities not initialized on base challenge creation: ${baseChallenge.nameID}`,
        LogContext.CHALLENGES
      );
    }

    const communityPolicy = this.spaceDefaultsService.getCommunityPolicy(
      baseChallenge.type
    );
    const applicationFormData =
      this.spaceDefaultsService.getCommunityApplicationForm(baseChallenge.type);

    baseChallenge.community = await this.communityService.createCommunity(
      baseChallengeData.profileData.displayName,
      baseChallenge.type,
      communityPolicy,
      applicationFormData
    );

    if (!baseChallengeData.context) {
      baseChallengeData.context = {};
    }
    baseChallenge.context = await this.contextService.createContext(
      baseChallengeData.context
    );

    const profileType = this.spaceDefaultsService.getProfileType(
      baseChallenge.type
    );
    baseChallenge.profile = await this.profileService.createProfile(
      baseChallengeData.profileData,
      profileType,
      baseChallenge.storageAggregator
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

    //// Collaboration

    baseChallenge.collaboration =
      await this.collaborationService.createCollaboration(
        {
          ...baseChallengeData.collaborationData,
        },
        baseChallenge.storageAggregator,
        account,
        baseChallenge.type
      );

    const calloutGroupDefault =
      this.spaceDefaultsService.getCalloutGroupDefault(baseChallenge.type);
    await this.collaborationService.addCalloutGroupTagsetTemplate(
      baseChallenge.collaboration,
      calloutGroupDefault
    );

    const calloutInputsFromCollaborationTemplate =
      await this.collaborationService.createCalloutInputsFromCollaborationTemplate(
        baseChallengeData.collaborationData?.collaborationTemplateID
      );
    const defaultCallouts = this.spaceDefaultsService.getDefaultCallouts(
      baseChallenge.type
    );
    const calloutInputs =
      await this.spaceDefaultsService.getCreateCalloutInputs(
        defaultCallouts,
        calloutInputsFromCollaborationTemplate,
        baseChallengeData.collaborationData
      );
    baseChallenge.collaboration =
      await this.collaborationService.addDefaultCallouts(
        baseChallenge.collaboration,
        calloutInputs,
        baseChallenge.storageAggregator,
        agentInfo?.userID
      );

    /////////// Agents

    baseChallenge.agent = await this.agentService.createAgent({
      parentDisplayID: `${baseChallenge.nameID}`,
    });

    await this.save(baseChallenge, repository);

    ////// Community
    // set immediate community parent + resourceID
    baseChallenge.community.parentID = baseChallenge.id;
    baseChallenge.community.policy =
      await this.communityService.updateCommunityPolicyResourceID(
        baseChallenge.community,
        baseChallenge.id
      );

    const savedBaseChallenge = await this.save(baseChallenge, repository);
    await this.assignUserToRoles(savedBaseChallenge, agentInfo);
    return savedBaseChallenge;
  }

  private async assignUserToRoles(
    baseChallenge: IBaseChallenge,
    agentInfo: AgentInfo | undefined
  ) {
    // TODO: Hack to deal with initialization issues
    let spaceID = baseChallenge.id;
    if (baseChallenge.community && baseChallenge.community.type !== 'space') {
      spaceID = await this.communityService.getSpaceID(baseChallenge.community);
    }
    if (agentInfo && baseChallenge.community) {
      await this.communityService.assignUserToRole(
        spaceID,
        baseChallenge.community,
        agentInfo.userID,
        CommunityRole.MEMBER
      );

      await this.communityService.assignUserToRole(
        spaceID,
        baseChallenge.community,
        agentInfo.userID,
        CommunityRole.LEAD
      );

      await this.communityService.assignUserToRole(
        spaceID,
        baseChallenge.community,
        agentInfo.userID,
        CommunityRole.ADMIN
      );
    }
  }

  public async update(
    baseChallengeData: UpdateBaseChallengeInput,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
    const baseChallenge = await this.getBaseChallengeOrFail(
      baseChallengeData.ID,
      repository,
      {
        relations: {
          context: true,
          community: true,
          profile: true,
        },
      }
    );

    if (baseChallengeData.nameID) {
      if (baseChallengeData.nameID !== baseChallenge.nameID) {
        // updating the nameID, check new value is allowed
        await this.isNameAvailableInAccountOrFail(
          baseChallengeData.nameID,
          baseChallengeData.accountID
        );
        baseChallenge.nameID = baseChallengeData.nameID;
      }
    }

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

  public async save(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<IBaseChallenge> {
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
          storageAggregator: true,
        },
      }
    );

    if (
      !baseChallenge.collaboration ||
      !baseChallenge.community ||
      !baseChallenge.context ||
      !baseChallenge.agent ||
      !baseChallenge.profile ||
      !baseChallenge.storageAggregator ||
      !baseChallenge.authorization
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to delete base challenge: ${baseChallenge.id} `,
        LogContext.CHALLENGES
      );
    }

    await this.contextService.removeContext(baseChallenge.context.id);
    await this.collaborationService.deleteCollaboration(
      baseChallenge.collaboration.id
    );
    await this.communityService.removeCommunity(baseChallenge.community.id);
    await this.profileService.deleteProfile(baseChallenge.profile.id);
    await this.agentService.deleteAgent(baseChallenge.agent.id);
    await this.authorizationPolicyService.delete(baseChallenge.authorization);

    await this.storageAggregatorService.delete(
      baseChallenge.storageAggregator.id
    );
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

  public getSettings(baseChallenge: IBaseChallenge): ISpaceSettings {
    return this.spaceSettingsService.getSettings(baseChallenge.settingsStr);
  }

  public async setCommunityHierarchyForSubspace(
    parentCommunity: ICommunity,
    childCommunity: ICommunity | undefined
  ) {
    if (!childCommunity) {
      throw new RelationshipNotFoundException(
        `Unable to set subspace community relationship, child community not provied: ${parentCommunity.id}`,
        LogContext.CHALLENGES
      );
    }
    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      childCommunity,
      parentCommunity
    );
  }

  public async updateSettings(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>,
    settingsData: UpdateSpaceSettingsInput
  ): Promise<IBaseChallenge> {
    const settings = this.spaceSettingsService.getSettings(
      baseChallenge.settingsStr
    );
    const updatedSettings = this.spaceSettingsService.updateSettings(
      settings,
      settingsData
    );
    baseChallenge.settingsStr =
      this.spaceSettingsService.serializeSettings(updatedSettings);
    return await this.save(baseChallenge, repository);
  }

  public async getAccountOrFail(
    baseChallengeId: string,
    repository: Repository<BaseChallenge>
  ): Promise<IAccount> {
    const baseChallenge = await repository.findOne({
      where: { id: baseChallengeId },
      relations: {
        account: true,
      },
    });

    if (!baseChallenge) {
      throw new EntityNotFoundException(
        `Unable to find base challenge with ID: ${baseChallengeId}`,
        LogContext.CHALLENGES
      );
    }

    return baseChallenge.account;
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

  async getMetrics(
    baseChallenge: IBaseChallenge,
    repository: Repository<BaseChallenge>
  ): Promise<INVP[]> {
    const metrics: INVP[] = [];
    const community = await this.getCommunity(baseChallenge.id, repository);

    // Members
    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${baseChallenge.id}`;
    metrics.push(membersTopic);

    // Posts
    const postsCount = await this.getPostsCount(baseChallenge, repository);
    const postsTopic = new NVP('posts', postsCount.toString());
    postsTopic.id = `posts-${baseChallenge.id}`;
    metrics.push(postsTopic);

    // Whiteboards
    const whiteboardsCount = await this.getWhiteboardsCount(
      baseChallenge,
      repository
    );
    const whiteboardsTopic = new NVP(
      'whiteboards',
      whiteboardsCount.toString()
    );
    whiteboardsTopic.id = `whiteboards-${baseChallenge.id}`;
    metrics.push(whiteboardsTopic);

    return metrics;
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
