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
import { IOpportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IProject } from '@domain/collaboration/project';
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
import { NamingService } from '@src/services/domain/naming/naming.service';
import { challengeLifecycleConfigDefault } from '@domain/challenge/challenge/challenge.lifecycle.config.default';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
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
import { AgentInfo } from '@src/core';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { IPreferenceSet } from '@domain/common/preference-set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { PreferenceType } from '@common/enums/preference.type';
import { AspectService } from '@domain/context/aspect/aspect.service';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';

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
    private templatesSetService: TemplatesSetService,
    private aspectService: AspectService,
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
      hub.community = this.communityService.updateCommunityPolicyResourceID(
        hub.community,
        hub.id
      );
    }
    hub.preferenceSet = await this.preferenceSetService.createPreferenceSet(
      PreferenceDefinitionSet.HUB,
      this.createPreferenceDefaults()
    );

    hub.templatesSet = await this.templatesSetService.createTemplatesSet();

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

    return defaults;
  }

  async validateHubData(hubData: CreateHubInput) {
    if (!(await this.isNameIdAvailable(hubData.nameID)))
      throw new ValidationException(
        `Unable to create Hub: the provided nameID is already taken: ${hubData.nameID}`,
        LogContext.CHALLENGES
      );
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

    const baseChallenge = await this.getHubOrFail(deleteData.ID, {
      relations: ['community', 'context', 'lifecycle', 'agent'],
    });
    await this.baseChallengeService.deleteEntities(baseChallenge);

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

  async getHubs(): Promise<IHub[]> {
    // Load the hubs
    const hubs: IHub[] = await this.hubRepository.find();
    if (hubs.length === 0) return [];

    // Get the order to return the data in
    const sortedIDs = await this.getHubsSortOrderDefault();
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

  private async getHubsSortOrderDefault(): Promise<string[]> {
    // Then load data to do the sorting
    const hubsDataForSorting = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.challenges', 'challenge')
      .leftJoinAndSelect('hub.authorization', 'authorization_policy')
      .leftJoinAndSelect('challenge.opportunities', 'opportunities')
      .getMany();

    const sortedHubs = hubsDataForSorting.sort((a, b) => {
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
    limit?: number,
    shuffle?: boolean
  ): Promise<IChallenge[]> {
    const hubWithChallenges = await this.getHubOrFail(hub.id, {
      relations: ['challenges'],
    });
    const challenges = hubWithChallenges.challenges;
    if (!challenges) {
      throw new RelationshipNotFoundException(
        `Unable to load challenges for Hub ${hub.id} `,
        LogContext.CHALLENGES
      );
    }

    const limitAndShuffled = limitAndShuffle(challenges, limit, shuffle);

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

  async getOpportunitiesInNameableScope(hub: IHub): Promise<IOpportunity[]> {
    return await this.opportunityService.getOpportunitiesInNameableScope(
      hub.id
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

  async getCommunityMembershipCredential(
    hub: IHub
  ): Promise<CredentialDefinition> {
    return await this.baseChallengeService.getCommunityMembershipCredential(
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

  async getLifecycle(hub: IHub): Promise<ILifecycle> {
    return await this.baseChallengeService.getLifecycle(
      hub.id,
      this.hubRepository
    );
  }

  async createChallengeInHub(
    challengeData: CreateChallengeOnHubInput,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    const hub = await this.getHubOrFail(challengeData.hubID, {
      relations: ['challenges', 'community'],
    });
    const nameAvailable = await this.namingService.isNameIdAvailableInHub(
      challengeData.nameID,
      hub.id
    );
    if (!nameAvailable)
      throw new ValidationException(
        `Unable to create Challenge: the provided nameID is already taken: ${challengeData.nameID}`,
        LogContext.CHALLENGES
      );

    // Update the challenge data being passed in to state set the parent ID to the contained challenge
    const newChallenge = await this.challengeService.createChallenge(
      challengeData,
      hub.id,
      agentInfo
    );
    if (!hub.challenges)
      throw new ValidationException(
        `Unable to create Challenge: challenges not initialized: ${challengeData.hubID}`,
        LogContext.CHALLENGES
      );

    hub.challenges.push(newChallenge);
    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      newChallenge.community,
      hub.community
    );

    await this.hubRepository.save(hub);
    return newChallenge;
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

  async getActivity(hub: IHub): Promise<INVP[]> {
    const activity: INVP[] = [];

    // Challenges
    const challengesCount = await this.challengeService.getChallengesInHubCount(
      hub.id
    );
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = `challenges-${hub.id}`;
    activity.push(challengesTopic);

    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesInHubCount(hub.id);
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = `opportunities-${hub.id}`;
    activity.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsInHubCount(
      hub.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${hub.id}`;
    activity.push(projectsTopic);

    // Members
    const membersCount = await this.getMembersCount(hub);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${hub.id}`;
    activity.push(membersTopic);

    // Aspects
    const { id: contextId } = await this.getContext(hub);
    const aspectsCount = await this.aspectService.getAspectsInContextCount(
      contextId
    );
    const aspectsTopic = new NVP('aspects', aspectsCount.toString());
    aspectsTopic.id = `aspects-${hub.id}`;
    activity.push(aspectsTopic);

    return activity;
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

  async getHubCount(): Promise<number> {
    return await this.hubRepository.count();
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
