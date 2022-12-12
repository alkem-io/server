import { UUID_LENGTH } from '@common/constants';
import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import {
  CreateHubInput,
  DeleteHubInput,
  hubCommunityPolicy,
} from '@domain/challenge/hub';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IProject } from '@domain/collaboration/project/project.interface';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { INVP, NVP } from '@domain/common/nvp';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { ICommunity } from '@domain/community/community';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { IUserGroup } from '@domain/community/user-group';
import { IContext } from '@domain/context/context';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { challengeLifecycleConfigDefault } from '@domain/template/templates-set/templates.set.default.lifecycle.challenge';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, In, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Hub } from './hub.entity';
import { IHub } from './hub.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AssignHubAdminInput } from './dto/hub.dto.assign.admin';
import { IUser } from '@domain/community/user/user.interface';
import { RemoveHubAdminInput } from './dto/hub.dto.remove.admin';
import { UserService } from '@domain/community/user/user.service';
import { UpdateHubInput } from './dto/hub.dto.update';
import { CreateChallengeOnHubInput } from '../challenge/dto/challenge.dto.create.in.hub';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityType } from '@common/enums/community.type';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { IPreferenceSet } from '@domain/common/preference-set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { PreferenceType } from '@common/enums/preference.type';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ILifecycleTemplate } from '@domain/template/lifecycle-template/lifecycle.template.interface';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { UpdateHubVisibilityInput } from './dto/hub.dto.update.visibility';
import { HubsQueryArgs } from './dto/hub.args.query.hubs';
import { HubVisibility } from '@common/enums/hub.visibility';
import { HubFilterService } from '@services/infrastructure/hub-filter/hub.filter.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';

@Injectable()
export class HubService {
  constructor(
    private agentService: AgentService,
    private organizationService: OrganizationService,
    private lifecycleService: LifecycleService,
    private projectService: ProjectService,
    private opportunityService: OpportunityService,
    private baseChallengeService: BaseChallengeService,
    private namingService: NamingService,
    private userService: UserService,
    private communityService: CommunityService,
    private challengeService: ChallengeService,
    private preferenceSetService: PreferenceSetService,
    private hubsFilterService: HubFilterService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createHub(
    hubData: CreateHubInput,
    agentInfo?: AgentInfo
  ): Promise<IHub> {
    await this.validateHubData(hubData);
    const hub: IHub = Hub.create(hubData);
    // default to active hub
    hub.visibility = HubVisibility.ACTIVE;

    // remove context before saving as want to control that creation
    hub.context = undefined;
    await this.hubRepository.save(hub);
    await this.baseChallengeService.initialise(
      hub,
      hubData,
      hub.id,
      CommunityType.HUB,
      hubCommunityPolicy
    );

    // set immediate community parent and  community policy
    if (hub.community) {
      hub.community.parentID = hub.id;
      hub.community.policy =
        await this.communityService.updateCommunityPolicyResourceID(
          hub.community,
          hub.id
        );
    }
    hub.preferenceSet = await this.preferenceSetService.createPreferenceSet(
      PreferenceDefinitionSet.HUB,
      this.createPreferenceDefaults()
    );

    hub.templatesSet = await this.templatesSetService.createTemplatesSet(
      {
        minInnovationFlow: 1,
      },
      true
    );

    // Lifecycle

    const machineConfig: any = challengeLifecycleConfigDefault;
    hub.lifecycle = await this.lifecycleService.createLifecycle(
      hub.id,
      machineConfig
    );

    // save before assigning host in case that fails
    const savedHub = await this.hubRepository.save(hub);

    await this.setHubHost(hub.id, hubData.hostID);

    if (agentInfo) {
      await this.assignMember(agentInfo.userID, hub.id);

      await this.assignHubAdmin({
        hubID: hub.id,
        userID: agentInfo.userID,
      });
    }

    return savedHub;
  }

  createPreferenceDefaults(): Map<PreferenceType, string> {
    const defaults: Map<PreferenceType, string> = new Map();
    defaults.set(PreferenceType.MEMBERSHIP_APPLICATIONS_FROM_ANYONE, 'true');
    defaults.set(PreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS, 'false');
    defaults.set(PreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES, 'false');

    return defaults;
  }

  async validateHubData(hubData: CreateHubInput) {
    if (!(await this.isNameIdAvailable(hubData.nameID)))
      throw new ValidationException(
        `Unable to create Hub: the provided nameID is already taken: ${hubData.nameID}`,
        LogContext.CHALLENGES
      );
  }

  async save(hub: IHub): Promise<IHub> {
    return await this.hubRepository.save(hub);
  }

  async update(hubData: UpdateHubInput): Promise<IHub> {
    const hub: IHub = await this.baseChallengeService.update(
      hubData,
      this.hubRepository
    );

    if (hubData.nameID) {
      if (hubData.nameID !== hub.nameID) {
        // updating the nameID, check new value is allowed
        const updateAllowed = await this.isNameIdAvailable(hubData.nameID);
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update Hub nameID: the provided nameID is already taken: ${hubData.nameID}`,
            LogContext.CHALLENGES
          );
        }
        hub.nameID = hubData.nameID;
      }
    }

    if (hubData.hostID) {
      await this.setHubHost(hub.id, hubData.hostID);
    }

    return await this.hubRepository.save(hub);
  }

  public async updateHubVisibility(
    visibilityData: UpdateHubVisibilityInput
  ): Promise<IHub> {
    const hub = await this.getHubOrFail(visibilityData.hubID);

    hub.visibility = visibilityData.visibility;

    return await this.save(hub);
  }

  async deleteHub(deleteData: DeleteHubInput): Promise<IHub> {
    const hub = await this.getHubOrFail(deleteData.ID, {
      relations: ['challenges', 'preferenceSet', 'templatesSet'],
    });

    // Do not remove an hub that has child challenges , require these to be individually first removed
    if (hub.challenges && hub.challenges.length > 0)
      throw new ValidationException(
        `Unable to remove Hub (${hub.nameID}) as it contains ${hub.challenges.length} challenges`,
        LogContext.CHALLENGES
      );

    await this.baseChallengeService.deleteEntities(hub.id, this.hubRepository);

    // Remove any host credentials
    const hostOrg = await this.getHost(hub.id);
    if (hostOrg) {
      const agentHostOrg = await this.organizationService.getAgent(hostOrg);
      hostOrg.agent = await this.agentService.revokeCredential({
        agentID: agentHostOrg.id,
        type: AuthorizationCredential.HUB_HOST,
        resourceID: hub.id,
      });
      await this.organizationService.save(hostOrg);
    }

    if (hub.preferenceSet) {
      await this.preferenceSetService.deletePreferenceSet(hub.preferenceSet.id);
    }

    if (hub.templatesSet) {
      await this.templatesSetService.deleteTemplatesSet(hub.templatesSet.id);
    }

    const result = await this.hubRepository.remove(hub as Hub);
    result.id = deleteData.ID;
    return result;
  }

  getVisibility(hub: IHub): HubVisibility {
    if (!hub.visibility) {
      throw new EntityNotInitializedException(
        `HubVisibility not found for Hub: ${hub.id}`,
        LogContext.CHALLENGES
      );
    }
    return hub.visibility;
  }

  async getHubs(args: HubsQueryArgs): Promise<IHub[]> {
    const visibilities = this.hubsFilterService.getAllowedVisibilities(
      args.filter
    );
    // Load the hubs
    let hubs: IHub[];
    if (args && args.IDs)
      hubs = await this.hubRepository.find({
        where: { id: In(args.IDs) },
      });
    else hubs = await this.hubRepository.find();

    if (hubs.length === 0) return [];

    // Get the order to return the data in
    const sortedIDs = await this.getFilteredHubsSortOrderDefault(
      visibilities,
      hubs.flatMap(x => x.id)
    );
    const hubsResult: IHub[] = [];
    for (const hubID of sortedIDs) {
      const hub = hubs.find(hub => hub.id === hubID);
      if (hub) {
        hubsResult.push(hub);
      } else {
        this.logger.error(
          'Invalid state error when sorting Hubs!',
          LogContext.CHALLENGES
        );
      }
    }
    return hubsResult;
  }

  private async getFilteredHubsSortOrderDefault(
    allowedVisibilities: HubVisibility[],
    IDs?: string[]
  ): Promise<string[]> {
    // Then load data to do the sorting
    const hubsDataForSorting = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.challenges', 'challenge')
      .leftJoinAndSelect('hub.authorization', 'authorization_policy')
      .leftJoinAndSelect('challenge.opportunities', 'opportunities')
      .whereInIds(IDs)
      .getMany();

    const visibleHubs = hubsDataForSorting.filter(hub => {
      return this.hubsFilterService.isVisible(
        hub.visibility,
        allowedVisibilities
      );
    });

    const sortedHubs = visibleHubs.sort((a, b) => {
      if (
        a.authorization?.anonymousReadAccess === true &&
        b.authorization?.anonymousReadAccess === false
      )
        return -1;
      if (
        a.authorization?.anonymousReadAccess === false &&
        b.authorization?.anonymousReadAccess === true
      )
        return 1;

      if (!a.challenges && b.challenges) return 1;
      if (a.challenges && !b.challenges) return -1;
      if (!a.challenges && !b.challenges) return 0;

      // Shouldn't get there
      if (!a.challenges || !b.challenges)
        throw new ValidationException(
          `Critical error when comparing Hubs! Critical error when loading Challenges for Hub ${a} and Hub ${b}`,
          LogContext.CHALLENGES
        );

      const oppChallCountA = this.getChallengeAndOpportunitiesCount(
        a?.challenges
      );
      const oppChallCountB = this.getChallengeAndOpportunitiesCount(
        b?.challenges
      );

      if (oppChallCountA > oppChallCountB) return -1;
      if (oppChallCountA < oppChallCountB) return 1;

      return 0;
    });

    const sortedIDs: string[] = [];
    for (const hub of sortedHubs) {
      sortedIDs.push(hub.id);
    }
    return sortedIDs;
  }

  private getChallengeAndOpportunitiesCount(challenges: IChallenge[]): number {
    let challengeAndOpportunitiesCount = 0;
    for (const challenge of challenges) {
      challengeAndOpportunitiesCount++;

      if (challenge.opportunities)
        challengeAndOpportunitiesCount += challenge.opportunities.length;
    }
    return challengeAndOpportunitiesCount;
  }

  async getHubOrFail(
    hubID: string,
    options?: FindOneOptions<Hub>
  ): Promise<IHub> {
    let hub: IHub | undefined;
    if (hubID.length === UUID_LENGTH) {
      hub = await this.hubRepository.findOne({ id: hubID }, options);
    }
    if (!hub) {
      // look up based on nameID
      hub = await this.hubRepository.findOne({ nameID: hubID }, options);
    }
    if (!hub)
      throw new EntityNotFoundException(
        `Unable to find Hub with ID: ${hubID}`,
        LogContext.CHALLENGES
      );
    return hub;
  }

  async getTemplatesSetOrFail(hubId: string): Promise<ITemplatesSet> {
    const hubWithTemplates = await this.getHubOrFail(hubId, {
      relations: ['templatesSet'],
    });
    const templatesSet = hubWithTemplates.templatesSet;

    if (!templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for hub with nameID: ${hubWithTemplates.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return templatesSet;
  }

  async getPreferenceSetOrFail(hubId: string): Promise<IPreferenceSet> {
    const hubWithPreferences = await this.getHubOrFail(hubId, {
      relations: ['preferenceSet'],
    });
    const preferenceSet = hubWithPreferences.preferenceSet;

    if (!preferenceSet) {
      throw new EntityNotFoundException(
        `Unable to find preferenceSet for hub with nameID: ${hubWithPreferences.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return preferenceSet;
  }

  async setHubHost(hubID: string, hostOrgID: string): Promise<IHub> {
    const organization = await this.organizationService.getOrganizationOrFail(
      hostOrgID,
      { relations: ['groups', 'agent'] }
    );

    const existingHost = await this.getHost(hubID);

    if (existingHost) {
      const agentExisting = await this.organizationService.getAgent(
        existingHost
      );
      organization.agent = await this.agentService.revokeCredential({
        agentID: agentExisting.id,
        type: AuthorizationCredential.HUB_HOST,
        resourceID: hubID,
      });
    }

    // assign the credential
    const agent = await this.organizationService.getAgent(organization);
    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.HUB_HOST,
      resourceID: hubID,
    });

    await this.organizationService.save(organization);
    return await this.getHubOrFail(hubID);
  }

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const challengeCount = await this.hubRepository.count({
      nameID: nameID,
    });
    if (challengeCount != 0) return false;

    // check restricted hub names
    const restrictedHubNames = ['user', 'organization'];
    if (restrictedHubNames.includes(nameID.toLowerCase())) return false;

    return true;
  }

  async getChallenges(
    hub: IHub,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<IChallenge[]> {
    let hubWithChallenges;
    if (args && args.IDs) {
      {
        hubWithChallenges = await this.getHubOrFail(hub.id, {
          relations: ['challenges'],
        });
        hubWithChallenges.challenges = hubWithChallenges.challenges?.filter(c =>
          args.IDs?.includes(c.id)
        );
      }
    } else
      hubWithChallenges = await this.getHubOrFail(hub.id, {
        relations: ['challenges'],
      });

    const challenges = hubWithChallenges.challenges;
    if (!challenges) {
      throw new RelationshipNotFoundException(
        `Unable to load challenges for Hub ${hub.id} `,
        LogContext.CHALLENGES
      );
    }

    const limitAndShuffled = limitAndShuffle(
      challenges,
      args?.limit,
      args?.shuffle
    );

    // Sort the challenges base on their display name
    const sortedChallenges = limitAndShuffled.sort((a, b) =>
      a.displayName > b.displayName ? 1 : -1
    );
    return sortedChallenges;
  }

  async getGroups(hub: IHub): Promise<IUserGroup[]> {
    const community = await this.getCommunity(hub);
    return await this.communityService.getUserGroups(community);
  }

  async getOpportunitiesInNameableScope(
    hub: IHub,
    IDs?: string[]
  ): Promise<IOpportunity[]> {
    return await this.opportunityService.getOpportunitiesInNameableScope(
      hub.id,
      IDs
    );
  }

  async getOpportunityInNameableScope(
    opportunityID: string,
    hub: IHub
  ): Promise<IOpportunity> {
    return await this.opportunityService.getOpportunityInNameableScopeOrFail(
      opportunityID,
      hub.id
    );
  }

  async getChallengeInNameableScope(
    challengeID: string,
    hub: IHub
  ): Promise<IChallenge> {
    return await this.challengeService.getChallengeInNameableScopeOrFail(
      challengeID,
      hub.id
    );
  }

  async getProjectInNameableScope(
    projectID: string,
    hub: IHub
  ): Promise<IProject> {
    return await this.projectService.getProjectInNameableScopeOrFail(
      projectID,
      hub.id
    );
  }

  async getCommunity(hub: IHub): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      hub.id,
      this.hubRepository
    );
  }

  async getCommunityPolicy(hub: IHub): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      hub.id,
      this.hubRepository
    );
  }

  async getContext(hub: IHub): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      hub.id,
      this.hubRepository
    );
  }

  public async getCollaboration(hub: IHub): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaboration(
      hub.id,
      this.hubRepository
    );
  }

  async getLifecycle(hub: IHub): Promise<ILifecycle> {
    return await this.baseChallengeService.getLifecycle(
      hub.id,
      this.hubRepository
    );
  }

  async getDefaultInnovationFlowTemplate(
    hubId: string,
    lifecycleType: LifecycleType
  ): Promise<ILifecycleTemplate> {
    const hub = await this.getHubOrFail(hubId, {
      relations: ['templateSet'],
    });

    if (!hub.templatesSet)
      throw new EntityNotInitializedException(
        `Templates set for hub: ${hubId} not initialized`,
        LogContext.CHALLENGES
      );

    const allInnovationFlowTemplates =
      await this.templatesSetService.getInnovationFlowTemplates(
        hub.templatesSet
      );

    const selectableInnovationFlowTemplates = allInnovationFlowTemplates.filter(
      x => x.type === lifecycleType
    );

    if (selectableInnovationFlowTemplates.length === 0)
      throw new ValidationException(
        `Could not find default innovation flow template of type ${lifecycleType} in hub ${hubId}`,
        LogContext.CHALLENGES
      );

    return selectableInnovationFlowTemplates[0];
  }

  async validateChallengeNameIdOrFail(proposedNameID: string, hubID: string) {
    const nameAvailable = await this.namingService.isNameIdAvailableInHub(
      proposedNameID,
      hubID
    );
    if (!nameAvailable)
      throw new ValidationException(
        `Unable to create Challenge: the provided nameID is already taken: ${proposedNameID}`,
        LogContext.CHALLENGES
      );
  }

  async createChallengeInHub(
    challengeData: CreateChallengeOnHubInput,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    const hub = await this.getHubOrFail(challengeData.hubID);
    await this.validateChallengeNameIdOrFail(challengeData.nameID, hub.id);

    // Update the challenge data being passed in to state set the parent ID to the contained challenge
    const newChallenge = await this.challengeService.createChallenge(
      challengeData,
      hub.id,
      agentInfo
    );

    return await this.addChallengeToHub(hub.id, newChallenge);
  }

  async addChallengeToHub(
    hubID: string,
    challenge: IChallenge
  ): Promise<IChallenge> {
    const hub = await this.getHubOrFail(hubID, {
      relations: ['challenges', 'community'],
    });
    if (!hub.challenges)
      throw new ValidationException(
        `Unable to create Challenge: challenges not initialized: ${hubID}`,
        LogContext.CHALLENGES
      );

    hub.challenges.push(challenge);
    // Finally set the community relationship
    challenge.community = await this.communityService.setParentCommunity(
      challenge.community,
      hub.community
    );

    await this.hubRepository.save(hub);
    return challenge;
  }

  async getChallenge(challengeID: string, hub: IHub): Promise<IChallenge> {
    return await this.challengeService.getChallengeInNameableScopeOrFail(
      challengeID,
      hub.id
    );
  }

  async getCommunityInNameableScope(
    communityID: string,
    hub: IHub
  ): Promise<ICommunity> {
    return await this.communityService.getCommunityInNameableScopeOrFail(
      communityID,
      hub.id
    );
  }

  async getProjects(hub: IHub): Promise<IProject[]> {
    return await this.projectService.getProjects(hub.id);
  }

  async getMetrics(hub: IHub): Promise<INVP[]> {
    const metrics: INVP[] = [];

    // Challenges
    const challengesCount = await this.challengeService.getChallengesInHubCount(
      hub.id
    );
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = `challenges-${hub.id}`;
    metrics.push(challengesTopic);

    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesInHubCount(hub.id);
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = `opportunities-${hub.id}`;
    metrics.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsInHubCount(
      hub.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${hub.id}`;
    metrics.push(projectsTopic);

    // Members
    const membersCount = await this.getMembersCount(hub);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${hub.id}`;
    metrics.push(membersTopic);

    // Aspects
    const aspectsCount = await this.baseChallengeService.getAspectsCount(
      hub,
      this.hubRepository
    );
    const aspectsTopic = new NVP('aspects', aspectsCount.toString());
    aspectsTopic.id = `aspects-${hub.id}`;
    metrics.push(aspectsTopic);

    // Canvases
    const canvasesCount = await this.baseChallengeService.getCanvasesCount(
      hub,
      this.hubRepository
    );
    const canvasesTopic = new NVP('canvases', canvasesCount.toString());
    canvasesTopic.id = `canvases-${hub.id}`;
    metrics.push(canvasesTopic);

    return metrics;
  }

  async getChallengesCount(hubID: string): Promise<number> {
    return await this.challengeService.getChallengesInHubCount(hubID);
  }

  async getAgent(hubID: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(hubID, this.hubRepository);
  }

  async getMembersCount(hub: IHub): Promise<number> {
    return await this.baseChallengeService.getMembersCount(
      hub,
      this.hubRepository
    );
  }

  async getHubCount(visibility = HubVisibility.ACTIVE): Promise<number> {
    return await this.hubRepository.count({
      where: { visibility: visibility },
    });
  }

  async getHost(hubID: string): Promise<IOrganization | undefined> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.HUB_HOST,
        resourceID: hubID,
      });
    if (organizations.length == 0) {
      return undefined;
    }
    if (organizations.length > 1) {
      throw new RelationshipNotFoundException(
        `More than one host for Hub ${hubID} `,
        LogContext.CHALLENGES
      );
    }
    return organizations[0];
  }

  async assignMember(userID: string, hubId: string) {
    const agent = await this.userService.getAgent(userID);
    const hub = await this.getHubOrFail(hubId);

    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.HUB_MEMBER,
      resourceID: hub.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async assignHubAdmin(assignData: AssignHubAdminInput): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const hub = await this.getHubOrFail(assignData.hubID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.HUB_ADMIN,
      resourceID: hub.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeHubAdmin(removeData: RemoveHubAdminInput): Promise<IUser> {
    const hubID = removeData.hubID;
    const hub = await this.getHubOrFail(hubID);
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.HUB_ADMIN,
      resourceID: hub.id,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async getPreferences(hub: IHub): Promise<IPreference[]> {
    const preferenceSet = await this.getPreferenceSetOrFail(hub.id);

    const preferences = preferenceSet.preferences;

    if (!preferences) {
      throw new EntityNotInitializedException(
        `Hub preferences not initialized: ${hub.id}`,
        LogContext.CHALLENGES
      );
    }

    return preferences;
  }
}
