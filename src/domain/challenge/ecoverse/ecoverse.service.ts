import { UUID_LENGTH } from '@common/constants';
import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import {
  CreateEcoverseInput,
  DeleteEcoverseInput,
} from '@domain/challenge/ecoverse';
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
import { Ecoverse } from './ecoverse.entity';
import { IEcoverse } from './ecoverse.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AssignEcoverseAdminInput } from './dto/ecoverse.dto.assign.admin';
import { IUser } from '@domain/community/user/user.interface';
import { RemoveEcoverseAdminInput } from './dto/ecoverse.dto.remove.admin';
import { UserService } from '@domain/community/user/user.service';
import { UpdateEcoverseInput } from './dto/ecoverse.dto.update';
import { CreateChallengeOnEcoverseInput } from '../challenge/dto/challenge.dto.create.in.ecoverse';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityType } from '@common/enums/community.type';

@Injectable()
export class EcoverseService {
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
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createEcoverse(ecoverseData: CreateEcoverseInput): Promise<IEcoverse> {
    await this.validateEcoverseData(ecoverseData);
    const ecoverse: IEcoverse = Ecoverse.create(ecoverseData);

    // remove context before saving as want to control that creation
    ecoverse.context = undefined;
    await this.ecoverseRepository.save(ecoverse);
    await this.baseChallengeService.initialise(
      ecoverse,
      ecoverseData,
      ecoverse.id,
      CommunityType.HUB
    );
    // set the credential type in use by the community
    await this.baseChallengeService.setMembershipCredential(
      ecoverse,
      AuthorizationCredential.ECOVERSE_MEMBER
    );

    // set immediate community parent
    if (ecoverse.community) {
      ecoverse.community.parentID = ecoverse.id;
    }

    // Lifecycle
    const machineConfig: any = challengeLifecycleConfigDefault;
    ecoverse.lifecycle = await this.lifecycleService.createLifecycle(
      ecoverse.id,
      machineConfig
    );

    // save before assigning host in case that fails
    const savedEcoverse = await this.ecoverseRepository.save(ecoverse);

    await this.setEcoverseHost(ecoverse.id, ecoverseData.hostID);

    return savedEcoverse;
  }

  async validateEcoverseData(ecoverseData: CreateEcoverseInput) {
    if (!(await this.isNameIdAvailable(ecoverseData.nameID)))
      throw new ValidationException(
        `Unable to create Ecoverse: the provided nameID is already taken: ${ecoverseData.nameID}`,
        LogContext.CHALLENGES
      );
  }

  async update(ecoverseData: UpdateEcoverseInput): Promise<IEcoverse> {
    const ecoverse: IEcoverse = await this.baseChallengeService.update(
      ecoverseData,
      this.ecoverseRepository
    );

    if (ecoverseData.hostID) {
      await this.setEcoverseHost(ecoverse.id, ecoverseData.hostID);
    }

    return await this.ecoverseRepository.save(ecoverse);
  }

  async deleteEcoverse(deleteData: DeleteEcoverseInput): Promise<IEcoverse> {
    const ecoverse = await this.getEcoverseOrFail(deleteData.ID, {
      relations: ['challenges'],
    });

    // Do not remove an ecoverse that has child challenges , require these to be individually first removed
    if (ecoverse.challenges && ecoverse.challenges.length > 0)
      throw new ValidationException(
        `Unable to remove Ecoverse (${ecoverse.nameID}) as it contains ${ecoverse.challenges.length} challenges`,
        LogContext.CHALLENGES
      );

    const baseChallenge = await this.getEcoverseOrFail(deleteData.ID, {
      relations: ['community', 'context', 'lifecycle', 'agent'],
    });
    await this.baseChallengeService.deleteEntities(baseChallenge);

    // Remove any host credentials
    const hostOrg = await this.getHost(ecoverse.id);
    if (hostOrg) {
      const agentHostOrg = await this.organizationService.getAgent(hostOrg);
      hostOrg.agent = await this.agentService.revokeCredential({
        agentID: agentHostOrg.id,
        type: AuthorizationCredential.ECOVERSE_HOST,
        resourceID: ecoverse.id,
      });
      await this.organizationService.save(hostOrg);
    }

    const result = await this.ecoverseRepository.remove(ecoverse as Ecoverse);
    result.id = deleteData.ID;
    return result;
  }

  async getEcoverses(): Promise<IEcoverse[]> {
    // Load the ecoverses
    const ecoverses: IEcoverse[] = await this.ecoverseRepository.find();
    if (ecoverses.length === 0) return [];

    // Get the order to return the data in
    const sortedIDs = await this.getEcoversesSortOrderDefault();
    const ecoversesResult: IEcoverse[] = [];
    for (const ecoverseID of sortedIDs) {
      const ecoverse = ecoverses.find(ecoverse => ecoverse.id === ecoverseID);
      if (ecoverse) {
        ecoversesResult.push(ecoverse);
      } else {
        this.logger.error(
          'Invalid state error when sorting Ecoverses!',
          LogContext.CHALLENGES
        );
      }
    }
    return ecoversesResult;
  }

  private async getEcoversesSortOrderDefault(): Promise<string[]> {
    // Then load data to do the sorting
    const ecoversesDataForSorting = await this.ecoverseRepository
      .createQueryBuilder('ecoverse')
      .leftJoinAndSelect('ecoverse.challenges', 'challenge')
      .leftJoinAndSelect('ecoverse.authorization', 'authorization_policy')
      .leftJoinAndSelect('challenge.opportunities', 'opportunities')
      .getMany();

    const sortedEcoverses = ecoversesDataForSorting.sort((a, b) => {
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
          `Critical error when comparing Ecoverses! Critical error when loading Challenges for Ecoverse ${a} and Ecoverse ${b}`,
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
    for (const ecoverse of sortedEcoverses) {
      sortedIDs.push(ecoverse.id);
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

  async getEcoverseOrFail(
    ecoverseID: string,
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    let ecoverse: IEcoverse | undefined;
    if (ecoverseID.length === UUID_LENGTH) {
      ecoverse = await this.ecoverseRepository.findOne(
        { id: ecoverseID },
        options
      );
    }
    if (!ecoverse) {
      // look up based on nameID
      ecoverse = await this.ecoverseRepository.findOne(
        { nameID: ecoverseID },
        options
      );
    }
    if (!ecoverse)
      throw new EntityNotFoundException(
        `Unable to find Ecoverse with ID: ${ecoverseID}`,
        LogContext.CHALLENGES
      );
    return ecoverse;
  }

  async setEcoverseHost(
    ecoverseID: string,
    hostOrgID: string
  ): Promise<IEcoverse> {
    const organization = await this.organizationService.getOrganizationOrFail(
      hostOrgID,
      { relations: ['groups', 'agent'] }
    );

    const existingHost = await this.getHost(ecoverseID);

    if (existingHost) {
      const agentExisting = await this.organizationService.getAgent(
        existingHost
      );
      organization.agent = await this.agentService.revokeCredential({
        agentID: agentExisting.id,
        type: AuthorizationCredential.ECOVERSE_HOST,
        resourceID: ecoverseID,
      });
    }

    // assign the credential
    const agent = await this.organizationService.getAgent(organization);
    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ECOVERSE_HOST,
      resourceID: ecoverseID,
    });

    await this.organizationService.save(organization);
    return await this.getEcoverseOrFail(ecoverseID);
  }

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const challengeCount = await this.ecoverseRepository.count({
      nameID: nameID,
    });
    if (challengeCount != 0) return false;

    // check restricted ecoverse names
    const restrictedEcoverseNames = ['user', 'organization'];
    if (restrictedEcoverseNames.includes(nameID.toLowerCase())) return false;

    return true;
  }

  async getChallenges(ecoverse: IEcoverse): Promise<IChallenge[]> {
    const ecoverseWithChallenges = await this.getEcoverseOrFail(ecoverse.id, {
      relations: ['challenges'],
    });
    const challenges = ecoverseWithChallenges.challenges;
    if (!challenges)
      throw new RelationshipNotFoundException(
        `Unable to load challenges for Ecoverse ${ecoverse.id} `,
        LogContext.CHALLENGES
      );

    // Sort the challenges base on their display name
    const sortedChallenges = challenges.sort((a, b) =>
      a.displayName > b.displayName ? 1 : -1
    );
    return sortedChallenges;
  }

  async getGroups(ecoverse: IEcoverse): Promise<IUserGroup[]> {
    const community = await this.getCommunity(ecoverse);
    return community.groups || [];
  }

  async getOpportunitiesInNameableScope(
    ecoverse: IEcoverse
  ): Promise<IOpportunity[]> {
    return await this.opportunityService.getOpportunitiesInNameableScope(
      ecoverse.id
    );
  }

  async getOpportunityInNameableScope(
    opportunityID: string,
    ecoverse: IEcoverse
  ): Promise<IOpportunity> {
    return await this.opportunityService.getOpportunityInNameableScopeOrFail(
      opportunityID,
      ecoverse.id
    );
  }

  async getChallengeInNameableScope(
    challengeID: string,
    ecoverse: IEcoverse
  ): Promise<IChallenge> {
    return await this.challengeService.getChallengeInNameableScopeOrFail(
      challengeID,
      ecoverse.id
    );
  }

  async getProjectInNameableScope(
    projectID: string,
    ecoverse: IEcoverse
  ): Promise<IProject> {
    return await this.projectService.getProjectInNameableScopeOrFail(
      projectID,
      ecoverse.id
    );
  }

  async getCommunity(ecoverse: IEcoverse): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      ecoverse.id,
      this.ecoverseRepository
    );
  }

  async getContext(ecoverse: IEcoverse): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      ecoverse.id,
      this.ecoverseRepository
    );
  }

  async getLifecycle(ecoverse: IEcoverse): Promise<ILifecycle> {
    return await this.baseChallengeService.getLifecycle(
      ecoverse.id,
      this.ecoverseRepository
    );
  }

  async createChallengeInEcoverse(
    challengeData: CreateChallengeOnEcoverseInput
  ): Promise<IChallenge> {
    const ecoverse = await this.getEcoverseOrFail(challengeData.ecoverseID, {
      relations: ['challenges', 'community'],
    });
    const nameAvailable = await this.namingService.isNameIdAvailableInEcoverse(
      challengeData.nameID,
      ecoverse.id
    );
    if (!nameAvailable)
      throw new ValidationException(
        `Unable to create Challenge: the provided nameID is already taken: ${challengeData.nameID}`,
        LogContext.CHALLENGES
      );

    // Update the challenge data being passed in to state set the parent ID to the contained challenge
    const newChallenge = await this.challengeService.createChallenge(
      challengeData,
      ecoverse.id
    );
    if (!ecoverse.challenges)
      throw new ValidationException(
        `Unable to create Challenge: challenges not initialized: ${challengeData.ecoverseID}`,
        LogContext.CHALLENGES
      );

    ecoverse.challenges.push(newChallenge);
    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      newChallenge.community,
      ecoverse.community
    );

    await this.ecoverseRepository.save(ecoverse);
    return newChallenge;
  }

  async getChallenge(
    challengeID: string,
    ecoverse: IEcoverse
  ): Promise<IChallenge> {
    return await this.challengeService.getChallengeInNameableScopeOrFail(
      challengeID,
      ecoverse.id
    );
  }

  async getCommunityInNameableScope(
    communityID: string,
    ecoverse: IEcoverse
  ): Promise<ICommunity> {
    return await this.communityService.getCommunityInNameableScopeOrFail(
      communityID,
      ecoverse.id
    );
  }

  async getProjects(ecoverse: IEcoverse): Promise<IProject[]> {
    return await this.projectService.getProjects(ecoverse.id);
  }

  async getActivity(ecoverse: IEcoverse): Promise<INVP[]> {
    const activity: INVP[] = [];

    // Challenges
    const challengesCount =
      await this.challengeService.getChallengesInEcoverseCount(ecoverse.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = `challenges-${ecoverse.id}`;
    activity.push(challengesTopic);

    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesInEcoverseCount(
        ecoverse.id
      );
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = `opportunities-${ecoverse.id}`;
    activity.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsInEcoverseCount(
      ecoverse.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${ecoverse.id}`;
    activity.push(projectsTopic);

    // Members
    const membersCount = await this.getMembersCount(ecoverse);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${ecoverse.id}`;
    activity.push(membersTopic);

    return activity;
  }

  async getChallengesCount(ecoverseID: string): Promise<number> {
    return await this.challengeService.getChallengesInEcoverseCount(ecoverseID);
  }

  async getAgent(ecoverseID: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(
      ecoverseID,
      this.ecoverseRepository
    );
  }

  async getMembersCount(ecoverse: IEcoverse): Promise<number> {
    return await this.baseChallengeService.getMembersCount(
      ecoverse,
      this.ecoverseRepository
    );
  }

  async getEcoverseCount(): Promise<number> {
    return await this.ecoverseRepository.count();
  }

  async getHost(ecoverseID: string): Promise<IOrganization | undefined> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.ECOVERSE_HOST,
        resourceID: ecoverseID,
      });
    if (organizations.length == 0) {
      return undefined;
    }
    if (organizations.length > 1) {
      throw new RelationshipNotFoundException(
        `More than one host for Ecoverse ${ecoverseID} `,
        LogContext.CHALLENGES
      );
    }
    return organizations[0];
  }

  async assignEcoverseAdmin(
    assignData: AssignEcoverseAdminInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const ecoverse = await this.getEcoverseOrFail(assignData.ecoverseID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ECOVERSE_ADMIN,
      resourceID: ecoverse.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeEcoverseAdmin(
    removeData: RemoveEcoverseAdminInput
  ): Promise<IUser> {
    const ecoverseID = removeData.ecoverseID;
    const ecoverse = await this.getEcoverseOrFail(ecoverseID);
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ECOVERSE_ADMIN,
      resourceID: ecoverse.id,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }
}
