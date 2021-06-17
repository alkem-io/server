import { IChallenge, CreateChallengeInput } from '@domain/challenge/challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Ecoverse,
  IEcoverse,
  CreateEcoverseInput,
  UpdateEcoverseInput,
  DeleteEcoverseInput,
} from '@domain/challenge/ecoverse';
import { ICommunity } from '@domain/community/community';
import { IUserGroup } from '@domain/community/user-group';
import { INVP, NVP } from '@domain/common/nvp';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IProject } from '@domain/collaboration/project';
import { IContext } from '@domain/context';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { BaseChallengeService } from '../base-challenge/base.challenge.service';
import { NamingService } from '@src/services/domain/naming/naming.service';
import { UUID_LENGTH } from '@common/constants';
import { ILifecycle } from '@domain/common/lifecycle';
import { challengeLifecycleConfigDefault } from '../challenge/challenge.lifecycle.config.default';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { IAgent } from '@domain/agent/agent';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
    private lifecycleService: LifecycleService,
    private projectService: ProjectService,
    private opportunityService: OpportunityService,
    private baseChallengeService: BaseChallengeService,
    private namingService: NamingService,
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
      ecoverse.id
    );
    // set the credential type in use by the community
    await this.baseChallengeService.setMembershipCredential(
      ecoverse,
      AuthorizationCredential.EcoverseMember
    );

    ecoverse.host = await this.organisationService.getOrganisationOrFail(
      ecoverseData.hostID
    );

    // Lifecycle
    const machineConfig: any = challengeLifecycleConfigDefault;
    ecoverse.lifecycle = await this.lifecycleService.createLifecycle(
      ecoverse.id,
      machineConfig
    );

    return await this.ecoverseRepository.save(ecoverse);
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
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
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

    const result = await this.ecoverseRepository.remove(ecoverse as Ecoverse);
    result.id = deleteData.ID;
    return result;
  }

  async getEcoverses(): Promise<IEcoverse[]> {
    const ecoverses = await this.ecoverseRepository.find();
    return ecoverses || [];
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
    } else {
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

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const challengeCount = await this.ecoverseRepository.count({
      nameID: nameID,
    });
    if (challengeCount != 0) return false;

    // check restricted ecoverse names
    const restrictedEcoverseNames = ['user', 'organisation'];
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

    return challenges;
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

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.getEcoverseOrFail(challengeData.parentID, {
      relations: ['challenges'],
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
        `Unable to create Challenge: challenges not initialized: ${challengeData.parentID}`,
        LogContext.CHALLENGES
      );

    ecoverse.challenges.push(newChallenge);
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

  async getProjects(ecoverse: IEcoverse): Promise<IProject[]> {
    return await this.projectService.getProjects(ecoverse.id);
  }

  async getActivity(ecoverse: IEcoverse): Promise<INVP[]> {
    const activity: INVP[] = [];

    // Challenges
    const challengesCount = await this.getChallengesCount(ecoverse.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    activity.push(challengesTopic);

    const allChallengesCount = await this.challengeService.getChallengesInEcoverseCount(
      ecoverse.id
    );
    const opportunitiesTopic = new NVP(
      'opportunities',
      (allChallengesCount - challengesCount - 1).toString()
    );
    activity.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsCount(
      ecoverse.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    activity.push(projectsTopic);

    // Members
    const membersCount = await this.getMembersCount(ecoverse);
    const membersTopic = new NVP('members', membersCount.toString());
    activity.push(membersTopic);

    return activity;
  }

  async getChallengesCount(ecoverseID: string): Promise<number> {
    return await this.ecoverseRepository.count({
      where: { ecoverse: ecoverseID },
    });
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
}
