import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  CreateChallengeInput,
  DeleteChallengeInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { IContext } from '@domain/context/context';
import { NVP } from '@domain/common/nvp';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import {
  CreateOpportunityInput,
  IOpportunity,
} from '@domain/challenge/opportunity';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import {
  AuthorizationCredential,
  LogContext,
  ProfileType,
} from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunityService } from '@domain/community/community/community.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, IsNull, Not, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IOrganization } from '@domain/community/organization';
import { ICommunity } from '@domain/community/community';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { UUID_LENGTH } from '@common/constants';
import { IAgent } from '@domain/agent/agent';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IChallenge } from './challenge.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CommunityType } from '@common/enums/community.type';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { IPreferenceSet } from '@domain/common/preference-set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceType } from '@common/enums/preference.type';
import { CommunityRole } from '@common/enums/community.role';
import { challengeCommunityPolicy } from './challenge.community.policy';
import { challengeCommunityApplicationForm } from './challenge.community.application.form';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.create';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { challengeDefaultCallouts } from './challenge.default.callouts';
import { ChallengeDisplayLocation } from '@domain/challenge/space.defaults/definitions/challenge.display.location';
import { CommonDisplayLocation } from '@domain/challenge/space.defaults/definitions/common.display.location';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { IAccount } from '../account/account.interface';
@Injectable()
export class ChallengeService {
  constructor(
    private agentService: AgentService,
    private communityService: CommunityService,
    private opportunityService: OpportunityService,
    private baseChallengeService: BaseChallengeService,
    private organizationService: OrganizationService,
    private preferenceSetService: PreferenceSetService,
    private storageAggregatorService: StorageAggregatorService,
    private collaborationService: CollaborationService,
    private spaceDefaultsService: SpaceDefaultsService,
    private namingService: NamingService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createChallenge(
    challengeData: CreateChallengeInput,
    account: IAccount,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    if (!challengeData.nameID) {
      challengeData.nameID = this.namingService.createNameID(
        challengeData.profileData.displayName
      );
    }
    await this.baseChallengeService.isNameAvailableOrFail(
      challengeData.nameID,
      challengeData.spaceID
    );

    const challenge: IChallenge = Challenge.create(challengeData);
    challenge.account = account;

    challenge.opportunities = [];

    challenge.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        challengeData.storageAggregatorParent
      );

    await this.baseChallengeService.initialise(
      challenge,
      challengeData,
      challengeData.spaceID,
      CommunityType.CHALLENGE,
      challengeCommunityPolicy,
      challengeCommunityApplicationForm,
      ProfileType.CHALLENGE,
      challenge.storageAggregator,
      challengeData.collaborationData
    );

    await this.challengeRepository.save(challenge);

    // set immediate community parent + resourceID
    if (challenge.community) {
      challenge.community.parentID = challenge.id;
      challenge.community.policy =
        await this.communityService.updateCommunityPolicyResourceID(
          challenge.community,
          challenge.id
        );
    }

    challenge.preferenceSet =
      await this.preferenceSetService.createPreferenceSet(
        PreferenceDefinitionSet.CHALLENGE,
        this.createPreferenceDefaults()
      );

    if (!challenge.collaboration) {
      throw new EntityNotInitializedException(
        `Collaboration not initialized on Challenge: ${challenge.nameID}`,
        LogContext.CHALLENGES
      );
    }

    const locations = Object.values({
      ...CommonDisplayLocation,
      ...ChallengeDisplayLocation,
    });
    const tagsetTemplateData: CreateTagsetTemplateInput = {
      name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
      type: TagsetType.SELECT_ONE,
      allowedValues: locations,
      defaultSelectedValue: ChallengeDisplayLocation.CONTRIBUTE_RIGHT,
    };
    await this.collaborationService.addTagsetTemplate(
      challenge.collaboration,
      tagsetTemplateData
    );

    const savedChallenge = await this.challengeRepository.save(challenge);

    const stateTagset =
      savedChallenge.collaboration?.innovationFlow?.profile.tagsets?.find(
        t => t.tagsetTemplate?.name === TagsetReservedName.FLOW_STATE
      );
    if (!stateTagset) {
      throw new EntityNotInitializedException(
        `State tagset not found on InnovationFlow: ${challenge.nameID}`,
        LogContext.CHALLENGES
      );
    }

    // Finally create default callouts, using the defaults service to decide what to add
    const calloutInputsFromCollaborationTemplate =
      await this.collaborationService.createCalloutInputsFromCollaborationTemplate(
        challengeData.collaborationData?.collaborationTemplateID
      );
    const calloutInputs =
      await this.spaceDefaultsService.getCreateCalloutInputs(
        challengeDefaultCallouts,
        calloutInputsFromCollaborationTemplate,
        challengeData.collaborationData
      );
    challenge.collaboration =
      await this.collaborationService.addDefaultCallouts(
        challenge.collaboration,
        calloutInputs,
        challenge.storageAggregator,
        agentInfo?.userID
      );

    if (agentInfo && challenge.community) {
      await this.communityService.assignUserToRole(
        challenge.community,
        agentInfo.userID,
        CommunityRole.MEMBER
      );

      await this.communityService.assignUserToRole(
        challenge.community,
        agentInfo.userID,
        CommunityRole.LEAD
      );

      await this.communityService.assignUserToRole(
        challenge.community,
        agentInfo.userID,
        CommunityRole.ADMIN
      );
    }

    return savedChallenge;
  }

  async save(challenge: IChallenge): Promise<IChallenge> {
    return await this.challengeRepository.save(challenge);
  }

  async updateChallenge(
    challengeData: UpdateChallengeInput
  ): Promise<IChallenge> {
    const baseChallenge = await this.baseChallengeService.update(
      challengeData,
      this.challengeRepository
    );
    const challenge = await this.getChallengeOrFail(baseChallenge.id, {
      relations: {
        account: true,
      },
    });
    if (challengeData.nameID && challenge.account) {
      if (challengeData.nameID !== challenge.nameID) {
        // updating the nameID, check new value is allowed
        await this.baseChallengeService.isNameAvailableOrFail(
          challengeData.nameID,
          challenge.account.id
        );
        challenge.nameID = challengeData.nameID;
        await this.challengeRepository.save(challenge);
      }
    }
    return challenge;
  }

  async deleteChallenge(deleteData: DeleteChallengeInput): Promise<IChallenge> {
    const challengeID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeOrFail(challengeID, {
      relations: {
        opportunities: true,
        preferenceSet: {
          preferences: true,
        },
        profile: true,
        storageAggregator: true,
      },
    });

    if (challenge.opportunities && challenge.opportunities.length > 0)
      throw new OperationNotAllowedException(
        `Unable to remove challenge (${challenge.nameID}) as it contains ${challenge.opportunities.length} opportunities`,
        LogContext.CHALLENGES
      );

    // Remove any challenge lead credentials
    const challengeLeads = await this.getLeadOrganizations(challengeID);
    for (const challengeLead of challengeLeads) {
      const agentHostOrg = await this.organizationService.getAgent(
        challengeLead
      );
      challengeLead.agent = await this.agentService.revokeCredential({
        agentID: agentHostOrg.id,
        type: AuthorizationCredential.CHALLENGE_LEAD,
        resourceID: challengeID,
      });
      await this.organizationService.save(challengeLead);
    }

    if (challenge.preferenceSet) {
      await this.preferenceSetService.deletePreferenceSet(
        challenge.preferenceSet.id
      );
    }

    if (challenge.storageAggregator) {
      await this.storageAggregatorService.delete(
        challenge.storageAggregator.id
      );
    }

    await this.baseChallengeService.deleteEntities(
      challengeID,
      this.challengeRepository
    );

    const result = await this.challengeRepository.remove(
      challenge as Challenge
    );
    result.id = deleteData.ID;
    return result;
  }

  async getChallengeInNameableScope(
    challengeID: string,
    nameableScopeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge | null> {
    let challenge: IChallenge | null = null;
    if (challengeID.length == UUID_LENGTH) {
      challenge = await this.challengeRepository.findOne({
        where: {
          id: challengeID,
          account: {
            id: nameableScopeID,
          },
        },
        ...options,
      });
    }
    if (!challenge) {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne({
        where: {
          nameID: challengeID,
          account: {
            id: nameableScopeID,
          },
        },
        ...options,
      });
    }

    return challenge;
  }

  async getChallengeInNameableScopeOrFail(
    challengeID: string,
    nameableScopeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge | never> {
    const challenge = await this.getChallengeInNameableScope(
      challengeID,
      nameableScopeID,
      options
    );

    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    return challenge;
  }

  async getChallengeOrFail(
    challengeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge | never> {
    let challenge: IChallenge | null = null;
    if (challengeID.length == UUID_LENGTH) {
      challenge = await this.challengeRepository.findOne({
        where: { id: challengeID },
        ...options,
      });
    }
    if (!challenge) {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne({
        where: { nameID: challengeID },
        ...options,
      });
    }

    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    return challenge;
  }

  async getCommunity(challengeId: string): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      challengeId,
      this.challengeRepository
    );
  }

  async getProfile(challenge: IChallenge): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      challenge.id,
      this.challengeRepository
    );
  }

  async getCommunityPolicy(challengeId: string): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      challengeId,
      this.challengeRepository
    );
  }

  async getContext(challengeId: string): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      challengeId,
      this.challengeRepository
    );
  }

  public async getCollaboration(
    challenge: IChallenge
  ): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaborationOrFail(
      challenge.id,
      this.challengeRepository
    );
  }

  async getAgent(challengeId: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(
      challengeId,
      this.challengeRepository
    );
  }

  async getOpportunities(
    challengeId: string,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<IOpportunity[]> {
    const challenge = await this.getChallengeOrFail(challengeId, {
      relations: {
        opportunities: {
          profile: true,
        },
      },
    });

    const { IDs, limit, shuffle } = args ?? {};
    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load Opportunities for challenge ${challengeId} `,
        LogContext.COLLABORATION
      );
    this.logger.verbose?.(
      `Querying all Opportunities with limit: ${limit}, shuffle: ${shuffle} and in list: ${IDs}`,
      LogContext.CHALLENGES
    );

    const filteredOpportunities = IDs
      ? opportunities.filter(({ id }) => IDs.includes(id))
      : opportunities;

    const limitAndShuffled = limitAndShuffle(
      filteredOpportunities,
      limit,
      shuffle
    );

    // Sort the opportunities base on their display name
    const sortedOpportunities = limitAndShuffled.sort((a, b) =>
      a.profile.displayName.toLowerCase() > b.profile.displayName.toLowerCase()
        ? 1
        : -1
    );
    return sortedOpportunities;
  }

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    account: IAccount,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    this.logger.verbose?.(
      `Adding Opportunity to Challenge (${opportunityData.challengeID})`,
      LogContext.CHALLENGES
    );

    const challenge = await this.getChallengeOrFail(
      opportunityData.challengeID,
      {
        relations: {
          storageAggregator: true,
          opportunities: true,
          community: true,
        },
      }
    );

    if (!challenge.storageAggregator) {
      throw new EntityNotInitializedException(
        'Unable to find StorageAggregator for Challenge',
        LogContext.CHALLENGES
      );
    }

    await this.baseChallengeService.isNameAvailableOrFail(
      opportunityData.nameID,
      account.id
    );

    opportunityData.storageAggregatorParent = challenge.storageAggregator;
    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData,
      account,
      agentInfo
    );

    challenge.opportunities?.push(opportunity);

    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      opportunity.community,
      challenge.community
    );

    await this.challengeRepository.save(challenge);

    return opportunity;
  }

  public async getChallenges(
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge[]> {
    return this.challengeRepository.find(options);
  }

  async getChallengesInAccountCount(accountId: string): Promise<number> {
    const count = await this.challengeRepository.countBy({
      account: {
        id: accountId,
      },
      space: Not(IsNull()),
    });
    return count;
  }

  async getMembersCount(challenge: IChallenge): Promise<number> {
    const community = await this.getCommunity(challenge.id);
    return await this.communityService.getMembersCount(community);
  }

  async getMetrics(challenge: IChallenge): Promise<INVP[]> {
    const metrics: INVP[] = [];

    // Members
    const community = await this.getCommunity(challenge.id);
    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${challenge.id}`;
    metrics.push(membersTopic);

    // Opportunities
    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesInChallengeCount(
        challenge.id
      );
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = `opportunities-${challenge.id}`;
    metrics.push(opportunitiesTopic);

    // Posts
    const postsCount = await this.baseChallengeService.getPostsCount(
      challenge,
      this.challengeRepository
    );
    const postsTopic = new NVP('posts', postsCount.toString());
    postsTopic.id = `posts-${challenge.id}`;
    metrics.push(postsTopic);

    // Whiteboards
    const whiteboardsCount =
      await this.baseChallengeService.getWhiteboardsCount(
        challenge,
        this.challengeRepository
      );
    const whiteboardsTopic = new NVP(
      'whiteboards',
      whiteboardsCount.toString()
    );
    whiteboardsTopic.id = `whiteboards-${challenge.id}`;
    metrics.push(whiteboardsTopic);

    return metrics;
  }

  async getLeadOrganizations(challengeID: string): Promise<IOrganization[]> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.CHALLENGE_LEAD,
        resourceID: challengeID,
      });
    return organizations;
  }

  async getPreferenceSetOrFail(challengeId: string): Promise<IPreferenceSet> {
    const challengeWithPreferences = await this.getChallengeOrFail(
      challengeId,
      {
        relations: {
          preferenceSet: {
            preferences: true,
          },
        },
      }
    );
    const preferenceSet = challengeWithPreferences.preferenceSet;

    if (!preferenceSet) {
      throw new EntityNotFoundException(
        `Unable to find preferenceSet for challenge with nameID: ${challengeWithPreferences.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return preferenceSet;
  }

  async getStorageAggregatorOrFail(
    challengeId: string
  ): Promise<IStorageAggregator> {
    return await this.baseChallengeService.getStorageAggregator(
      challengeId,
      this.challengeRepository
    );
  }

  createPreferenceDefaults(): Map<PreferenceType, string> {
    const defaults: Map<PreferenceType, string> = new Map();
    defaults.set(
      PreferenceType.MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS,
      'true'
    );
    defaults.set(
      PreferenceType.MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS,
      'true'
    );
    defaults.set(
      PreferenceType.MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT,
      'false'
    );
    defaults.set(
      PreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      'false'
    );
    defaults.set(PreferenceType.ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE, 'true');
    defaults.set(PreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS, 'true');

    return defaults;
  }

  async getChallengeForCommunity(
    communityID: string
  ): Promise<IChallenge | null> {
    return await this.challengeRepository.findOne({
      relations: { community: true },
      where: {
        community: { id: communityID },
      },
    });
  }
}
