import { IChallenge, CreateChallengeInput } from '@domain/challenge/challenge';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
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
import { NamingService } from '@src/services/naming/naming.service';
import { UUID_LENGTH } from '@common/constants';

@Injectable()
export class EcoverseService {
  constructor(
    private organisationService: OrganisationService,
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
    await this.ecoverseRepository.save(ecoverse);
    ecoverse.containedChallenge = await this.challengeService.createChallenge(
      {
        parentID: ecoverse.id,
        displayName: `ecoverse-${ecoverseData.displayName}`,
        context: ecoverseData.context,
        nameID: `ecoverse-${ecoverseData.nameID}`,
        tags: ecoverseData.tags,
      },
      ecoverse.id
    );
    ecoverse.containedChallenge.ecoverseID = ecoverse.id;

    if (ecoverseData.hostID) {
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
    } else {
      ecoverse.host = await this.organisationService.createOrganisation({
        displayName: `host-org-${ecoverseData.displayName}`,
        nameID: `host-${ecoverseData.nameID}`,
      });
    }
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
    const ecoverse = await this.getEcoverseOrFail(ecoverseData.ID);
    const challenge = this.getContainedChallenge(ecoverse);

    if (ecoverseData.hostID) {
      ecoverse.host = await this.organisationService.getOrganisationOrFail(
        ecoverseData.hostID
      );
    }

    ecoverse.containedChallenge = await this.challengeService.updateChallenge({
      ID: challenge.id,
      displayName: ecoverseData.displayName,
      nameID: ecoverseData.nameID,
      context: ecoverseData.context,
      tags: ecoverseData.tags,
    });

    return await this.ecoverseRepository.save(ecoverse);
  }

  async deleteEcoverse(deleteData: DeleteEcoverseInput): Promise<IEcoverse> {
    const ecoverseID = deleteData.ID;
    const ecoverse = await this.getEcoverseOrFail(ecoverseID);

    if (ecoverse.containedChallenge) {
      await this.challengeService.deleteChallenge({
        ID: ecoverse.containedChallenge.id,
      });
    }

    await this.baseChallengeService.deleteEntities(ecoverse);

    const result = await this.ecoverseRepository.remove(ecoverse as Ecoverse);
    result.id = ecoverseID;
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
    if (challengeCount == 0) return true;
    return false;
  }

  getContainedChallenge(ecoverse: IEcoverse): IChallenge {
    const challenge = ecoverse.containedChallenge;
    if (!challenge) {
      throw new EntityNotInitializedException(
        `Unable to find Ecoverse with ID: ${ecoverse.id}`,
        LogContext.CHALLENGES
      );
    }
    return challenge;
  }

  async getChallenges(ecoverse: IEcoverse): Promise<IChallenge[]> {
    const challenge = this.getContainedChallenge(ecoverse);
    return await this.challengeService.getChildChallenges(challenge);
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
    const challenge = this.getContainedChallenge(ecoverse);
    return await this.challengeService.getCommunity(challenge.id);
  }

  async getContext(ecoverse: IEcoverse): Promise<IContext> {
    const challenge = this.getContainedChallenge(ecoverse);
    return await this.challengeService.getContext(challenge.id);
  }

  async createChallenge(
    challengeData: CreateChallengeInput
  ): Promise<IChallenge> {
    const ecoverse = await this.getEcoverseOrFail(challengeData.parentID);
    const nameAvailable = await this.namingService.isNameIdAvailableInEcoverse(
      challengeData.nameID,
      ecoverse.id
    );
    if (!nameAvailable)
      throw new ValidationException(
        `Unable to create Ecoverse: the provided nameID is already taken: ${challengeData.nameID}`,
        LogContext.CHALLENGES
      );

    const newChallenge = await this.challengeService.createChildChallenge(
      challengeData
    );
    await this.ecoverseRepository.save(ecoverse);

    return newChallenge;
  }

  async getDefaultEcoverseOrFail(
    options?: FindOneOptions<Ecoverse>
  ): Promise<IEcoverse> {
    const ecoverseId = await this.getDefaultEcoverseId(); // todo - remove when can have multiple ecoverses
    return await this.getEcoverseOrFail(ecoverseId, options);
  }

  async getDefaultEcoverseId(): Promise<string> {
    const ecoverse = await this.ecoverseRepository.findOne();
    if (!ecoverse) {
      throw new ValidationException(
        'Ecoverse is missing!',
        LogContext.BOOTSTRAP
      );
    }
    return ecoverse.id;
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
    const challenge = this.getContainedChallenge(ecoverse);
    const activity: INVP[] = [];

    // Challenges
    const childChallengesCount = await this.challengeService.getChildChallengesCount(
      challenge.id
    );
    const challengesTopic = new NVP(
      'challenges',
      childChallengesCount.toString()
    );
    activity.push(challengesTopic);

    const allChallengesCount = await this.challengeService.getAllChallengesCount(
      ecoverse.id
    );
    const opportunitiesTopic = new NVP(
      'opportunities',
      (allChallengesCount - childChallengesCount - 1).toString()
    );
    activity.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsCount(
      ecoverse.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    activity.push(projectsTopic);

    // Members
    const membersCount = await this.challengeService.getMembersCount(challenge);
    const membersTopic = new NVP('members', membersCount.toString());
    activity.push(membersTopic);

    return activity;
  }
}
