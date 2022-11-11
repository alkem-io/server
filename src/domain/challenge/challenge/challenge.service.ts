import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import {
  CreateChallengeInput,
  DeleteChallengeInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { ILifecycle } from '@domain/common/lifecycle';
import { IContext } from '@domain/context/context';
import { NVP } from '@domain/common/nvp';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import {
  CreateOpportunityInput,
  IOpportunity,
} from '@domain/collaboration/opportunity';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunityService } from '@domain/community/community/community.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, getConnection, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IOrganization } from '@domain/community/organization';
import { ICommunity } from '@domain/community/community';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { UUID_LENGTH } from '@common/constants';
import { IAgent } from '@domain/agent/agent';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IChallenge } from './challenge.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { UserService } from '@domain/community/user/user.service';
import { IUser } from '@domain/community/user/user.interface';
import { AssignChallengeAdminInput } from './dto/challenge.dto.assign.admin';
import { RemoveChallengeAdminInput } from './dto/challenge.dto.remove.admin';
import { CreateChallengeOnChallengeInput } from './dto/challenge.dto.create.in.challenge';
import { CommunityType } from '@common/enums/community.type';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { IPreferenceSet } from '@domain/common/preference-set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceType } from '@common/enums/preference.type';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CommunityRole } from '@common/enums/community.role';
import { challengeCommunityPolicy } from './challenge.community.policy';
import { UpdateChallengeInnovationFlowInput } from './dto/challenge.dto.update.innovation.flow';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LifecycleTemplateService } from '@domain/template/lifecycle-template/lifecycle.template.service';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { HubVisibility } from '@common/enums/hub.visibility';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';

@Injectable()
export class ChallengeService {
  constructor(
    private agentService: AgentService,
    private communityService: CommunityService,
    private opportunityService: OpportunityService,
    private projectService: ProjectService,
    private baseChallengeService: BaseChallengeService,
    private lifecycleService: LifecycleService,
    private lifecycleTemplateService: LifecycleTemplateService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private preferenceSetService: PreferenceSetService,
    private namingService: NamingService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createChallenge(
    challengeData: CreateChallengeInput,
    hubID: string,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    if (challengeData.innovationFlowTemplateID) {
      await this.lifecycleTemplateService.validateLifecycleDefinitionOrFail(
        challengeData.innovationFlowTemplateID,
        hubID,
        LifecycleType.CHALLENGE
      );
    } else {
      challengeData.innovationFlowTemplateID =
        await this.lifecycleTemplateService.getDefaultLifecycleTemplateId(
          hubID,
          LifecycleType.CHALLENGE
        );
    }

    if (!challengeData.nameID) {
      challengeData.nameID = this.namingService.createNameID(
        challengeData.displayName
      );
    }
    await this.baseChallengeService.isNameAvailableOrFail(
      challengeData.nameID,
      hubID
    );

    const challenge: IChallenge = Challenge.create(challengeData);
    challenge.hubID = hubID;
    challenge.childChallenges = [];

    challenge.opportunities = [];

    await this.baseChallengeService.initialise(
      challenge,
      challengeData,
      hubID,
      CommunityType.CHALLENGE,
      challengeCommunityPolicy
    );

    await this.challengeRepository.save(challenge);

    // set immediate community parent + resourceID
    if (challenge.community) {
      challenge.community.parentID = challenge.id;
      challenge.community =
        this.communityService.updateCommunityPolicyResourceID(
          challenge.community,
          challenge.id
        );
    }

    challenge.preferenceSet =
      await this.preferenceSetService.createPreferenceSet(
        PreferenceDefinitionSet.CHALLENGE,
        this.createPreferenceDefaults()
      );

    const machineConfig: ILifecycleDefinition =
      await this.lifecycleTemplateService.getLifecycleDefinitionFromTemplate(
        challengeData.innovationFlowTemplateID,
        hubID,
        LifecycleType.CHALLENGE
      );

    challenge.lifecycle = await this.lifecycleService.createLifecycle(
      challenge.id,
      machineConfig
    );

    // save the challenge, just in case the lead orgs assignment fails. Note that
    // assigning lead orgs does not update the challenge entity
    const savedChallenge = await this.challengeRepository.save(challenge);

    if (challengeData.leadOrganizations) {
      await this.setChallengeLeads(
        challenge.id,
        challengeData.leadOrganizations
      );
    }

    if (agentInfo && challenge.community) {
      await this.communityService.assignUserToRole(
        challenge.community,
        agentInfo.userID,
        CommunityRole.MEMBER
      );

      await this.assignChallengeAdmin({
        userID: agentInfo.userID,
        challengeID: challenge.id,
      });
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
    const challenge = await this.getChallengeOrFail(baseChallenge.id);
    if (challengeData.nameID) {
      if (challengeData.nameID !== challenge.nameID) {
        // updating the nameID, check new value is allowed
        await this.baseChallengeService.isNameAvailableOrFail(
          challengeData.nameID,
          this.getHubID(challenge)
        );
        challenge.nameID = challengeData.nameID;
        await this.challengeRepository.save(challenge);
      }
    }
    return challenge;
  }

  async updateChallengeInnovationFlow(
    challengeData: UpdateChallengeInnovationFlowInput
  ): Promise<IChallenge> {
    const challenge = await this.getChallengeOrFail(challengeData.challengeID, {
      relations: ['lifecycle'],
    });

    if (!challenge.lifecycle) {
      throw new EntityNotInitializedException(
        `Lifecycle of challenge (${challenge.id}) not initialized`,
        LogContext.CHALLENGES
      );
    }

    const machineConfig: ILifecycleDefinition =
      await this.lifecycleTemplateService.getLifecycleDefinitionFromTemplate(
        challengeData.innovationFlowTemplateID,
        this.getHubID(challenge),
        LifecycleType.CHALLENGE
      );

    challenge.lifecycle.machineDef = JSON.stringify(machineConfig);
    challenge.lifecycle.machineState = '';

    return await this.challengeRepository.save(challenge);
  }

  async deleteChallenge(deleteData: DeleteChallengeInput): Promise<IChallenge> {
    const challengeID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeOrFail(challengeID, {
      relations: ['childChallenges', 'opportunities', 'preferenceSet'],
    });

    // Do not remove a challenge that has child challenges , require these to be individually first removed
    if (challenge.childChallenges && challenge.childChallenges.length > 0)
      throw new ValidationException(
        `Unable to remove challenge (${challenge.nameID}) as it contains ${challenge.childChallenges.length} child challenges`,
        LogContext.CHALLENGES
      );

    if (challenge.opportunities && challenge.opportunities.length > 0)
      throw new ValidationException(
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

    const baseChallenge = await this.getChallengeOrFail(challengeID, {
      relations: ['community', 'context', 'lifecycle', 'agent'],
    });
    await this.baseChallengeService.deleteEntities(baseChallenge);

    const result = await this.challengeRepository.remove(
      challenge as Challenge
    );
    result.id = deleteData.ID;
    return result;
  }

  async getChallengeInNameableScopeOrFail(
    challengeID: string,
    nameableScopeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge> {
    let challenge: IChallenge | undefined;
    if (challengeID.length == UUID_LENGTH) {
      challenge = await this.challengeRepository.findOne(
        { id: challengeID, hubID: nameableScopeID },
        options
      );
    }
    if (!challenge) {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne(
        { nameID: challengeID, hubID: nameableScopeID },
        options
      );
    }

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
  ): Promise<IChallenge> {
    let challenge: IChallenge | undefined;
    if (challengeID.length == UUID_LENGTH) {
      challenge = await this.challengeRepository.findOne(
        { id: challengeID },
        options
      );
    }
    if (!challenge) {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne(
        { nameID: challengeID },
        options
      );
    }

    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    return challenge;
  }

  async setChallengeLeads(
    challengeID: string,
    challengeLeadsIDs: string[]
  ): Promise<IChallenge> {
    const existingLeads = await this.getLeadOrganizations(challengeID);
    const community = await this.getCommunity(challengeID);

    // first remove any existing leads that are not in the new set
    for (const existingLeadOrg of existingLeads) {
      let inNewList = false;
      for (const challengeLeadID of challengeLeadsIDs) {
        if (
          challengeLeadID === existingLeadOrg.id ||
          challengeLeadID === existingLeadOrg.nameID
        ) {
          inNewList = true;
        }
      }
      if (!inNewList) {
        await this.communityService.removeOrganizationFromRole(
          community,
          existingLeadOrg.id,
          CommunityRole.LEAD
        );
      }
    }

    // add any new ones
    for (const challengeLeadID of challengeLeadsIDs) {
      const organization = await this.organizationService.getOrganizationOrFail(
        challengeLeadID
      );
      const existingLead = existingLeads.find(
        leadOrg => leadOrg.id === organization.id
      );
      if (!existingLead) {
        await this.communityService.assignOrganizationToRole(
          community,
          organization.id,
          CommunityRole.LEAD
        );
      }
    }

    return await this.getChallengeOrFail(challengeID);
  }

  async getCommunity(challengeId: string): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      challengeId,
      this.challengeRepository
    );
  }

  async getCommunityMembershipCredential(
    challengeId: string
  ): Promise<CredentialDefinition> {
    return await this.baseChallengeService.getCommunityMembershipCredential(
      challengeId,
      this.challengeRepository
    );
  }

  async getCommunityLeadershipCredential(
    challengeId: string
  ): Promise<CredentialDefinition> {
    return await this.baseChallengeService.getCommunityLeadershipCredential(
      challengeId,
      this.challengeRepository
    );
  }

  async getLifecycle(challengeId: string): Promise<ILifecycle> {
    return await this.baseChallengeService.getLifecycle(
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
    return await this.baseChallengeService.getCollaboration(
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
      relations: ['opportunities'],
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
      a.displayName.toLowerCase() > b.displayName.toLowerCase() ? 1 : -1
    );
    return sortedOpportunities;
  }

  // Loads the challenges into the challenge entity if not already present
  async getChildChallenges(challenge: IChallenge): Promise<IChallenge[]> {
    if (challenge.childChallenges && challenge.childChallenges.length > 0) {
      // challenge already has groups loaded
      return challenge.childChallenges;
    }

    const challengeWithChildChallenges = await this.getChallengeOrFail(
      challenge.id,
      {
        relations: ['childChallenges'],
      }
    );
    const childChallenges = challengeWithChildChallenges.childChallenges;
    if (!childChallenges)
      throw new RelationshipNotFoundException(
        `Unable to load child challenges for challenge ${challenge.id} `,
        LogContext.CHALLENGES
      );

    return childChallenges;
  }

  async createChildChallenge(
    challengeData: CreateChallengeOnChallengeInput,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    this.logger.verbose?.(
      `Adding child Challenge to Challenge (${challengeData.challengeID})`,
      LogContext.CHALLENGES
    );

    const challenge = await this.getChallengeOrFail(challengeData.challengeID, {
      relations: ['childChallenges', 'community'],
    });

    const hubID = this.getHubID(challenge);
    await this.baseChallengeService.isNameAvailableOrFail(
      challengeData.nameID,
      hubID
    );

    const childChallenge = await this.createChallenge(
      challengeData,
      hubID,
      agentInfo
    );

    challenge.childChallenges?.push(childChallenge);

    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      childChallenge.community,
      challenge.community
    );

    await this.challengeRepository.save(challenge);

    return childChallenge;
  }

  getHubID(challenge: IChallenge): string {
    const hubID = challenge.hubID;
    if (!hubID) {
      throw new RelationshipNotFoundException(
        `Unable to find hubID for challenge: ${challenge.id} `,
        LogContext.CHALLENGES
      );
    }
    return hubID;
  }

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    this.logger.verbose?.(
      `Adding Opportunity to Challenge (${opportunityData.challengeID})`,
      LogContext.CHALLENGES
    );

    const challenge = await this.getChallengeOrFail(
      opportunityData.challengeID,
      {
        relations: ['opportunities', 'community'],
      }
    );

    const hubID = this.getHubID(challenge);
    await this.baseChallengeService.isNameAvailableOrFail(
      opportunityData.nameID,
      hubID
    );

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData,
      hubID,
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

  async getChallenges(): Promise<Challenge[]> {
    const challenges = await this.challengeRepository.find();
    return challenges || [];
  }

  async getChallengesInHubCount(hubID: string): Promise<number> {
    const count = await this.challengeRepository.count({
      where: { hubID: hubID },
    });
    return count;
  }

  async getChallengesCount(visibility = HubVisibility.ACTIVE): Promise<number> {
    const sqlQuery = `SELECT COUNT(*) as challengesCount FROM challenge RIGHT JOIN hub ON challenge.hubID = hub.id WHERE hub.visibility = '${visibility}'`;
    const [queryResult]: {
      challengesCount: number;
    }[] = await getConnection().query(sqlQuery);

    return queryResult.challengesCount;
  }

  async getChildChallengesCount(challengeID: string): Promise<number> {
    return await this.challengeRepository.count({
      where: { parentChallenge: challengeID },
    });
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

    // Projects
    const projectsCount = await this.projectService.getProjectsInChallengeCount(
      challenge.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${challenge.id}`;
    metrics.push(projectsTopic);

    // Challenges
    const challengesCount = await this.getChildChallengesCount(challenge.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = `challenges-${challenge.id}`;
    metrics.push(challengesTopic);

    // Aspects
    const aspectsCount = await this.baseChallengeService.getAspectsCount(
      challenge,
      this.challengeRepository
    );
    const aspectsTopic = new NVP('aspects', aspectsCount.toString());
    aspectsTopic.id = `aspects-${challenge.id}`;
    metrics.push(aspectsTopic);

    // Canvases
    const canvasesCount = await this.baseChallengeService.getCanvasesCount(
      challenge,
      this.challengeRepository
    );
    const canvasesTopic = new NVP('canvases', canvasesCount.toString());
    canvasesTopic.id = `canvases-${challenge.id}`;
    metrics.push(canvasesTopic);

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
      { relations: ['preferenceSet'] }
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

  async assignChallengeAdmin(
    assignData: AssignChallengeAdminInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    await this.getChallengeOrFail(assignData.challengeID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.CHALLENGE_ADMIN,
      resourceID: assignData.challengeID,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeChallengeAdmin(
    removeData: RemoveChallengeAdminInput
  ): Promise<IUser> {
    const challengeID = removeData.challengeID;
    await this.getChallengeOrFail(challengeID);
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.CHALLENGE_ADMIN,
      resourceID: challengeID,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  createPreferenceDefaults(): Map<PreferenceType, string> {
    const defaults: Map<PreferenceType, string> = new Map();
    defaults.set(
      PreferenceType.MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS,
      'true'
    );
    defaults.set(
      PreferenceType.MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS,
      'true'
    );
    defaults.set(
      PreferenceType.MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT,
      'false'
    );

    return defaults;
  }

  async getChallengeForCommunity(
    communityID: string
  ): Promise<IChallenge | undefined> {
    return await this.challengeRepository.findOne({
      relations: ['community'],
      where: {
        community: { id: communityID },
      },
    });
  }
}
