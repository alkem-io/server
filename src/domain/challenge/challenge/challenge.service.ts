import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import {
  AssignChallengeLeadInput,
  CreateChallengeInput,
  DeleteChallengeInput,
  RemoveChallengeLeadInput,
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
import {
  AuthorizationCredential,
  ChallengeLifecycleTemplate,
  LogContext,
} from '@common/enums';
import { Inject, Injectable } from '@nestjs/common';
import { CommunityService } from '@domain/community/community/community.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService } from '@nestjs/common';
import { IOrganisation } from '@domain/community/organisation';
import { ICommunity } from '@domain/community/community';
import { challengeLifecycleConfigDefault } from './challenge.lifecycle.config.default';
import { challengeLifecycleConfigExtended } from './challenge.lifecycle.config.extended';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { IAgent } from '@domain/agent/agent';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IChallenge } from './challenge.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ProjectService } from '@domain/collaboration/project/project.service';

@Injectable()
export class ChallengeService {
  constructor(
    private agentService: AgentService,
    private communityService: CommunityService,
    private opportunityService: OpportunityService,
    private projectService: ProjectService,
    private baseChallengeService: BaseChallengeService,
    private lifecycleService: LifecycleService,
    private organisationService: OrganisationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createChallenge(
    challengeData: CreateChallengeInput,
    ecoverseID: string
  ): Promise<IChallenge> {
    const challenge: IChallenge = Challenge.create(challengeData);
    challenge.authorization = new AuthorizationDefinition();

    challenge.ecoverseID = ecoverseID;
    challenge.childChallenges = [];

    challenge.opportunities = [];
    await this.baseChallengeService.initialise(
      challenge,
      challengeData,
      ecoverseID
    );

    // Lifecycle, that has both a default and extended version
    let machineConfig: any = challengeLifecycleConfigDefault;
    if (
      challengeData.lifecycleTemplate &&
      challengeData.lifecycleTemplate === ChallengeLifecycleTemplate.EXTENDED
    ) {
      machineConfig = challengeLifecycleConfigExtended;
    }

    await this.challengeRepository.save(challenge);

    challenge.lifecycle = await this.lifecycleService.createLifecycle(
      challenge.id,
      machineConfig
    );

    if (challengeData.leadOrganisations) {
      await this.setChallengeLeads(
        challenge.id,
        challengeData.leadOrganisations
      );
    }

    // set the credential type in use by the community
    await this.baseChallengeService.setMembershipCredential(
      challenge,
      AuthorizationCredential.ChallengeMember
    );

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
          challenge.ecoverseID
        );
        challenge.nameID = challengeData.nameID;
        await this.challengeRepository.save(challenge);
      }
    }

    if (challengeData.leadOrganisations) {
      await this.setChallengeLeads(
        challenge.id,
        challengeData.leadOrganisations
      );
    }
    return challenge;
  }

  async deleteChallenge(deleteData: DeleteChallengeInput): Promise<IChallenge> {
    const challengeID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeOrFail(challengeID, {
      relations: ['childChallenges', 'opportunities'],
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
    const challengeLeads = await this.getLeadOrganisations(challengeID);
    for (const challengeLead of challengeLeads) {
      const agentHostOrg = await this.organisationService.getAgent(
        challengeLead
      );
      challengeLead.agent = await this.agentService.revokeCredential({
        agentID: agentHostOrg.id,
        type: AuthorizationCredential.ChallengeLead,
        resourceID: challengeID,
      });
      await this.organisationService.save(challengeLead);
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
        { id: challengeID, ecoverseID: nameableScopeID },
        options
      );
    } else {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne(
        { nameID: challengeID, ecoverseID: nameableScopeID },
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
    } else {
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
    const existingLeads = await this.getLeadOrganisations(challengeID);

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
        await this.removeChallengeLead({
          challengeID: challengeID,
          organisationID: existingLeadOrg.id,
        });
      }
    }

    // add any new ones
    for (const challengeLeadID of challengeLeadsIDs) {
      const organisation = await this.organisationService.getOrganisationOrFail(
        challengeLeadID
      );
      const existingLead = existingLeads.find(
        leadOrg => leadOrg.id === organisation.id
      );
      if (!existingLead) {
        await this.assignChallengeLead({
          challengeID: challengeID,
          organisationID: organisation.id,
        });
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

  async getAgent(challengeId: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(
      challengeId,
      this.challengeRepository
    );
  }

  async getOpportunities(challengeId: string): Promise<IOpportunity[]> {
    const challenge = await this.getChallengeOrFail(challengeId, {
      relations: ['opportunities'],
    });
    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load Opportunities for challenge ${challengeId} `,
        LogContext.COLLABORATION
      );
    return opportunities;
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
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    this.logger.verbose?.(
      `Adding child Challenge to Challenge (${challengeData.parentID})`,
      LogContext.CHALLENGES
    );

    const challenge = await this.getChallengeOrFail(challengeData.parentID, {
      relations: ['childChallenges', 'community'],
    });

    await this.baseChallengeService.isNameAvailableOrFail(
      challengeData.nameID,
      challenge.ecoverseID
    );

    const childChallenge = await this.createChallenge(
      challengeData,
      challenge.ecoverseID
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

  async createOpportunity(
    opportunityData: CreateOpportunityInput
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

    await this.baseChallengeService.isNameAvailableOrFail(
      opportunityData.nameID,
      challenge.ecoverseID
    );

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData,
      challenge.ecoverseID
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

  async getChallengesInEcoverseCount(ecoverseID: string): Promise<number> {
    const count = await this.challengeRepository.count({
      where: { ecoverseID: ecoverseID },
    });
    return count;
  }

  async getChallengeCount(): Promise<number> {
    return await this.challengeRepository.count();
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

  async getActivity(challenge: IChallenge): Promise<INVP[]> {
    const activity: INVP[] = [];

    const community = await this.getCommunity(challenge.id);
    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    activity.push(membersTopic);

    const opportunitiesCount = await this.opportunityService.getOpportunitiesInChallengeCount(
      challenge.id
    );
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    activity.push(opportunitiesTopic);

    const projectsCount = await this.projectService.getProjectsInChallengeCount(
      challenge.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    activity.push(projectsTopic);

    const challengesCount = await this.getChildChallengesCount(challenge.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    activity.push(challengesTopic);

    return activity;
  }

  async getLeadOrganisations(challengeID: string): Promise<IOrganisation[]> {
    const organisations = await this.organisationService.organisationsWithCredentials(
      {
        type: AuthorizationCredential.ChallengeLead,
        resourceID: challengeID,
      }
    );
    return organisations;
  }

  async assignChallengeLead(
    assignData: AssignChallengeLeadInput
  ): Promise<IChallenge> {
    const organisationID = assignData.organisationID;
    const challengeID = assignData.challengeID;
    const organisation = await this.organisationService.getOrganisationOrFail(
      organisationID,
      { relations: ['groups', 'agent'] }
    );

    const existingLeads = await this.getLeadOrganisations(challengeID);

    const existingOrg = existingLeads.find(
      existingOrg => existingOrg.id === organisation.id
    );
    if (existingOrg)
      throw new ValidationException(
        `Challenge ${challengeID} already has an organisation with the provided organisation ID: ${organisationID}`,
        LogContext.COMMUNITY
      );
    // assign the credential
    const agent = await this.organisationService.getAgent(organisation);
    organisation.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ChallengeLead,
      resourceID: challengeID,
    });

    await this.organisationService.save(organisation);
    return await this.getChallengeOrFail(challengeID);
  }

  async removeChallengeLead(
    removeData: RemoveChallengeLeadInput
  ): Promise<IChallenge> {
    const challengeID = removeData.challengeID;
    const challenge = await this.getChallengeOrFail(challengeID);
    const organisation = await this.organisationService.getOrganisationOrFail(
      removeData.organisationID
    );

    const existingLeads = await this.getLeadOrganisations(challengeID);

    const existingOrg = existingLeads.find(
      existingOrg => existingOrg.id === organisation.id
    );

    if (!existingOrg)
      throw new ValidationException(
        `Community ${removeData.challengeID} does not have a lead with the provided organisation ID: ${removeData.organisationID}`,
        LogContext.COMMUNITY
      );
    // ok to remove the org
    const agent = await this.organisationService.getAgent(organisation);
    organisation.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ChallengeLead,
      resourceID: challengeID,
    });

    await this.organisationService.save(organisation);
    return challenge;
  }
}
